import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AutomationPreviewRequest } from "../../shared/redmine";
import { RedmineClient } from "./client";
import { RedmineService } from "./service";

const request: AutomationPreviewRequest = {
  importedMonth: "2026-08",
  minDate: "2026-08-10",
  maxDate: "2026-08-11",
  tasks: [
    { title: "Tarefa Existente", trackerId: 5, activityId: 9, manualIssueId: null },
    { title: "Tarefa Nova", trackerId: 5, activityId: 9, manualIssueId: null },
  ],
  taskDefaults: {
    startDate: "2026-08-10",
    dueDate: "2026-08-11",
    statusId: 3,
    fixedVersionName: "SPRINT 103",
    description: "Criada pelo Cooper Hours",
  },
  entries: [
    { title: "Tarefa Existente", hours: 4, spentOn: "2026-08-10", activityId: 9 },
    { title: "Tarefa Nova", hours: 4, spentOn: "2026-08-10", activityId: 9 },
  ],
};

describe("RedmineService", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let issues: Array<Record<string, unknown>>;
  let timeEntries: Array<Record<string, unknown>>;

  beforeEach(() => {
    issues = [{ id: 10, subject: "Tarefa Existente", project: { id: 333, name: "Maestro Cloud" } }];
    timeEntries = [{
      id: 501,
      project: { id: 333, name: "Maestro Cloud" },
      issue: { id: 10 },
      user: { id: 388, name: "Danilo Catapan" },
      activity: { id: 9, name: "Desenvolvimento" },
      hours: 4,
      spent_on: "2026-08-10",
      comments: "",
    }];

    fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(new Headers(init?.headers).get("X-Redmine-API-Key")).toBe("test-api-key");

      if (url.pathname === "/users/current.json") return json({ user: { id: 388, login: "danilo.catapan", firstname: "Danilo", lastname: "Catapan" } });
      if (url.pathname === "/projects/333.json") return json({ project: { id: 333, name: "Maestro Cloud" } });
      if (url.pathname === "/projects/333/versions.json") return json({ versions: [{ id: 103, name: "SPRINT 103", status: "open" }] });
      if (url.pathname === "/trackers.json") return json({ trackers: [{ id: 5, name: "Desenvolvimento" }] });
      if (url.pathname === "/issue_statuses.json") return json({ issue_statuses: [{ id: 3, name: "Nova" }] });
      if (url.pathname === "/enumerations/time_entry_activities.json") return json({ time_entry_activities: [{ id: 9, name: "Desenvolvimento" }] });

      if (url.pathname === "/issues.json" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.issue).toMatchObject({ project_id: 333, assigned_to_id: 388, fixed_version_id: 103 });
        const issue = { id: 20, subject: body.issue.subject, project: { id: 333, name: "Maestro Cloud" } };
        issues.push(issue);
        return json({ issue }, 201);
      }
      if (url.pathname === "/issues.json") {
        const filter = (url.searchParams.get("subject") ?? "").replace(/^~/, "").toLowerCase();
        const matches = issues.filter((issue) => String(issue.subject).toLowerCase().includes(filter));
        return json({ issues: matches, total_count: matches.length });
      }

      if (url.pathname === "/time_entries.json" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.time_entry.comments).toMatch(/^cooper-hours:[a-f0-9]{16}$/);
        const timeEntry = { id: 777, ...body.time_entry };
        timeEntries.push(timeEntry);
        return json({ time_entry: { id: 777 } }, 201);
      }
      if (url.pathname === "/time_entries.json") {
        return json({ time_entries: timeEntries, total_count: timeEntries.length });
      }

      return json({ errors: ["Rota simulada não encontrada"] }, 404);
    });
  });

  it("prepara uma prévia com reutilização, criação e deduplicação", async () => {
    const service = createService(fetchMock);
    const preview = await service.createPreview(request);

    expect(preview.summary).toEqual({
      tasksToCreate: 1,
      tasksToReuse: 1,
      taskConflicts: 0,
      entriesToCreate: 1,
      duplicateEntries: 1,
      blockedEntries: 0,
    });
    expect(preview.canSubmit).toBe(true);
    expect(preview.entries[0].action).toBe("duplicate");
    expect(preview.entries[1].marker).toMatch(/^cooper-hours:[a-f0-9]{16}$/);
  });

  it("cria somente os itens novos e reutiliza o resultado da mesma prévia", async () => {
    const service = createService(fetchMock);
    const preview = await service.createPreview(request);
    const result = await service.submitPreview(preview.previewId);
    const repeatedResult = await service.submitPreview(preview.previewId);

    expect(result.completed).toBe(true);
    expect(result.tasks.map((item) => item.status)).toEqual(["reused", "created"]);
    expect(result.entries.map((item) => item.status)).toEqual(["skipped", "created"]);
    expect(repeatedResult).toEqual(result);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2);
  });

  it("bloqueia títulos com mais de uma issue exata", async () => {
    issues.push({ id: 11, subject: "Tarefa Existente", project: { id: 333, name: "Maestro Cloud" } });
    const service = createService(fetchMock);
    const preview = await service.createPreview(request);

    expect(preview.tasks[0].action).toBe("conflict");
    expect(preview.canSubmit).toBe(false);
    expect(preview.blockers[0]).toContain("Mais de uma tarefa");
  });

  it("bloqueia horas divergentes na mesma tarefa, data e atividade", async () => {
    timeEntries[0].hours = 3;
    const preview = await createService(fetchMock).createPreview(request);

    expect(preview.entries[0].action).toBe("blocked");
    expect(preview.entries[0].message).toContain("horas diferentes");
    expect(preview.canSubmit).toBe(false);
  });

  it("não considera lançamento de outro usuário como duplicata", async () => {
    timeEntries[0].user = { id: 999, name: "Outro usuário" };
    const preview = await createService(fetchMock).createPreview(request);

    expect(preview.entries[0].action).toBe("create");
    expect(preview.summary.duplicateEntries).toBe(0);
  });
});

function createService(fetchImpl: typeof fetch) {
  return new RedmineService(new RedmineClient({
    baseUrl: "https://redmine.coopersystem.com.br",
    apiKey: "test-api-key",
    fetchImpl,
  }), { projectId: 333, writeDelayMs: 0 });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
