import { createHash, randomUUID } from "node:crypto";
import type {
  AutomationEntryPreview,
  AutomationPreview,
  AutomationPreviewRequest,
  AutomationSubmissionResult,
  AutomationTaskPreview,
  RedmineConnectionStatus,
  RedmineOption,
} from "../../shared/redmine";
import {
  RedmineClient,
  RedmineError,
  type RedmineIssue,
  type RedmineNamedResource,
  type RedmineTimeEntry,
  type RedmineUser,
} from "./client";

interface PreviewRecord {
  preview: AutomationPreview;
  request: AutomationPreviewRequest;
  user: RedmineUser;
  versionId: number | null;
  submitting: boolean;
  result?: AutomationSubmissionResult;
}

interface RedmineServiceOptions {
  projectId: number;
  previewTtlMs?: number;
  writeDelayMs?: number;
  now?: () => number;
}

export class RedmineService {
  private readonly previews = new Map<string, PreviewRecord>();
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
      message: "Conexão segura com o Redmine validada.",
      account: toAccount(metadata.user),
      project: toOption(metadata.project),
      trackers: metadata.trackers.map(toOption),
      statuses: metadata.statuses.map(toOption),
      activities: metadata.activities.map(toOption),
      versions: metadata.versions.filter((version) => version.status !== "closed").map(toOption),
    };
  }

  async createPreview(request: AutomationPreviewRequest): Promise<AutomationPreview> {
    this.removeExpiredPreviews();
    const metadata = await this.getMetadata();
    const normalizedVersionName = normalizeText(request.taskDefaults.fixedVersionName);
    const version = normalizedVersionName
      ? metadata.versions.find((item) => normalizeText(item.name) === normalizedVersionName && item.status !== "closed")
      : undefined;

    const taskPreviews: AutomationTaskPreview[] = [];
    for (const task of request.tasks) {
      taskPreviews.push(await this.previewTask(
        task,
        metadata,
        Boolean(normalizedVersionName && !version),
        request.taskDefaults.statusId,
      ));
    }

    const existingEntries = await this.client.listTimeEntries(this.options.projectId, request.minDate, request.maxDate);
    const entryPreviews = request.entries.map((entry, index) => {
      const task = taskPreviews.find((candidate) => candidate.title === entry.title);
      return this.previewEntry(entry, index, task, metadata.user, existingEntries);
    });

    const blockers = [
      ...taskPreviews.filter((task) => task.action === "conflict" || task.action === "blocked").map((task) => task.message),
      ...entryPreviews.filter((entry) => entry.action === "blocked").map((entry) => entry.message),
    ];
    const previewId = randomUUID();
    const expiresAt = new Date(this.now() + this.previewTtlMs).toISOString();
    const preview: AutomationPreview = {
      previewId,
      expiresAt,
      account: toAccount(metadata.user),
      project: toOption(metadata.project),
      tasks: taskPreviews,
      entries: entryPreviews,
      blockers: Array.from(new Set(blockers)),
      canSubmit: blockers.length === 0 && (
        taskPreviews.some((task) => task.action === "create")
        || entryPreviews.some((entry) => entry.action === "create")
      ),
      summary: {
        tasksToCreate: taskPreviews.filter((task) => task.action === "create").length,
        tasksToReuse: taskPreviews.filter((task) => task.action === "reuse").length,
        taskConflicts: taskPreviews.filter((task) => task.action === "conflict").length,
        entriesToCreate: entryPreviews.filter((entry) => entry.action === "create").length,
        duplicateEntries: entryPreviews.filter((entry) => entry.action === "duplicate").length,
        blockedEntries: entryPreviews.filter((entry) => entry.action === "blocked").length,
      },
    };

    this.previews.set(previewId, {
      preview,
      request,
      user: metadata.user,
      versionId: version?.id ?? null,
      submitting: false,
    });
    return preview;
  }

  async submitPreview(previewId: string): Promise<AutomationSubmissionResult> {
    this.removeExpiredPreviews();
    const record = this.previews.get(previewId);
    if (!record) throw new RedmineError("A prévia expirou. Gere uma nova antes de enviar.", 410);
    if (record.result) return record.result;
    if (record.submitting) throw new RedmineError("Esta prévia já está sendo enviada.", 409);
    if (!record.preview.canSubmit || record.preview.blockers.length > 0) {
      throw new RedmineError("A prévia possui bloqueios e não pode ser enviada.", 409, record.preview.blockers);
    }

    record.submitting = true;
    const result: AutomationSubmissionResult = {
      previewId,
      completed: false,
      halted: false,
      message: "Envio iniciado.",
      tasks: [],
      entries: [],
    };
    const issueIds = new Map<string, number>();

    try {
      for (const task of record.preview.tasks) {
        if (task.action === "reuse" && task.issueId) {
          issueIds.set(task.title, task.issueId);
          result.tasks.push({ title: task.title, status: "reused", issueId: task.issueId, message: "Tarefa existente reutilizada." });
          continue;
        }

        const exactMatches = await this.findExactIssues(task.title);
        if (exactMatches.length === 1) {
          issueIds.set(task.title, exactMatches[0].id);
          result.tasks.push({ title: task.title, status: "reused", issueId: exactMatches[0].id, message: "Tarefa encontrada na revalidação." });
          continue;
        }
        if (exactMatches.length > 1) {
          result.tasks.push({ title: task.title, status: "failed", issueId: null, message: "Mais de uma tarefa correspondente foi encontrada na revalidação." });
          return this.finishWithFailure(record, result);
        }

        const sourceTask = record.request.tasks.find((candidate) => candidate.title === task.title);
        if (!sourceTask) {
          result.tasks.push({ title: task.title, status: "failed", issueId: null, message: "Configuração da tarefa não encontrada." });
          return this.finishWithFailure(record, result);
        }

        try {
          const issue = await this.client.createIssue({
            project_id: this.options.projectId,
            subject: task.title,
            tracker_id: sourceTask.trackerId,
            status_id: record.request.taskDefaults.statusId,
            assigned_to_id: record.user.id,
            start_date: record.request.taskDefaults.startDate,
            due_date: record.request.taskDefaults.dueDate,
            description: record.request.taskDefaults.description,
            ...(record.versionId ? { fixed_version_id: record.versionId } : {}),
          });
          issueIds.set(task.title, issue.id);
          result.tasks.push({ title: task.title, status: "created", issueId: issue.id, message: "Tarefa criada no Redmine." });
        } catch (error) {
          const recovered = await this.recoverIssueAfterFailure(task.title, error);
          if (recovered) {
            issueIds.set(task.title, recovered.id);
            result.tasks.push({ title: task.title, status: "reused", issueId: recovered.id, message: "Tarefa confirmada após resposta ambígua." });
          } else {
            result.tasks.push({ title: task.title, status: "failed", issueId: null, message: getSafeErrorMessage(error) });
            return this.finishWithFailure(record, result);
          }
        }
        await delay(this.writeDelayMs);
      }

      for (const entry of record.preview.entries) {
        if (entry.action === "duplicate") {
          result.entries.push({ key: entry.key, title: entry.title, status: "skipped", timeEntryId: null, message: "Lançamento duplicado ignorado." });
          continue;
        }
        if (entry.action !== "create") continue;

        const issueId = issueIds.get(entry.title) ?? entry.issueId;
        if (!issueId) {
          result.entries.push({ key: entry.key, title: entry.title, status: "failed", timeEntryId: null, message: "Issue da tarefa não disponível." });
          return this.finishWithFailure(record, result);
        }

        const currentEntries = await this.client.listTimeEntries(this.options.projectId, entry.spentOn, entry.spentOn);
        const existingState = classifyExistingEntry(entry, issueId, record.user.id, this.options.projectId, currentEntries);
        if (existingState === "duplicate") {
          result.entries.push({ key: entry.key, title: entry.title, status: "skipped", timeEntryId: null, message: "Lançamento encontrado na revalidação." });
          continue;
        }
        if (existingState === "conflict") {
          result.entries.push({ key: entry.key, title: entry.title, status: "failed", timeEntryId: null, message: "Já existe um lançamento com horas diferentes para a mesma tarefa, data e atividade." });
          return this.finishWithFailure(record, result);
        }

        try {
          const created = await this.client.createTimeEntry({
            issue_id: issueId,
            hours: entry.hours,
            spent_on: entry.spentOn,
            activity_id: entry.activityId,
            comments: entry.marker,
          });
          result.entries.push({ key: entry.key, title: entry.title, status: "created", timeEntryId: created.id, message: "Horas lançadas no Redmine." });
        } catch (error) {
          const recoveredEntries = await this.client.listTimeEntries(this.options.projectId, entry.spentOn, entry.spentOn);
          if (classifyExistingEntry(entry, issueId, record.user.id, this.options.projectId, recoveredEntries) === "duplicate") {
            result.entries.push({ key: entry.key, title: entry.title, status: "created", timeEntryId: null, message: "Lançamento confirmado após resposta ambígua." });
          } else {
            result.entries.push({ key: entry.key, title: entry.title, status: "failed", timeEntryId: null, message: getSafeErrorMessage(error) });
            return this.finishWithFailure(record, result);
          }
        }
        await delay(this.writeDelayMs);
      }

      result.completed = true;
      result.message = "Automação concluída e verificada no Redmine.";
      record.result = result;
      return result;
    } finally {
      record.submitting = false;
    }
  }

  private async getMetadata() {
    const [user, project, versions, trackers, statuses, activities] = await Promise.all([
      this.client.getCurrentUser(),
      this.client.getProject(this.options.projectId),
      this.client.getVersions(this.options.projectId),
      this.client.getTrackers(),
      this.client.getIssueStatuses(),
      this.client.getTimeEntryActivities(),
    ]);
    return { user, project, versions, trackers, statuses, activities };
  }

  private async previewTask(
    task: AutomationPreviewRequest["tasks"][number],
    metadata: Awaited<ReturnType<RedmineService["getMetadata"]>>,
    versionMissing: boolean,
    statusId: number,
  ): Promise<AutomationTaskPreview> {
    const base = { title: task.title, trackerId: task.trackerId, activityId: task.activityId };
    if (!metadata.trackers.some((item) => item.id === task.trackerId)) {
      return { ...base, action: "blocked", issueId: null, candidates: [], message: `Tracker inválido para "${task.title}".` };
    }
    if (!metadata.activities.some((item) => item.id === task.activityId)) {
      return { ...base, action: "blocked", issueId: null, candidates: [], message: `Atividade inválida para "${task.title}".` };
    }
    if (!metadata.statuses.some((item) => item.id === statusId)) {
      return { ...base, action: "blocked", issueId: null, candidates: [], message: `O status ${statusId} não está disponível no Redmine.` };
    }

    if (task.manualIssueId) {
      const issue = await this.client.getIssue(task.manualIssueId);
      if (issue.project.id !== this.options.projectId) {
        return { ...base, action: "blocked", issueId: null, candidates: [], message: `A issue ${task.manualIssueId} não pertence ao projeto ${this.options.projectId}.` };
      }
      return { ...base, action: "reuse", issueId: issue.id, candidates: [{ id: issue.id, subject: issue.subject }], message: "Issue informada manualmente será reutilizada." };
    }

    const matches = await this.findExactIssues(task.title);
    const candidates = matches.map((issue) => ({ id: issue.id, subject: issue.subject }));
    if (matches.length > 1) {
      return { ...base, action: "conflict", issueId: null, candidates, message: `Mais de uma tarefa corresponde a "${task.title}". Informe o issue_id correto.` };
    }
    if (matches.length === 1) {
      return { ...base, action: "reuse", issueId: matches[0].id, candidates, message: "Tarefa existente será reutilizada." };
    }
    if (versionMissing) {
      return { ...base, action: "blocked", issueId: null, candidates: [], message: `A tarefa "${task.title}" depende de uma versão válida.` };
    }
    return { ...base, action: "create", issueId: null, candidates: [], message: "Nova tarefa será criada." };
  }

  private previewEntry(
    entry: AutomationPreviewRequest["entries"][number],
    index: number,
    task: AutomationTaskPreview | undefined,
    user: RedmineUser,
    existingEntries: RedmineTimeEntry[],
  ): AutomationEntryPreview {
    const marker = createEntryMarker(user.id, this.options.projectId, entry);
    const key = `${marker}-${index}`;
    if (!task || task.action === "blocked" || task.action === "conflict") {
      return { ...entry, key, marker, issueId: null, action: "blocked", message: `O lançamento de "${entry.title}" depende da resolução da tarefa.` };
    }

    const preview: AutomationEntryPreview = {
      ...entry,
      key,
      marker,
      issueId: task.issueId,
      action: "create",
      message: "Novo lançamento será criado.",
    };
    if (task.issueId) {
      const existingState = classifyExistingEntry(preview, task.issueId, user.id, this.options.projectId, existingEntries);
      if (existingState === "duplicate") {
        return { ...preview, action: "duplicate", message: "Lançamento idêntico já existe e será ignorado." };
      }
      if (existingState === "conflict") {
        return { ...preview, action: "blocked", message: "Já existe um lançamento com horas diferentes para a mesma tarefa, data e atividade." };
      }
    }
    return preview;
  }

  private async findExactIssues(title: string): Promise<RedmineIssue[]> {
    const issues = await this.client.findIssuesBySubject(this.options.projectId, title);
    const normalized = normalizeText(title);
    return issues.filter((issue) => normalizeText(issue.subject) === normalized && issue.project.id === this.options.projectId);
  }

  private async recoverIssueAfterFailure(title: string, error: unknown): Promise<RedmineIssue | null> {
    if (!(error instanceof RedmineError) || (error.kind !== "network" && error.status < 500)) return null;
    const matches = await this.findExactIssues(title);
    return matches.length === 1 ? matches[0] : null;
  }

  private finishWithFailure(record: PreviewRecord, result: AutomationSubmissionResult) {
    result.halted = true;
    result.message = "O envio foi interrompido. Gere uma nova prévia para continuar sem duplicar dados.";
    record.result = result;
    return result;
  }

  private removeExpiredPreviews() {
    const now = this.now();
    for (const [id, record] of Array.from(this.previews.entries())) {
      if (Date.parse(record.preview.expiresAt) <= now) this.previews.delete(id);
    }
  }
}

function toOption(resource: RedmineNamedResource | { id: number; name: string }): RedmineOption {
  return { id: resource.id, name: resource.name };
}

function toAccount(user: RedmineUser) {
  const name = [user.firstname, user.lastname].filter(Boolean).join(" ").trim() || user.login;
  return { id: user.id, login: user.login, name };
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function createEntryMarker(
  userId: number,
  projectId: number,
  entry: AutomationPreviewRequest["entries"][number],
): string {
  const canonical = [userId, projectId, normalizeText(entry.title), entry.spentOn, entry.hours.toFixed(4), entry.activityId].join("|");
  return `cooper-hours:${createHash("sha256").update(canonical).digest("hex").slice(0, 16)}`;
}

function classifyExistingEntry(
  entry: AutomationEntryPreview,
  issueId: number,
  userId: number,
  projectId: number,
  existing: RedmineTimeEntry[],
): "duplicate" | "conflict" | null {
  const sameScope = existing.filter((candidate) => candidate.project.id === projectId
    && candidate.user.id === userId
    && candidate.issue?.id === issueId
    && candidate.spent_on === entry.spentOn
    && candidate.activity.id === entry.activityId);
  if (sameScope.some((candidate) => Math.abs(candidate.hours - entry.hours) < 0.001)) return "duplicate";
  return sameScope.length > 0 ? "conflict" : null;
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof RedmineError) {
    return error.details.length > 0 ? `${error.message} ${error.details.join(" ")}` : error.message;
  }
  return "O Redmine não concluiu esta operação.";
}

function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
