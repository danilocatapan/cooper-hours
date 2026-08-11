import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AutomationPreviewRequest } from "../../shared/redmine";
import { RedmineClient } from "./client";
import { AutomationSigner } from "./security";
import { RedmineService } from "./service";
import { MemoryAutomationStore } from "./store";

const request: AutomationPreviewRequest = {
  importedMonth: "2026-08", minDate: "2026-08-10", maxDate: "2026-08-11",
  tasks: [
    { sourceKey: "tarefa existente", title: "Tarefa Existente", trackerId: 5, activityId: 9, manualIssueId: null },
    { sourceKey: "tarefa nova", title: "Tarefa Nova", trackerId: 5, activityId: 9, manualIssueId: null },
  ],
  taskDefaults: { startDate: "2026-08-10", dueDate: "2026-08-11", statusId: 3, fixedVersionName: "SPRINT 103", description: "Criada pelo Cooper Hours" },
  entries: [
    { sourceKey: "tarefa existente::entry::1", title: "Tarefa Existente", hours: 4, spentOn: "2026-08-10", activityId: 9 },
    { sourceKey: "tarefa nova::entry::1", title: "Tarefa Nova", hours: 4, spentOn: "2026-08-10", activityId: 9 },
  ],
};

describe("RedmineService", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let issues: Array<Record<string, any>>;
  let timeEntries: Array<Record<string, any>>;
  let store: MemoryAutomationStore;
  let signer: AutomationSigner;

  beforeEach(() => {
    store = new MemoryAutomationStore();
    signer = new AutomationSigner("test-signing-key-with-more-than-32-characters");
    issues = [{
      id: 10, subject: "Tarefa Existente", description: "", project: { id: 333, name: "Maestro Cloud" },
      tracker: { id: 5, name: "Desenvolvimento" }, status: { id: 3, name: "Nova" },
      assigned_to: { id: 388, name: "Danilo" }, start_date: "2026-08-10", due_date: "2026-08-11", fixed_version: { id: 103, name: "SPRINT 103" },
    }];
    timeEntries = [{
      id: 501, project: { id: 333, name: "Maestro Cloud" }, issue: { id: 10 }, user: { id: 388, name: "Danilo" },
      activity: { id: 9, name: "Desenvolvimento" }, hours: 4, spent_on: "2026-08-10", comments: "",
    }];
    fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => mockRedmine(new URL(String(input)), init));
  });

  it("prepara prévia com reutilização, criação e duplicidade", async () => {
    const preview = await createService().createPreview(request);
    expect(preview.summary).toMatchObject({ tasksToCreate: 1, tasksToUpdate: 0, tasksToReuse: 1, entriesToCreate: 1, entriesToUpdate: 0, duplicateEntries: 1 });
    expect(preview.canSubmit).toBe(true);
  });

  it("cria, assina e torna a mesma prévia idempotente", async () => {
    const service = createService();
    const preview = await service.createPreview(request);
    const result = await service.submitPreview(preview.previewId);
    const repeated = await service.submitPreview(preview.previewId);
    expect(result.completed).toBe(true);
    expect(result.tasks.map((item) => item.status)).toEqual(["reused", "created"]);
    expect(result.entries.map((item) => item.status)).toEqual(["skipped", "created"]);
    expect(repeated).toEqual(result);
    expect(String(issues[1].description)).toMatch(/cooper-hours:v1:issue:20:[a-f0-9]{32}/);
    expect(String(timeEntries[1].comments)).toMatch(/cooper-hours:v1:time-entry:777:[a-f0-9]{32}/);
  });

  it("atualiza somente recursos presentes no ledger e com marcador válido", async () => {
    const service = createService();
    const first = structuredClone(request);
    first.tasks = [first.tasks[1]];
    first.entries = [first.entries[1]];
    const createdPreview = await service.createPreview(first);
    await service.submitPreview(createdPreview.previewId);

    const changed = structuredClone(first);
    changed.taskDefaults.description = "Descrição atualizada";
    changed.entries[0].hours = 6;
    const updatePreview = await service.createPreview(changed);
    expect(updatePreview.tasks[0].action).toBe("update");
    expect(updatePreview.entries[0].action).toBe("update");
    const result = await service.submitPreview(updatePreview.previewId);
    expect(result.tasks[0].status).toBe("updated");
    expect(result.entries[0].status).toBe("updated");
    expect(timeEntries[1].hours).toBe(6);
  });

  it("preserva correspondências exatas antes de criar uma nova hora no mesmo título", async () => {
    const service = createService();
    const first = structuredClone(request);
    first.tasks = [first.tasks[1]];
    first.entries = [first.entries[1]];
    await service.submitPreview((await service.createPreview(first)).previewId);

    const inserted = structuredClone(first);
    inserted.entries = [
      { ...first.entries[0], sourceKey: "tarefa nova::entry::1", spentOn: "2026-08-11" },
      { ...first.entries[0], sourceKey: "tarefa nova::entry::2" },
    ];
    const preview = await service.createPreview(inserted);
    expect(preview.entries.map((entry) => entry.action)).toEqual(["create", "duplicate"]);

    await service.submitPreview(preview.previewId);
    const managedEntries = timeEntries.filter((entry) => entry.issue?.id === 20);
    expect(managedEntries.map((entry) => entry.spent_on).sort()).toEqual(["2026-08-10", "2026-08-11"]);
  });

  it("bloqueia quando sobram múltiplos pares antigos e novos", async () => {
    const service = createService();
    const initial = structuredClone(request);
    initial.tasks = [initial.tasks[1]];
    initial.entries = [
      initial.entries[1],
      { ...initial.entries[1], sourceKey: "tarefa nova::entry::2", spentOn: "2026-08-11" },
    ];
    await service.submitPreview((await service.createPreview(initial)).previewId);

    const ambiguous = structuredClone(initial);
    ambiguous.entries = ambiguous.entries.map((entry, index) => ({ ...entry, hours: 5 + index }));
    const preview = await service.createPreview(ambiguous);
    expect(preview.entries.every((entry) => entry.action === "blocked")).toBe(true);
    expect(preview.canSubmit).toBe(false);
  });

  it("bloqueia atualização quando o marcador foi adulterado", async () => {
    const service = createService();
    const onlyNew = structuredClone(request);
    onlyNew.tasks = [onlyNew.tasks[1]];
    onlyNew.entries = [onlyNew.entries[1]];
    await service.submitPreview((await service.createPreview(onlyNew)).previewId);
    issues[1].description = "Marcador removido";
    const preview = await service.createPreview(onlyNew);
    expect(preview.tasks[0].action).toBe("blocked");
    expect(preview.canSubmit).toBe(false);
  });

  it("bloqueia títulos ambíguos", async () => {
    issues.push({ ...issues[0], id: 11 });
    const preview = await createService().createPreview(request);
    expect(preview.tasks[0].action).toBe("conflict");
    expect(preview.canSubmit).toBe(false);
  });

  it("respeita o desligamento emergencial mesmo para uma prévia já emitida", async () => {
    const preview = await createService().createPreview(request);
    await expect(createService("disabled").submitPreview(preview.previewId)).rejects.toMatchObject({ status: 403 });
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  function createService(writeMode: "disabled" | "create" | "create-update" = "create-update") {
    const apiKey = "test-api-key";
    return new RedmineService(new RedmineClient({ apiKey, fetchImpl: fetchMock }), {
      store, signer, ownerHash: signer.fingerprintOwner("entra-user"), keyFingerprint: signer.fingerprintCredential(apiKey),
      writeMode, writeDelayMs: 0,
    });
  }

  async function mockRedmine(url: URL, init?: RequestInit): Promise<Response> {
    expect(new Headers(init?.headers).get("X-Redmine-API-Key")).toBe("test-api-key");
    expect(new Headers(init?.headers).get("X-Redmine-Switch-User")).toBeNull();
    if (url.pathname === "/users/current.json") return json({ user: { id: 388, login: "danilo.catapan", firstname: "Danilo", lastname: "Catapan" } });
    if (url.pathname === "/projects/333.json") return json({ project: { id: 333, name: "Maestro Cloud" } });
    if (url.pathname === "/projects/333/versions.json") return json({ versions: [{ id: 103, name: "SPRINT 103", status: "open" }] });
    if (url.pathname === "/trackers.json") return json({ trackers: [{ id: 5, name: "Desenvolvimento" }] });
    if (url.pathname === "/issue_statuses.json") return json({ issue_statuses: [{ id: 3, name: "Nova" }] });
    if (url.pathname === "/enumerations/time_entry_activities.json") return json({ time_entry_activities: [{ id: 9, name: "Desenvolvimento" }] });
    const issueMatch = url.pathname.match(/^\/issues\/(\d+)\.json$/);
    if (issueMatch && init?.method === "PUT") { Object.assign(issues.find((item) => item.id === Number(issueMatch[1])), JSON.parse(String(init.body)).issue); return json({}, 204); }
    if (issueMatch) return json({ issue: issues.find((item) => item.id === Number(issueMatch[1])) });
    if (url.pathname === "/issues.json" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)).issue;
      const issue = { id: 20, subject: body.subject, description: body.description, project: { id: 333, name: "Maestro Cloud" }, tracker: { id: body.tracker_id }, status: { id: body.status_id }, assigned_to: { id: body.assigned_to_id }, start_date: body.start_date, due_date: body.due_date, fixed_version: { id: body.fixed_version_id } };
      issues.push(issue); return json({ issue }, 201);
    }
    if (url.pathname === "/issues.json") {
      const filter = (url.searchParams.get("subject") ?? "").replace(/^~/, "").toLowerCase();
      const matches = issues.filter((issue) => String(issue.subject).toLowerCase().includes(filter));
      return json({ issues: matches, total_count: matches.length });
    }
    const entryMatch = url.pathname.match(/^\/time_entries\/(\d+)\.json$/);
    if (entryMatch && init?.method === "PUT") {
      const entry = timeEntries.find((item) => item.id === Number(entryMatch[1]));
      const body = JSON.parse(String(init.body)).time_entry;
      Object.assign(entry, body, { activity: { id: body.activity_id ?? entry.activity.id }, spent_on: body.spent_on ?? entry.spent_on });
      return json({}, 204);
    }
    if (entryMatch) return json({ time_entry: timeEntries.find((item) => item.id === Number(entryMatch[1])) });
    if (url.pathname === "/time_entries.json" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)).time_entry;
      const id = 776 + timeEntries.length;
      const entry = { id, project: { id: 333, name: "Maestro Cloud" }, issue: { id: body.issue_id }, user: { id: 388, name: "Danilo" }, activity: { id: body.activity_id, name: "Desenvolvimento" }, hours: body.hours, spent_on: body.spent_on, comments: body.comments };
      timeEntries.push(entry); return json({ time_entry: { id } }, 201);
    }
    if (url.pathname === "/time_entries.json") return json({ time_entries: timeEntries, total_count: timeEntries.length });
    return json({ errors: ["Rota simulada não encontrada"] }, 404);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}
