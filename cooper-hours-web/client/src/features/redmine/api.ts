import {
  REDMINE_REQUEST_HEADER,
  REDMINE_REQUEST_HEADER_VALUE,
  type ApiErrorResponse,
  type AutomationPreview,
  type AutomationPreviewRequest,
  type AutomationSubmissionResult,
  type RedmineConnectionStatus,
} from "@shared/redmine";

export const redmineIntegrationEnabled = import.meta.env.DEV
  || import.meta.env.VITE_REDMINE_INTEGRATION_ENABLED === "true";

export function getRedmineStatus(): Promise<RedmineConnectionStatus> {
  return request<RedmineConnectionStatus>("/api/redmine/status", { method: "GET" }, 20_000);
}

export function createAutomationPreview(payload: AutomationPreviewRequest): Promise<AutomationPreview> {
  return request<AutomationPreview>("/api/redmine/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  }, 45_000);
}

export function submitAutomationPreview(previewId: string): Promise<AutomationSubmissionResult> {
  return request<AutomationSubmissionResult>("/api/redmine/submit", {
    method: "POST",
    body: JSON.stringify({ previewId }),
  }, 120_000);
}

async function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "omit",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        [REDMINE_REQUEST_HEADER]: REDMINE_REQUEST_HEADER_VALUE,
        ...init.headers,
      },
    });
  } catch (_error) {
    throw new Error("O backend local não respondeu. Confirme se o comando pnpm run dev está ativo.");
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse;
    const details = Array.isArray(errorPayload.details) && errorPayload.details.length > 0
      ? ` ${errorPayload.details.join(" ")}`
      : "";
    throw new Error(`${errorPayload.error || "A integração Redmine não concluiu a solicitação."}${details}`);
  }
  return payload as T;
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (_error) {
    return { error: "O backend local retornou uma resposta inválida." };
  }
}
