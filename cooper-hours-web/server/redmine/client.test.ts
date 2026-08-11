import { describe, expect, it, vi } from "vitest";
import { RedmineClient } from "./client";

describe("allowlist do cliente Redmine", () => {
  it("permite apenas GET, POST e PUT nos endpoints declarados", async () => {
    const calls: Array<{ method: string; path: string; headers: Headers }> = [];
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      calls.push({ method: String(init?.method), path: url.pathname, headers: new Headers(init?.headers) });
      if (url.pathname === "/users/current.json") return json({ user: { id: 1, login: "user" } });
      if (url.pathname === "/projects/333.json") return json({ project: { id: 333, name: "Projeto" } });
      if (url.pathname.includes("versions")) return json({ versions: [] });
      if (url.pathname === "/trackers.json") return json({ trackers: [] });
      if (url.pathname === "/issue_statuses.json") return json({ issue_statuses: [] });
      if (url.pathname.includes("time_entry_activities")) return json({ time_entry_activities: [] });
      if (url.pathname === "/issues.json" && init?.method === "POST") return json({ issue: { id: 9, subject: "T", project: { id: 333, name: "P" } } }, 201);
      if (url.pathname === "/issues.json") return json({ issues: [], total_count: 0 });
      if (url.pathname === "/time_entries.json" && init?.method === "POST") return json({ time_entry: { id: 8 } }, 201);
      if (url.pathname === "/time_entries.json") return json({ time_entries: [], total_count: 0 });
      if (/\/issues\/\d+/.test(url.pathname) && init?.method === "PUT") return new Response(null, { status: 204 });
      if (/\/issues\/\d+/.test(url.pathname)) return json({ issue: { id: 9, subject: "T", project: { id: 333, name: "P" } } });
      if (/\/time_entries\/\d+/.test(url.pathname) && init?.method === "PUT") return new Response(null, { status: 204 });
      if (/\/time_entries\/\d+/.test(url.pathname)) return json({ time_entry: { id: 8, project: { id: 333 }, user: { id: 1 }, activity: { id: 9 }, hours: 1, spent_on: "2026-08-11" } });
      return json({}, 404);
    });
    const client = new RedmineClient({ apiKey: "safe-test-key", fetchImpl: fetchMock });
    await client.getCurrentUser(); await client.getProject(); await client.getVersions(); await client.getTrackers();
    await client.getIssueStatuses(); await client.getTimeEntryActivities(); await client.getIssue(9);
    await client.findIssuesBySubject("T"); await client.getTimeEntry(8); await client.listTimeEntries("2026-08-01", "2026-08-31");
    await client.createIssue({ project_id: 333 }); await client.updateIssue(9, { status_id: 3 });
    await client.createTimeEntry({ issue_id: 9 }); await client.updateTimeEntry(8, { hours: 2 });

    expect(new Set(calls.map((call) => call.method))).toEqual(new Set(["GET", "POST", "PUT"]));
    expect(calls.every((call) => call.headers.get("X-Redmine-API-Key") === "safe-test-key")).toBe(true);
    expect(calls.every((call) => !call.headers.has("X-Redmine-Switch-User"))).toBe(true);
    expect(calls.some((call) => call.method === "DELETE" || call.method === "PATCH")).toBe(false);
  });

  it("falha antes do fetch para uma operação interna desconhecida", async () => {
    const fetchMock = vi.fn();
    const client = new RedmineClient({ apiKey: "safe-test-key", fetchImpl: fetchMock });
    await expect((client as any).request({ kind: "delete-project" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}
