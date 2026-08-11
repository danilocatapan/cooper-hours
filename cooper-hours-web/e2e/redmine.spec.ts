import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3000/cooper-hours/";
const testDir = path.dirname(fileURLToPath(import.meta.url));

test("prepara, confirma e conclui a automação com o Redmine simulado", async ({ page }) => {
  await mockRedmine(page);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("checkbox", { name: /Li o Aviso de Privacidade/i }).click();
  await page.locator('input[type="file"]').setInputFiles(path.join(testDir, "fixtures", "sample.csv"));

  await page.getByRole("tab", { name: /Automatizar/i }).click();
  await expect(page.getByTestId("redmine-automation-panel")).toBeVisible();
  await expect(page.getByText("Danilo Catapan (danilo.catapan)")).toBeVisible();

  await page.getByTestId("prepare-redmine-preview").click();
  await expect(page.getByText("Prévia da operação")).toBeVisible();
  await expect(page.getByText("Tarefa A").first()).toBeVisible();
  await expect(page.getByText("duplicatas ignoradas")).toBeVisible();

  await page.getByTestId("open-redmine-confirmation").click();
  await expect(page.getByRole("alertdialog", { name: /Criar tarefas e lançar horas/i })).toBeVisible();
  await page.getByTestId("confirm-redmine-submit").click();

  const panel = page.getByTestId("redmine-automation-panel");
  await expect(panel.getByText("Resultado da automação")).toBeVisible();
  await expect(panel.getByText("Automação concluída e verificada no Redmine.")).toBeVisible();
  await expect(panel.getByText("tarefas criadas", { exact: true })).toBeVisible();
  await expect(panel.getByText("horas lançadas", { exact: true })).toBeVisible();
});

test("mantém o envio bloqueado quando a prévia encontra conflito", async ({ page }) => {
  await mockRedmine(page, { conflict: true });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("checkbox", { name: /Li o Aviso de Privacidade/i }).click();
  await page.locator('input[type="file"]').setInputFiles(path.join(testDir, "fixtures", "sample.csv"));
  await page.getByRole("tab", { name: /Automatizar/i }).click();
  await page.getByTestId("prepare-redmine-preview").click();

  await expect(page.getByText("Prévia bloqueada")).toBeVisible();
  await expect(page.getByTestId("redmine-automation-panel").locator('[data-slot="alert-description"]')).toContainText(
    "Mais de uma tarefa corresponde a Tarefa A",
  );
  await expect(page.getByTestId("open-redmine-confirmation")).toBeDisabled();
});

test("ignora duplicatas identificadas na prévia", async ({ page }) => {
  await mockRedmine(page, { duplicate: true });
  await openAutomation(page);
  await page.getByTestId("prepare-redmine-preview").click();

  const duplicateMetric = page.getByText("duplicatas ignoradas", { exact: true }).locator("..");
  await expect(duplicateMetric).toContainText("1");
  await expect(page.getByTestId("open-redmine-confirmation")).toBeEnabled();
});

test("exibe falha parcial e interrupção segura do lote", async ({ page }) => {
  await mockRedmine(page, { partialFailure: true });
  await openAutomation(page);
  await page.getByTestId("prepare-redmine-preview").click();
  await page.getByTestId("open-redmine-confirmation").click();
  await page.getByTestId("confirm-redmine-submit").click();

  const panel = page.getByTestId("redmine-automation-panel");
  await expect(panel.getByText("Envio interrompido após uma falha. Gere uma nova prévia antes de tentar novamente.")).toBeVisible();
  await expect(panel.getByText("itens com falha", { exact: true }).locator("..")).toContainText("1");
});

async function openAutomation(page: Page) {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("checkbox", { name: /Li o Aviso de Privacidade/i }).click();
  await page.locator('input[type="file"]').setInputFiles(path.join(testDir, "fixtures", "sample.csv"));
  await page.getByRole("tab", { name: /Automatizar/i }).click();
}

async function mockRedmine(page: Page, options: { conflict?: boolean; duplicate?: boolean; partialFailure?: boolean } = {}) {
  await page.route("**/api/redmine/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      configured: true,
      connected: true,
      message: "Conexão segura com o Redmine validada.",
      account: { id: 388, login: "danilo.catapan", name: "Danilo Catapan" },
      project: { id: 333, name: "Maestro Cloud BB Corretora" },
      trackers: [{ id: 5, name: "Desenvolvimento" }],
      statuses: [{ id: 3, name: "Nova" }],
      activities: [{ id: 9, name: "Desenvolvimento" }],
      versions: [{ id: 103, name: "SPRINT 103" }],
    }),
  }));

  await page.route("**/api/redmine/preview", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(buildPreview(options)),
  }));

  await page.route("**/api/redmine/submit", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      previewId: "00000000-0000-4000-8000-000000000001",
      completed: !options.partialFailure,
      halted: Boolean(options.partialFailure),
      message: options.partialFailure
        ? "Envio interrompido após uma falha. Gere uma nova prévia antes de tentar novamente."
        : "Automação concluída e verificada no Redmine.",
      tasks: [
        { title: "Tarefa A", status: "created", issueId: 901, message: "Tarefa criada no Redmine." },
        { title: "Tarefa B", status: "created", issueId: 902, message: "Tarefa criada no Redmine." },
      ],
      entries: [
        { key: "entry-a", title: "Tarefa A", status: "created", timeEntryId: 1001, message: "Horas lançadas no Redmine." },
        options.partialFailure
          ? { key: "entry-b", title: "Tarefa B", status: "failed", message: "Resposta ambígua do Redmine; o lote foi interrompido." }
          : { key: "entry-b", title: "Tarefa B", status: "created", timeEntryId: 1002, message: "Horas lançadas no Redmine." },
      ],
    }),
  }));
}

function buildPreview(options: { conflict?: boolean; duplicate?: boolean }) {
  const conflict = Boolean(options.conflict);
  const duplicate = Boolean(options.duplicate);
  const blockers = conflict ? ["Mais de uma tarefa corresponde a Tarefa A. Informe o issue_id correto."] : [];
  return {
    previewId: "00000000-0000-4000-8000-000000000001",
    expiresAt: "2099-08-11T15:00:00.000Z",
    account: { id: 388, login: "danilo.catapan", name: "Danilo Catapan" },
    project: { id: 333, name: "Maestro Cloud BB Corretora" },
    tasks: [
      {
        title: "Tarefa A",
        action: conflict ? "conflict" : "create",
        trackerId: 5,
        activityId: 9,
        issueId: null,
        candidates: conflict ? [{ id: 800, subject: "Tarefa A" }, { id: 801, subject: "Tarefa A" }] : [],
        message: conflict ? blockers[0] : "Nova tarefa será criada.",
      },
      { title: "Tarefa B", action: "create", trackerId: 5, activityId: 9, issueId: null, candidates: [], message: "Nova tarefa será criada." },
    ],
    entries: [
      { key: "entry-a", title: "Tarefa A", action: conflict ? "blocked" : duplicate ? "duplicate" : "create", issueId: duplicate ? 901 : null, hours: 5, spentOn: "2026-04-01", activityId: 9, marker: "cooper-hours:aaaaaaaaaaaaaaaa", message: conflict ? "O lançamento depende da resolução da tarefa." : duplicate ? "Lançamento idêntico já existe no Redmine e será ignorado." : "Novo lançamento será criado." },
      { key: "entry-b", title: "Tarefa B", action: "create", issueId: null, hours: 3, spentOn: "2026-04-01", activityId: 9, marker: "cooper-hours:bbbbbbbbbbbbbbbb", message: "Novo lançamento será criado." },
    ],
    blockers,
    canSubmit: !conflict,
    summary: {
      tasksToCreate: conflict ? 1 : 2,
      tasksToReuse: 0,
      taskConflicts: conflict ? 1 : 0,
      entriesToCreate: conflict || duplicate ? 1 : 2,
      duplicateEntries: duplicate ? 1 : 0,
      blockedEntries: conflict ? 1 : 0,
    },
  };
}
