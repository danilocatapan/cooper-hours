import { randomUUID } from "node:crypto";
import type {
  AutomationChange,
  AutomationEntryPreview,
  AutomationPreview,
  AutomationPreviewRequest,
  AutomationSubmissionResult,
  AutomationTaskPreview,
  RedmineConnectionStatus,
  RedmineOption,
  RedmineWriteMode,
} from "../../shared/redmine";
import {
  REDMINE_PROJECT_ID,
  RedmineClient,
  RedmineError,
  type RedmineIssue,
  type RedmineNamedResource,
  type RedmineTimeEntry,
  type RedmineUser,
} from "./client";
import { appendIssueMarker, AutomationSigner, extractMarker } from "./security";
import type { AutomationStore, ManagedResource, PreviewRecord } from "./store";

interface RedmineServiceOptions {
  store: AutomationStore;
  signer: AutomationSigner;
  ownerHash: string;
  keyFingerprint: string;
  writeMode: RedmineWriteMode;
  previewTtlMs?: number;
  writeDelayMs?: number;
  now?: () => number;
}

export class RedmineService {
  private readonly previewTtlMs: number;
  private readonly writeDelayMs: number;
  private readonly now: () => number;

  constructor(private readonly client: RedmineClient, private readonly options: RedmineServiceOptions) {
    this.previewTtlMs = options.previewTtlMs ?? 15 * 60_000;
    this.writeDelayMs = options.writeDelayMs ?? 250;
    this.now = options.now ?? Date.now;
  }

  async getStatus(): Promise<RedmineConnectionStatus> {
    const metadata = await this.getMetadata();
    return {
      configured: true,
      connected: true,
      writeMode: this.options.writeMode,
      message: this.options.writeMode === "disabled"
        ? "Conexão validada em modo somente consulta."
        : "Conexão segura com o Redmine validada.",
      account: toAccount(metadata.user),
      project: toOption(metadata.project),
      trackers: metadata.trackers.map(toOption),
      statuses: metadata.statuses.map(toOption),
      activities: metadata.activities.map(toOption),
      versions: metadata.versions.filter((version) => version.status !== "closed").map(toOption),
    };
  }

  async createPreview(request: AutomationPreviewRequest): Promise<AutomationPreview> {
    await this.options.store.cleanup();
    const metadata = await this.getMetadata();
    const normalizedVersionName = normalizeText(request.taskDefaults.fixedVersionName);
    const version = normalizedVersionName
      ? metadata.versions.find((item) => normalizeText(item.name) === normalizedVersionName && item.status !== "closed")
      : undefined;

    const taskPreviews: AutomationTaskPreview[] = [];
    for (const task of request.tasks) {
      taskPreviews.push(await this.previewTask(task, metadata, Boolean(normalizedVersionName && !version), request, version?.id ?? null));
    }

    const existingEntries = await this.client.listTimeEntries(request.minDate, request.maxDate);
    const entryBindings = await this.reconcileEntryBindings(request.entries, taskPreviews, metadata.user);
    const entryPreviews: AutomationEntryPreview[] = [];
    for (const entry of request.entries) {
      const task = taskPreviews.find((candidate) => candidate.sourceKey === taskSourceKey(entry.sourceKey));
      const binding = entryBindings.get(entry.sourceKey);
      if (binding?.blocker) {
        entryPreviews.push({ ...entry, key: entry.sourceKey, marker: "", timeEntryId: null, changes: [], issueId: task?.issueId ?? null,
          action: "blocked", message: binding.blocker });
      } else {
        entryPreviews.push(await this.previewEntry({ ...entry, sourceKey: binding?.sourceKey ?? entry.sourceKey }, task, metadata.user, existingEntries));
      }
    }

    const modeBlockers = this.options.writeMode === "disabled"
      ? ["A automação está em modo somente consulta. Ative as escritas apenas após a homologação."]
      : this.options.writeMode === "create" && (taskPreviews.some((task) => task.action === "update") || entryPreviews.some((entry) => entry.action === "update"))
        ? ["Existem atualizações, mas o ambiente permite somente criações."]
        : [];
    const blockers = [
      ...modeBlockers,
      ...taskPreviews.filter((task) => task.action === "conflict" || task.action === "blocked").map((task) => task.message),
      ...entryPreviews.filter((entry) => entry.action === "blocked").map((entry) => entry.message),
    ];
    const previewId = randomUUID();
    const preview: AutomationPreview = {
      previewId,
      expiresAt: new Date(this.now() + this.previewTtlMs).toISOString(),
      account: toAccount(metadata.user),
      project: toOption(metadata.project),
      writeMode: this.options.writeMode,
      tasks: taskPreviews,
      entries: entryPreviews,
      blockers: Array.from(new Set(blockers)),
      canSubmit: blockers.length === 0 && (
        taskPreviews.some((task) => task.action === "create" || task.action === "update")
        || entryPreviews.some((entry) => entry.action === "create" || entry.action === "update")
      ),
      summary: {
        tasksToCreate: taskPreviews.filter((task) => task.action === "create").length,
        tasksToUpdate: taskPreviews.filter((task) => task.action === "update").length,
        tasksToReuse: taskPreviews.filter((task) => task.action === "reuse").length,
        taskConflicts: taskPreviews.filter((task) => task.action === "conflict").length,
        entriesToCreate: entryPreviews.filter((entry) => entry.action === "create").length,
        entriesToUpdate: entryPreviews.filter((entry) => entry.action === "update").length,
        duplicateEntries: entryPreviews.filter((entry) => entry.action === "duplicate").length,
        blockedEntries: entryPreviews.filter((entry) => entry.action === "blocked").length,
      },
    };

    await this.options.store.savePreview({
      preview,
      request,
      user: metadata.user,
      versionId: version?.id ?? null,
      ownerHash: this.options.ownerHash,
      keyFingerprint: this.options.keyFingerprint,
      submitting: false,
    });
    return preview;
  }

  async submitPreview(previewId: string): Promise<AutomationSubmissionResult> {
    const record = await this.options.store.getPreview(previewId);
    if (!record) throw new RedmineError("A prévia expirou. Gere uma nova antes de enviar.", 410);
    this.assertPreviewBinding(record);
    if (record.result) return record.result;
    if (this.options.writeMode === "disabled") throw new RedmineError("As escritas Redmine estão desativadas.", 403);
    if (this.options.writeMode === "create" && (record.preview.tasks.some((task) => task.action === "update")
      || record.preview.entries.some((entry) => entry.action === "update"))) {
      throw new RedmineError("Atualizações Redmine estão desativadas.", 403);
    }
    if (!record.preview.canSubmit || record.preview.blockers.length > 0) {
      throw new RedmineError("A prévia possui bloqueios e não pode ser enviada.", 409, record.preview.blockers);
    }
    if (!await this.options.store.beginSubmission(previewId)) throw new RedmineError("Esta prévia já está sendo enviada.", 409);

    const currentUser = await this.client.getCurrentUser();
    if (currentUser.id !== record.user.id) {
      await this.options.store.releaseSubmission(previewId);
      throw new RedmineError("A chave não pertence ao usuário que gerou a prévia.", 403);
    }

    const result: AutomationSubmissionResult = { previewId, completed: false, halted: false, message: "Envio iniciado.", tasks: [], entries: [] };
    const issueIds = new Map<string, number>();
    try {
      for (const task of record.preview.tasks) {
        if (task.action === "reuse" && task.issueId) {
          issueIds.set(task.sourceKey, task.issueId);
          result.tasks.push({ title: task.title, status: "reused", issueId: task.issueId, message: "Tarefa existente reutilizada sem alterações." });
          continue;
        }
        if (task.action === "update" && task.issueId) {
          const managed = await this.requireManagedIssue(task.sourceKey, task.issueId, record.user.id);
          const current = await this.client.getIssue(task.issueId);
          this.assertManagedIssue(current, managed, record.user.id);
          const sourceTask = requireSourceTask(record, task.sourceKey);
          await this.client.updateIssue(task.issueId, issueUpdateBody(record, sourceTask, record.user.id, managed.marker));
          issueIds.set(task.sourceKey, task.issueId);
          await this.saveIssueLedger(record, task.sourceKey, task.issueId, managed.marker, sourceTask);
          await this.audit("update", "issue", task.issueId, "success");
          result.tasks.push({ title: task.title, status: "updated", issueId: task.issueId, message: "Tarefa gerenciada atualizada." });
          await delay(this.writeDelayMs);
          continue;
        }
        if (task.action !== "create") continue;

        const exactMatches = await this.findExactIssues(task.title);
        if (exactMatches.length === 1) {
          issueIds.set(task.sourceKey, exactMatches[0].id);
          result.tasks.push({ title: task.title, status: "reused", issueId: exactMatches[0].id, message: "Tarefa encontrada na revalidação e reutilizada sem alterações." });
          continue;
        }
        if (exactMatches.length > 1) return this.finishWithFailure(record, result, "Mais de uma tarefa correspondente foi encontrada na revalidação.");

        const sourceTask = requireSourceTask(record, task.sourceKey);
        const provisional = `cooper-hours:pending:${randomUUID()}`;
        try {
          const issue = await this.client.createIssue(issueCreateBody(record, sourceTask, record.user.id, provisional));
          const marker = this.options.signer.createMarker("issue", issue.id, REDMINE_PROJECT_ID, record.user.id, task.sourceKey);
          await this.client.updateIssue(issue.id, { description: appendIssueMarker(record.request.taskDefaults.description, marker) });
          issueIds.set(task.sourceKey, issue.id);
          await this.saveIssueLedger(record, task.sourceKey, issue.id, marker, sourceTask);
          await this.audit("create", "issue", issue.id, "success");
          result.tasks.push({ title: task.title, status: "created", issueId: issue.id, message: "Tarefa criada e marcada pelo Cooper Hours." });
        } catch (error) {
          await this.audit("create", "issue", null, "failure");
          result.tasks.push({ title: task.title, status: "failed", issueId: null, message: getSafeErrorMessage(error) });
          return this.finishWithFailure(record, result);
        }
        await delay(this.writeDelayMs);
      }

      for (const entry of record.preview.entries) {
        if (entry.action === "duplicate") {
          result.entries.push({ key: entry.key, title: entry.title, status: "skipped", timeEntryId: entry.timeEntryId, message: "Lançamento idêntico ignorado." });
          continue;
        }
        const taskKey = taskSourceKey(entry.sourceKey);
        const issueId = issueIds.get(taskKey) ?? entry.issueId;
        if (!issueId) return this.finishWithFailure(record, result, "Issue da tarefa não disponível.");

        if (entry.action === "update" && entry.timeEntryId) {
          const managed = await this.requireManagedTimeEntry(entry.sourceKey, entry.timeEntryId, record.user.id);
          const current = await this.client.getTimeEntry(entry.timeEntryId);
          this.assertManagedTimeEntry(current, managed, record.user.id);
          await this.client.updateTimeEntry(entry.timeEntryId, timeEntryWriteBody(entry, managed.marker));
          await this.saveTimeEntryLedger(record, entry, entry.timeEntryId, managed.marker, issueId);
          await this.audit("update", "time-entry", entry.timeEntryId, "success");
          result.entries.push({ key: entry.key, title: entry.title, status: "updated", timeEntryId: entry.timeEntryId, message: "Lançamento gerenciado atualizado." });
          await delay(this.writeDelayMs);
          continue;
        }
        if (entry.action !== "create") continue;

        const currentEntries = await this.client.listTimeEntries(entry.spentOn, entry.spentOn);
        const existingState = classifyExistingEntry(entry, issueId, record.user.id, currentEntries);
        if (existingState === "duplicate") {
          result.entries.push({ key: entry.key, title: entry.title, status: "skipped", timeEntryId: null, message: "Lançamento encontrado na revalidação." });
          continue;
        }
        if (existingState === "conflict") return this.finishWithFailure(record, result, "Existe um lançamento não gerenciado conflitante.");

        try {
          const created = await this.client.createTimeEntry(timeEntryWriteBody(entry, `cooper-hours:pending:${randomUUID()}`, issueId));
          const marker = this.options.signer.createMarker("time-entry", created.id, REDMINE_PROJECT_ID, record.user.id, entry.sourceKey);
          await this.client.updateTimeEntry(created.id, { comments: marker });
          await this.saveTimeEntryLedger(record, entry, created.id, marker, issueId);
          await this.audit("create", "time-entry", created.id, "success");
          result.entries.push({ key: entry.key, title: entry.title, status: "created", timeEntryId: created.id, message: "Horas lançadas e marcadas pelo Cooper Hours." });
        } catch (error) {
          await this.audit("create", "time-entry", null, "failure");
          result.entries.push({ key: entry.key, title: entry.title, status: "failed", timeEntryId: null, message: getSafeErrorMessage(error) });
          return this.finishWithFailure(record, result);
        }
        await delay(this.writeDelayMs);
      }

      result.completed = true;
      result.message = "Automação concluída e verificada no Redmine.";
      await this.options.store.finishSubmission(record.preview.previewId, result);
      return result;
    } catch (error) {
      await this.options.store.releaseSubmission(record.preview.previewId);
      throw error;
    }
  }

  private async getMetadata() {
    const [user, project, versions, trackers, statuses, activities] = await Promise.all([
      this.client.getCurrentUser(), this.client.getProject(), this.client.getVersions(), this.client.getTrackers(),
      this.client.getIssueStatuses(), this.client.getTimeEntryActivities(),
    ]);
    if (project.id !== REDMINE_PROJECT_ID) throw new RedmineError("Projeto Redmine inesperado.", 403);
    return { user, project, versions, trackers, statuses, activities };
  }

  private async previewTask(
    task: AutomationPreviewRequest["tasks"][number],
    metadata: Awaited<ReturnType<RedmineService["getMetadata"]>>,
    versionMissing: boolean,
    request: AutomationPreviewRequest,
    versionId: number | null,
  ): Promise<AutomationTaskPreview> {
    const base = { sourceKey: task.sourceKey, title: task.title, trackerId: task.trackerId, activityId: task.activityId, changes: [] as AutomationChange[] };
    if (!metadata.trackers.some((item) => item.id === task.trackerId)) return blockedTask(base, `Tracker inválido para "${task.title}".`);
    if (!metadata.activities.some((item) => item.id === task.activityId)) return blockedTask(base, `Atividade inválida para "${task.title}".`);
    if (!metadata.statuses.some((item) => item.id === request.taskDefaults.statusId)) return blockedTask(base, `O status ${request.taskDefaults.statusId} não está disponível no Redmine.`);
    if (versionMissing) return blockedTask(base, `A tarefa "${task.title}" depende de uma versão válida.`);

    const managed = await this.options.store.getManagedResource(this.options.ownerHash, "issue", task.sourceKey);
    if (managed) {
      try {
        const issue = await this.client.getIssue(managed.redmineId);
        this.assertManagedIssue(issue, managed, metadata.user.id);
        const marker = managed.marker;
        const desiredDescription = appendIssueMarker(request.taskDefaults.description, marker);
        const changes = compactChanges([
          change("tracker", issue.tracker?.id ?? null, task.trackerId),
          change("status", issue.status?.id ?? null, request.taskDefaults.statusId),
          change("responsável", issue.assigned_to?.id ?? null, metadata.user.id),
          change("início", issue.start_date ?? null, request.taskDefaults.startDate),
          change("prazo", issue.due_date ?? null, request.taskDefaults.dueDate),
          change("versão", issue.fixed_version?.id ?? null, versionId),
          change("descrição", issue.description ?? "", desiredDescription),
        ]);
        return { ...base, action: changes.length ? "update" : "reuse", issueId: issue.id, candidates: [{ id: issue.id, subject: issue.subject }], changes, message: changes.length ? "Tarefa gerenciada será atualizada." : "Tarefa gerenciada já está sincronizada." };
      } catch (_error) {
        return blockedTask(base, "O vínculo da tarefa não pôde ser validado com segurança.");
      }
    }

    if (task.manualIssueId) {
      const issue = await this.client.getIssue(task.manualIssueId);
      if (issue.project.id !== REDMINE_PROJECT_ID) return blockedTask(base, `A issue ${task.manualIssueId} não pertence ao projeto ${REDMINE_PROJECT_ID}.`);
      return { ...base, action: "reuse", issueId: issue.id, candidates: [{ id: issue.id, subject: issue.subject }], message: "Issue informada será reutilizada sem alterações." };
    }
    const matches = await this.findExactIssues(task.title);
    const candidates = matches.map((issue) => ({ id: issue.id, subject: issue.subject }));
    if (matches.length > 1) return { ...base, action: "conflict", issueId: null, candidates, message: `Mais de uma tarefa corresponde a "${task.title}". Informe o issue_id correto.` };
    if (matches.length === 1) return { ...base, action: "reuse", issueId: matches[0].id, candidates, message: "Tarefa existente será reutilizada sem alterações." };
    return { ...base, action: "create", issueId: null, candidates: [], message: "Nova tarefa será criada." };
  }

  private async previewEntry(
    entry: AutomationPreviewRequest["entries"][number], task: AutomationTaskPreview | undefined,
    user: RedmineUser, existingEntries: RedmineTimeEntry[],
  ): Promise<AutomationEntryPreview> {
    const base = { ...entry, key: entry.sourceKey, marker: "", timeEntryId: null, changes: [] as AutomationChange[] };
    if (!task || task.action === "blocked" || task.action === "conflict") return { ...base, issueId: null, action: "blocked", message: `O lançamento de "${entry.title}" depende da resolução da tarefa.` };

    const managed = await this.options.store.getManagedResource(this.options.ownerHash, "time-entry", entry.sourceKey);
    if (managed) {
      try {
        const current = await this.client.getTimeEntry(managed.redmineId);
        this.assertManagedTimeEntry(current, managed, user.id);
        const expectedIssueId = task.issueId ?? Number(managed.snapshot.issueId);
        if (current.issue?.id !== expectedIssueId) return { ...base, issueId: expectedIssueId, action: "blocked", message: "A issue de um lançamento gerenciado não pode ser alterada." };
        const changes = compactChanges([
          change("data", current.spent_on, entry.spentOn), change("horas", current.hours, entry.hours),
          change("atividade", current.activity.id, entry.activityId), change("comentário", current.comments ?? "", managed.marker),
        ]);
        return { ...base, marker: managed.marker, issueId: expectedIssueId, timeEntryId: current.id, changes, action: changes.length ? "update" : "duplicate", message: changes.length ? "Lançamento gerenciado será atualizado." : "Lançamento gerenciado já está sincronizado." };
      } catch (_error) {
        return { ...base, issueId: task.issueId, action: "blocked", message: "O vínculo do lançamento não pôde ser validado com segurança." };
      }
    }

    const preview: AutomationEntryPreview = { ...base, marker: `cooper-hours:pending:${randomUUID()}`, issueId: task.issueId, action: "create", message: "Novo lançamento será criado." };
    if (task.issueId) {
      const state = classifyExistingEntry(preview, task.issueId, user.id, existingEntries);
      if (state === "duplicate") return { ...preview, action: "duplicate", message: "Lançamento idêntico já existe e será ignorado." };
      if (state === "conflict") return { ...preview, action: "blocked", message: "Existe um lançamento não gerenciado com horas diferentes no mesmo escopo." };
    }
    return preview;
  }

  private async reconcileEntryBindings(
    entries: AutomationPreviewRequest["entries"],
    tasks: AutomationTaskPreview[],
    user: RedmineUser,
  ): Promise<Map<string, { sourceKey: string; blocker?: string }>> {
    const bindings = new Map<string, { sourceKey: string; blocker?: string }>();
    const allManaged = await this.options.store.listManagedResources(this.options.ownerHash, "time-entry");

    for (const task of tasks) {
      const incoming = entries.filter((entry) => taskSourceKey(entry.sourceKey) === task.sourceKey);
      if (!incoming.length || task.action === "blocked" || task.action === "conflict") continue;
      const prefix = `${task.sourceKey}::entry::`;
      const managedForTask = allManaged.filter((resource) => resource.sourceKey.startsWith(prefix));
      const currentManaged: Array<{ managed: ManagedResource; current: RedmineTimeEntry }> = [];
      let invalidManagedResource = false;

      for (const managed of managedForTask) {
        try {
          const current = await this.client.getTimeEntry(managed.redmineId);
          this.assertManagedTimeEntry(current, managed, user.id);
          if (!task.issueId || current.issue?.id !== task.issueId) invalidManagedResource = true;
          else currentManaged.push({ managed, current });
        } catch (_error) {
          invalidManagedResource = true;
        }
      }

      if (invalidManagedResource) {
        for (const entry of incoming) bindings.set(entry.sourceKey, { sourceKey: entry.sourceKey, blocker: "Os lançamentos gerenciados desta tarefa não puderam ser reconciliados com segurança." });
        continue;
      }

      const unmatchedEntries = [...incoming];
      const unmatchedManaged = [...currentManaged];
      let ambiguous = false;
      for (const entry of incoming) {
        const exact = unmatchedManaged.filter(({ current }) => sameManagedEntry(current, entry, task.issueId!));
        if (exact.length > 1) { ambiguous = true; break; }
        if (exact.length === 1) {
          bindings.set(entry.sourceKey, { sourceKey: exact[0].managed.sourceKey });
          unmatchedEntries.splice(unmatchedEntries.indexOf(entry), 1);
          unmatchedManaged.splice(unmatchedManaged.indexOf(exact[0]), 1);
        }
      }

      if (ambiguous || (unmatchedEntries.length > 0 && unmatchedManaged.length > 0
        && (unmatchedEntries.length !== 1 || unmatchedManaged.length !== 1))) {
        for (const entry of unmatchedEntries) bindings.set(entry.sourceKey, { sourceKey: entry.sourceKey, blocker: "Mais de um lançamento antigo/novo pode corresponder; o lote foi bloqueado." });
        continue;
      }

      if (unmatchedEntries.length === 1 && unmatchedManaged.length === 1) {
        bindings.set(unmatchedEntries[0].sourceKey, { sourceKey: unmatchedManaged[0].managed.sourceKey });
        continue;
      }

      if (unmatchedManaged.length === 0) {
        const usedSourceKeys = new Set([...managedForTask.map((resource) => resource.sourceKey), ...Array.from(bindings.values()).map((binding) => binding.sourceKey)]);
        let nextOrdinal = 1;
        for (const entry of unmatchedEntries) {
          while (usedSourceKeys.has(`${prefix}${nextOrdinal}`)) nextOrdinal += 1;
          const sourceKey = `${prefix}${nextOrdinal}`;
          usedSourceKeys.add(sourceKey);
          bindings.set(entry.sourceKey, { sourceKey });
          nextOrdinal += 1;
        }
      }
    }
    return bindings;
  }

  private assertPreviewBinding(record: PreviewRecord): void {
    if (record.ownerHash !== this.options.ownerHash || record.keyFingerprint !== this.options.keyFingerprint) {
      throw new RedmineError("A prévia não pertence a esta identidade ou chave.", 403);
    }
  }

  private assertManagedIssue(issue: RedmineIssue, managed: ManagedResource, redmineUserId: number): void {
    const marker = extractMarker(issue.description);
    if (managed.projectId !== REDMINE_PROJECT_ID || issue.project.id !== REDMINE_PROJECT_ID || managed.redmineUserId !== redmineUserId
      || issue.id !== managed.redmineId || !marker || marker !== managed.marker
      || !this.options.signer.verifyMarker(marker, "issue", issue.id, REDMINE_PROJECT_ID, redmineUserId, managed.sourceKey)) {
      throw new RedmineError("Tarefa fora do escopo gerenciado.", 403);
    }
  }

  private assertManagedTimeEntry(entry: RedmineTimeEntry, managed: ManagedResource, redmineUserId: number): void {
    const marker = extractMarker(entry.comments);
    if (managed.projectId !== REDMINE_PROJECT_ID || entry.project.id !== REDMINE_PROJECT_ID || entry.user.id !== redmineUserId
      || managed.redmineUserId !== redmineUserId || entry.id !== managed.redmineId || !marker || marker !== managed.marker
      || !this.options.signer.verifyMarker(marker, "time-entry", entry.id, REDMINE_PROJECT_ID, redmineUserId, managed.sourceKey)) {
      throw new RedmineError("Lançamento fora do escopo gerenciado.", 403);
    }
  }

  private async requireManagedIssue(sourceKey: string, issueId: number, userId: number) {
    const managed = await this.options.store.getManagedResource(this.options.ownerHash, "issue", sourceKey);
    if (!managed || managed.redmineId !== issueId || managed.redmineUserId !== userId) throw new RedmineError("Tarefa não gerenciada.", 403);
    return managed;
  }
  private async requireManagedTimeEntry(sourceKey: string, entryId: number, userId: number) {
    const managed = await this.options.store.getManagedResource(this.options.ownerHash, "time-entry", sourceKey);
    if (!managed || managed.redmineId !== entryId || managed.redmineUserId !== userId) throw new RedmineError("Lançamento não gerenciado.", 403);
    return managed;
  }

  private async saveIssueLedger(record: PreviewRecord, sourceKey: string, issueId: number, marker: string, task: AutomationPreviewRequest["tasks"][number]) {
    await this.options.store.saveManagedResource({ ownerHash: record.ownerHash, redmineUserId: record.user.id, resourceType: "issue", sourceKey, redmineId: issueId, projectId: REDMINE_PROJECT_ID, marker, snapshot: { title: task.title, trackerId: task.trackerId } });
  }
  private async saveTimeEntryLedger(record: PreviewRecord, entry: AutomationEntryPreview, entryId: number, marker: string, issueId: number) {
    await this.options.store.saveManagedResource({ ownerHash: record.ownerHash, redmineUserId: record.user.id, resourceType: "time-entry", sourceKey: entry.sourceKey, redmineId: entryId, projectId: REDMINE_PROJECT_ID, marker, snapshot: { issueId, spentOn: entry.spentOn, hours: entry.hours, activityId: entry.activityId } });
  }
  private audit(operation: "create" | "update" | "reuse" | "blocked", type: "issue" | "time-entry", id: number | null, outcome: "success" | "failure") {
    return this.options.store.writeAudit({ ownerHash: this.options.ownerHash, operation, resourceType: type, redmineId: id, outcome });
  }
  private async findExactIssues(title: string): Promise<RedmineIssue[]> {
    const issues = await this.client.findIssuesBySubject(title);
    const normalized = normalizeText(title);
    return issues.filter((issue) => normalizeText(issue.subject) === normalized && issue.project.id === REDMINE_PROJECT_ID);
  }
  private async finishWithFailure(record: PreviewRecord, result: AutomationSubmissionResult, message?: string) {
    result.halted = true;
    result.message = message ?? "O envio foi interrompido. Gere uma nova prévia para continuar sem duplicar dados.";
    await this.options.store.finishSubmission(record.preview.previewId, result);
    return result;
  }
}

function issueCreateBody(record: PreviewRecord, task: AutomationPreviewRequest["tasks"][number], userId: number, marker: string) {
  return {
    project_id: REDMINE_PROJECT_ID,
    subject: task.title,
    ...issueUpdateBody(record, task, userId, marker),
  };
}

function issueUpdateBody(record: PreviewRecord, task: AutomationPreviewRequest["tasks"][number], userId: number, marker: string) {
  return {
    tracker_id: task.trackerId,
    status_id: record.request.taskDefaults.statusId, assigned_to_id: userId,
    start_date: record.request.taskDefaults.startDate, due_date: record.request.taskDefaults.dueDate,
    description: appendIssueMarker(record.request.taskDefaults.description, marker),
    ...(record.versionId ? { fixed_version_id: record.versionId } : {}),
  };
}

function timeEntryWriteBody(entry: AutomationEntryPreview, marker: string, issueId?: number) {
  return { ...(issueId ? { issue_id: issueId } : {}), hours: entry.hours, spent_on: entry.spentOn, activity_id: entry.activityId, comments: marker };
}

function requireSourceTask(record: PreviewRecord, sourceKey: string) {
  const task = record.request.tasks.find((candidate) => candidate.sourceKey === sourceKey);
  if (!task) throw new RedmineError("Configuração da tarefa não encontrada.", 409);
  return task;
}

function taskSourceKey(entrySourceKey: string): string {
  const separator = entrySourceKey.lastIndexOf("::entry::");
  return separator < 0 ? entrySourceKey : entrySourceKey.slice(0, separator);
}
function toOption(resource: RedmineNamedResource | { id: number; name: string }): RedmineOption { return { id: resource.id, name: resource.name }; }
function toAccount(user: RedmineUser) { const name = [user.firstname, user.lastname].filter(Boolean).join(" ").trim() || user.login; return { id: user.id, login: user.login, name }; }
function normalizeText(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " "); }
function blockedTask(base: Pick<AutomationTaskPreview, "sourceKey" | "title" | "trackerId" | "activityId" | "changes">, message: string): AutomationTaskPreview { return { ...base, action: "blocked", issueId: null, candidates: [], message }; }
function change(field: string, before: string | number | null, after: string | number | null): AutomationChange | null { return String(before ?? "") === String(after ?? "") ? null : { field, before, after }; }
function compactChanges(changes: Array<AutomationChange | null>): AutomationChange[] { return changes.filter((item): item is AutomationChange => Boolean(item)); }

function classifyExistingEntry(entry: AutomationEntryPreview, issueId: number, userId: number, existing: RedmineTimeEntry[]): "duplicate" | "conflict" | null {
  const sameScope = existing.filter((candidate) => candidate.project.id === REDMINE_PROJECT_ID && candidate.user.id === userId
    && candidate.issue?.id === issueId && candidate.spent_on === entry.spentOn && candidate.activity.id === entry.activityId);
  if (sameScope.some((candidate) => Math.abs(candidate.hours - entry.hours) < 0.001)) return "duplicate";
  return sameScope.length > 0 ? "conflict" : null;
}

function sameManagedEntry(current: RedmineTimeEntry, incoming: AutomationPreviewRequest["entries"][number], issueId: number): boolean {
  return current.issue?.id === issueId && current.spent_on === incoming.spentOn
    && Number(current.hours) === Number(incoming.hours) && current.activity.id === incoming.activityId;
}
function getSafeErrorMessage(error: unknown): string { return error instanceof RedmineError ? `${error.message}${error.details.length ? ` ${error.details.join(" ")}` : ""}` : "O Redmine não concluiu esta operação."; }
function delay(ms: number): Promise<void> { return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve(); }
