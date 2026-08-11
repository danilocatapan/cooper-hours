export const REDMINE_BASE_URL = "https://redmine.coopersystem.com.br";
export const REDMINE_PROJECT_ID = 333;

export interface RedmineUser {
  id: number;
  login: string;
  firstname?: string;
  lastname?: string;
}

export interface RedmineProject {
  id: number;
  name: string;
  identifier?: string;
}

export interface RedmineNamedResource {
  id: number;
  name: string;
  status?: string;
}

export interface RedmineIssue {
  id: number;
  subject: string;
  description?: string;
  project: RedmineProject;
  tracker?: RedmineNamedResource;
  status?: RedmineNamedResource;
  assigned_to?: { id: number; name: string };
  fixed_version?: RedmineNamedResource;
  start_date?: string;
  due_date?: string | null;
}

export interface RedmineTimeEntry {
  id: number;
  project: RedmineProject;
  issue?: { id: number };
  user: { id: number; name: string };
  activity: RedmineNamedResource;
  hours: number;
  comments?: string;
  spent_on: string;
}

export class RedmineError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: string[] = [],
    public readonly kind: "http" | "network" = "http",
  ) {
    super(message);
    this.name = "RedmineError";
  }
}

interface RedmineClientOptions {
  apiKey: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

type RedmineOperation =
  | { kind: "current-user" }
  | { kind: "project" }
  | { kind: "versions" }
  | { kind: "trackers" }
  | { kind: "statuses" }
  | { kind: "activities" }
  | { kind: "issue"; issueId: number }
  | { kind: "issues-by-subject"; subject: string; offset: number }
  | { kind: "time-entry"; timeEntryId: number }
  | { kind: "time-entries"; from: string; to: string; offset: number }
  | { kind: "create-issue"; body: Record<string, unknown> }
  | { kind: "update-issue"; issueId: number; body: Record<string, unknown> }
  | { kind: "create-time-entry"; body: Record<string, unknown> }
  | { kind: "update-time-entry"; timeEntryId: number; body: Record<string, unknown> };

interface PreparedOperation {
  method: "GET" | "POST" | "PUT";
  path: string;
  body?: string;
}

export class RedmineClient {
  private readonly baseUrl = new URL(REDMINE_BASE_URL);
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: RedmineClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 12_000;
  }

  async getCurrentUser(): Promise<RedmineUser> {
    return (await this.request<{ user: RedmineUser }>({ kind: "current-user" })).user;
  }

  async getProject(): Promise<RedmineProject> {
    return (await this.request<{ project: RedmineProject }>({ kind: "project" })).project;
  }

  async getVersions(): Promise<RedmineNamedResource[]> {
    return (await this.request<{ versions: RedmineNamedResource[] }>({ kind: "versions" })).versions ?? [];
  }

  async getTrackers(): Promise<RedmineNamedResource[]> {
    return (await this.request<{ trackers: RedmineNamedResource[] }>({ kind: "trackers" })).trackers ?? [];
  }

  async getIssueStatuses(): Promise<RedmineNamedResource[]> {
    return (await this.request<{ issue_statuses: RedmineNamedResource[] }>({ kind: "statuses" })).issue_statuses ?? [];
  }

  async getTimeEntryActivities(): Promise<RedmineNamedResource[]> {
    return (await this.request<{ time_entry_activities: RedmineNamedResource[] }>({ kind: "activities" })).time_entry_activities ?? [];
  }

  async getIssue(issueId: number): Promise<RedmineIssue> {
    return (await this.request<{ issue: RedmineIssue }>({ kind: "issue", issueId: positiveId(issueId) })).issue;
  }

  async findIssuesBySubject(subject: string): Promise<RedmineIssue[]> {
    return this.collectPages<RedmineIssue>((offset) => ({ kind: "issues-by-subject", subject, offset }), "issues");
  }

  async getTimeEntry(timeEntryId: number): Promise<RedmineTimeEntry> {
    return (await this.request<{ time_entry: RedmineTimeEntry }>({ kind: "time-entry", timeEntryId: positiveId(timeEntryId) })).time_entry;
  }

  async listTimeEntries(from: string, to: string): Promise<RedmineTimeEntry[]> {
    return this.collectPages<RedmineTimeEntry>((offset) => ({ kind: "time-entries", from, to, offset }), "time_entries");
  }

  async createIssue(issue: Record<string, unknown>): Promise<RedmineIssue> {
    return (await this.request<{ issue: RedmineIssue }>({ kind: "create-issue", body: issue })).issue;
  }

  async updateIssue(issueId: number, issue: Record<string, unknown>): Promise<void> {
    await this.request({ kind: "update-issue", issueId: positiveId(issueId), body: issue });
  }

  async createTimeEntry(timeEntry: Record<string, unknown>): Promise<{ id: number }> {
    return (await this.request<{ time_entry: { id: number } }>({ kind: "create-time-entry", body: timeEntry })).time_entry;
  }

  async updateTimeEntry(timeEntryId: number, timeEntry: Record<string, unknown>): Promise<void> {
    await this.request({ kind: "update-time-entry", timeEntryId: positiveId(timeEntryId), body: timeEntry });
  }

  private async collectPages<T>(operation: (offset: number) => RedmineOperation, key: string): Promise<T[]> {
    const collected: T[] = [];
    let offset = 0;
    let totalCount = 1;
    while (offset < totalCount && offset < 1_000) {
      const response = await this.request<Record<string, unknown>>(operation(offset));
      const items = Array.isArray(response[key]) ? response[key] as T[] : [];
      collected.push(...items);
      totalCount = typeof response.total_count === "number" ? response.total_count : collected.length;
      if (items.length === 0) break;
      offset += items.length;
    }
    return collected;
  }

  private async request<T = Record<string, never>>(operation: RedmineOperation): Promise<T> {
    const prepared = prepareOperation(operation);
    assertAllowedOperation(prepared);
    const target = new URL(prepared.path, this.baseUrl);
    if (target.origin !== this.baseUrl.origin) throw new RedmineError("Destino Redmine inválido.", 400);

    let response: Response;
    try {
      response = await this.fetchImpl(target, {
        method: prepared.method,
        body: prepared.body,
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Redmine-API-Key": this.options.apiKey,
        },
      });
    } catch (_error) {
      throw new RedmineError("Não foi possível acessar o Redmine.", 502, [], "network");
    }

    const payload = await readJson(response);
    if (!response.ok) {
      const details = getErrorDetails(payload);
      const fallback = response.status === 401 || response.status === 403
        ? "A API key não foi aceita ou não possui permissão para esta operação."
        : response.status === 422
          ? "O Redmine recusou os dados enviados."
          : "O Redmine não concluiu a solicitação.";
      throw new RedmineError(fallback, response.status, details);
    }
    return payload as T;
  }
}

function prepareOperation(operation: RedmineOperation): PreparedOperation {
  switch (operation.kind) {
    case "current-user": return { method: "GET", path: "/users/current.json" };
    case "project": return { method: "GET", path: `/projects/${REDMINE_PROJECT_ID}.json` };
    case "versions": return { method: "GET", path: `/projects/${REDMINE_PROJECT_ID}/versions.json` };
    case "trackers": return { method: "GET", path: "/trackers.json" };
    case "statuses": return { method: "GET", path: "/issue_statuses.json" };
    case "activities": return { method: "GET", path: "/enumerations/time_entry_activities.json" };
    case "issue": return { method: "GET", path: `/issues/${operation.issueId}.json` };
    case "time-entry": return { method: "GET", path: `/time_entries/${operation.timeEntryId}.json` };
    case "issues-by-subject": {
      const query = new URLSearchParams({ project_id: String(REDMINE_PROJECT_ID), status_id: "*", subject: `~${operation.subject}`, limit: "100", offset: String(operation.offset) });
      return { method: "GET", path: `/issues.json?${query}` };
    }
    case "time-entries": {
      const query = new URLSearchParams({ project_id: String(REDMINE_PROJECT_ID), user_id: "me", from: operation.from, to: operation.to, limit: "100", offset: String(operation.offset) });
      return { method: "GET", path: `/time_entries.json?${query}` };
    }
    case "create-issue": return { method: "POST", path: "/issues.json", body: JSON.stringify({ issue: operation.body }) };
    case "update-issue": return { method: "PUT", path: `/issues/${operation.issueId}.json`, body: JSON.stringify({ issue: operation.body }) };
    case "create-time-entry": return { method: "POST", path: "/time_entries.json", body: JSON.stringify({ time_entry: operation.body }) };
    case "update-time-entry": return { method: "PUT", path: `/time_entries/${operation.timeEntryId}.json`, body: JSON.stringify({ time_entry: operation.body }) };
  }
}

function assertAllowedOperation(operation: PreparedOperation): void {
  const pathname = new URL(operation.path, REDMINE_BASE_URL).pathname;
  const allowed = operation.method === "GET"
    ? pathname === "/users/current.json"
      || pathname === `/projects/${REDMINE_PROJECT_ID}.json`
      || pathname === `/projects/${REDMINE_PROJECT_ID}/versions.json`
      || pathname === "/trackers.json"
      || pathname === "/issue_statuses.json"
      || pathname === "/enumerations/time_entry_activities.json"
      || pathname === "/issues.json"
      || pathname === "/time_entries.json"
      || /^\/issues\/\d+\.json$/.test(pathname)
      || /^\/time_entries\/\d+\.json$/.test(pathname)
    : operation.method === "POST"
      ? pathname === "/issues.json" || pathname === "/time_entries.json"
      : /^\/issues\/\d+\.json$/.test(pathname) || /^\/time_entries\/\d+\.json$/.test(pathname);
  if (!allowed) throw new RedmineError("Operação Redmine fora da lista permitida.", 403);
}

function positiveId(value: number): number {
  if (!Number.isInteger(value) || value <= 0) throw new RedmineError("Identificador Redmine inválido.", 400);
  return value;
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return {};
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};
  try { return await response.json(); } catch (_error) { return {}; }
}

function getErrorDetails(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || !("errors" in payload) || !Array.isArray(payload.errors)) return [];
  return payload.errors.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 300)).slice(0, 10);
}
