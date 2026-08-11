import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REDMINE_AUTH_SCHEME, REDMINE_REQUEST_HEADER, REDMINE_REQUEST_HEADER_VALUE } from "../shared/redmine";
import { localAccessMiddleware } from "./access";
import { createApp } from "./app";

const servers: Array<ReturnType<ReturnType<typeof createApp>["listen"]>> = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))));

describe("rotas seguras do Redmine", () => {
  it("mantém somente o health check público", async () => {
    const baseUrl = await startApp(vi.fn(), (_req, res) => res.status(403).end());
    expect((await fetch(`${baseUrl}/healthz`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/`)).status).toBe(403);
  });

  it("rejeita chamadas sem o header exclusivo da aplicação", async () => {
    const baseUrl = await startApp(vi.fn());
    const response = await fetch(`${baseUrl}/api/redmine/connection`, { method: "POST", headers: { Authorization: `${REDMINE_AUTH_SCHEME} test-api-key` } });
    expect(response.status).toBe(403);
  });

  it("rejeita chave ausente sem chamar o serviço", async () => {
    const factory = vi.fn();
    const baseUrl = await startApp(factory);
    const response = await appRequest(`${baseUrl}/api/redmine/connection`);
    expect(response.status).toBe(401);
    expect(factory).not.toHaveBeenCalled();
  });

  it("passa a chave e a identidade somente para a factory e desabilita cache", async () => {
    const service = { getStatus: vi.fn().mockResolvedValue({ configured: true, connected: true, writeMode: "disabled", trackers: [], statuses: [], activities: [], versions: [], message: "ok" }) };
    const factory = vi.fn(() => service);
    const baseUrl = await startApp(factory);
    const response = await appRequest(`${baseUrl}/api/redmine/connection`, {}, "test-api-key");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(factory).toHaveBeenCalledWith("test-api-key", { subject: "local-development" });
  });

  it("valida o corpo antes de criar uma prévia", async () => {
    const service = { createPreview: vi.fn() };
    const factory = vi.fn(() => service);
    const baseUrl = await startApp(factory);
    const response = await appRequest(`${baseUrl}/api/redmine/preview`, { body: JSON.stringify({ tasks: [] }) }, "test-api-key");
    expect(response.status).toBe(400);
    expect(service.createPreview).not.toHaveBeenCalled();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("bloqueia origem diferente", async () => {
    const baseUrl = await startApp(vi.fn());
    const response = await appRequest(`${baseUrl}/api/redmine/connection`, { headers: { Origin: "https://evil.example" } }, "test-api-key");
    expect(response.status).toBe(403);
  });

  it("mantém healthz público, mas rejeita acesso direto pelo host do Render", async () => {
    const baseUrl = await startApp(vi.fn(), localAccessMiddleware, "https://hours.example.com");
    expect((await fetch(`${baseUrl}/healthz`, { headers: { Host: "cooper-hours.onrender.com" } })).status).toBe(200);
    expect((await fetch(`${baseUrl}/`, { headers: { Host: "cooper-hours.onrender.com" } })).status).toBe(403);
  });

  it("exige origem e Fetch Metadata exatos no ambiente privado", async () => {
    const baseUrl = await startApp(vi.fn(), localAccessMiddleware, "https://hours.example.com");
    const response = await appRequest(`${baseUrl}/api/redmine/connection`, { headers: { Host: "hours.example.com" } }, "test-api-key");
    expect(response.status).toBe(403);
  });
});

async function startApp(serviceFactory: Parameters<typeof createApp>[0]["serviceFactory"], accessMiddleware = localAccessMiddleware, appOrigin?: string) {
  const app = createApp({ serviceFactory, accessMiddleware, appOrigin });
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

function appRequest(url: string, init: RequestInit = {}, apiKey?: string) {
  return fetch(url, {
    method: "POST",
    ...init,
    headers: {
      "Content-Type": "application/json",
      [REDMINE_REQUEST_HEADER]: REDMINE_REQUEST_HEADER_VALUE,
      ...(apiKey ? { Authorization: `${REDMINE_AUTH_SCHEME} ${apiKey}` } : {}),
      ...init.headers,
    },
  });
}
