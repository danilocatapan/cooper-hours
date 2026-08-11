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
  project: RedmineProject;
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
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class RedmineClient {
  private readonly baseUrl: URL;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: RedmineClientOptions) {
    this.baseUrl = new URL(options.baseUrl);
    if (this.baseUrl.protocol !== "https:" || this.baseUrl.hostname !== "redmine.coopersystem.com.br") {
      throw new Error("A URL do Redmine deve usar HTTPS no domínio oficial da Coopersystem.");
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 12_000;
  }

  async getCurrentUser(): Promise<RedmineUser> {
    const response = await this.request<{ user: RedmineUser }>("/users/current.json");
    return response.user;
  }

  async getProject(projectId: number): Promise<RedmineProject> {
    const response = await this.request<{ project: RedmineProject }>(`/projects/${projectId}.json`);
    return response.project;
  }

  async getVersions(projectId: number): Promise<RedmineNamedResource[]> {
    const response = await this.request<{ versions: RedmineNamedResource[] }>(`/projects/${projectId}/versions.json`);
    return response.versions ?? [];
  }

  async getTrackers(): Promise<RedmineNamedResource[]> {
    const response = await this.request<{ trackers: RedmineNamedResource[] }>("/trackers.json");
    return response.trackers ?? [];
  }

  async getIssueStatuses(): Promise<RedmineNamedResource[]> {
    const response = await this.request<{ issue_statuses: RedmineNamedResource[] }>("/issue_statuses.json");
    return response.issue_statuses ?? [];
  }

  async getTimeEntryActivities(): Promise<RedmineNamedResource[]> {
    const response = await this.request<{ time_entry_activities: RedmineNamedResource[] }>("/enumerations/time_entry_activities.json");
    return response.time_entry_activities ?? [];
  }

  async getIssue(issueId: number): Promise<RedmineIssue> {
    const response = await this.request<{ issue: RedmineIssue }>(`/issues/${issueId}.json`);
    return response.issue;
  }

  async findIssuesBySubject(projectId: number, subject: string): Promise<RedmineIssue[]> {
    const params = new URLSearchParams({
      project_id: String(projectId),
      status_id: "*",
      subject: `~${subject}`,
      limit: "100",
    });
    return this.collectPages<RedmineIssue>(`/issues.json?${params}`, "issues");
  }

  async listTimeEntries(projectId: number, from: string, to: string): Promise<RedmineTimeEntry[]> {
    const params = new URLSearchParams({
      project_id: String(projectId),
      user_id: "me",
      from,
      to,
      limit: "100",
    });
    return this.collectPages<RedmineTimeEntry>(`/time_entries.json?${params}`, "time_entries");
  }

  async createIssue(issue: Record<string, unknown>): Promise<RedmineIssue> {
    const response = await this.request<{ issue: RedmineIssue }>("/issues.json", {
      method: "POST",
      body: JSON.stringify({ issue }),
    });
    return response.issue;
  }

  async createTimeEntry(timeEntry: Record<string, unknown>): Promise<{ id: number }> {
    const response = await this.request<{ time_entry: { id: number } }>("/time_entries.json", {
      method: "POST",
      body: JSON.stringify({ time_entry: timeEntry }),
    });
    return response.time_entry;
  }

  private async collectPages<T>(path: string, key: string): Promise<T[]> {
    const collected: T[] = [];
    let offset = 0;
    let totalCount = 1;

    while (offset < totalCount && offset < 1_000) {
      const separator = path.includes("?") ? "&" : "?";
      const response = await this.request<Record<string, unknown>>(`${path}${separator}offset=${offset}`);
      const items = Array.isArray(response[key]) ? response[key] as T[] : [];
      collected.push(...items);
      totalCount = typeof response.total_count === "number" ? response.total_count : collected.length;
      if (items.length === 0) break;
      offset += items.length;
    }

    return collected;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const target = new URL(path, this.baseUrl);
    if (target.origin !== this.baseUrl.origin) {
      throw new RedmineError("Destino Redmine inválido.", 400);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(target, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Redmine-API-Key": this.options.apiKey,
          ...init.headers,
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

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

function getErrorDetails(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || !("errors" in payload) || !Array.isArray(payload.errors)) return [];
  return payload.errors
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.slice(0, 300))
    .slice(0, 10);
}
