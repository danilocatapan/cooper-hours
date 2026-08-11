import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REDMINE_REQUEST_HEADER, REDMINE_REQUEST_HEADER_VALUE } from "../shared/redmine";
import { createApp } from "./app";

const servers: Array<ReturnType<ReturnType<typeof createApp>["listen"]>> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("rotas locais do Redmine", () => {
  it("rejeita chamadas sem o header exclusivo da aplicação", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/redmine/status`);
    expect(response.status).toBe(403);
  });

  it("informa quando a API key ainda não foi configurada", async () => {
    const baseUrl = await startApp();
    const response = await localRequest(`${baseUrl}/api/redmine/status`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ configured: false, connected: false });
  });

  it("valida o corpo antes de criar uma prévia", async () => {
    const service = {
      getStatus: vi.fn(),
      createPreview: vi.fn(),
      submitPreview: vi.fn(),
    };
    const baseUrl = await startApp(service);
    const response = await localRequest(`${baseUrl}/api/redmine/preview`, {
      method: "POST",
      body: JSON.stringify({ tasks: [] }),
    });

    expect(response.status).toBe(400);
    expect(service.createPreview).not.toHaveBeenCalled();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

async function startApp(redmineService: Parameters<typeof createApp>[0]["redmineService"] = null) {
  const app = createApp({ redmineService });
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

function localRequest(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      [REDMINE_REQUEST_HEADER]: REDMINE_REQUEST_HEADER_VALUE,
      ...init.headers,
    },
  });
}
