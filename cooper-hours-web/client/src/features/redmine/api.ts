import {
  REDMINE_AUTH_SCHEME,
  REDMINE_REQUEST_HEADER,
  REDMINE_REQUEST_HEADER_VALUE,
  type ApiErrorResponse,
  type AutomationPreview,
  type AutomationPreviewRequest,
  type AutomationSubmissionResult,
  type RedmineConnectionStatus,
} from "@shared/redmine";

export const redmineIntegrationEnabled = import.meta.env.DEV || import.meta.env.VITE_REDMINE_INTEGRATION_ENABLED === "true";

export function connectRedmine(apiKey: string): Promise<RedmineConnectionStatus> {
  return request<RedmineConnectionStatus>(apiKey, "/api/redmine/connection", { method: "POST", body: "{}" }, 20_000);
}

export function createAutomationPreview(apiKey: string, payload: AutomationPreviewRequest): Promise<AutomationPreview> {
  return request<AutomationPreview>(apiKey, "/api/redmine/preview", { method: "POST", body: JSON.stringify(payload) }, 45_000);
}

export function submitAutomationPreview(apiKey: string, previewId: string): Promise<AutomationSubmissionResult> {
  return request<AutomationSubmissionResult>(apiKey, "/api/redmine/submit", { method: "POST", body: JSON.stringify({ previewId }) }, 120_000);
}

async function request<T>(apiKey: string, path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  if (!apiKey.trim()) throw new Error("Informe sua API key do Redmine.");
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `${REDMINE_AUTH_SCHEME} ${apiKey.trim()}`,
        [REDMINE_REQUEST_HEADER]: REDMINE_REQUEST_HEADER_VALUE,
      },
    });
  } catch (_error) {
    throw new Error("O serviço seguro de integração não respondeu.");
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse;
    const details = Array.isArray(errorPayload.details) && errorPayload.details.length ? ` ${errorPayload.details.join(" ")}` : "";
    throw new Error(`${errorPayload.error || "A integração Redmine não concluiu a solicitação."}${details}`);
  }
  return payload as T;
}

async function readPayload(response: Response): Promise<unknown> {
  try { return await response.json(); } catch (_error) { return { error: "O serviço retornou uma resposta inválida." }; }
}
