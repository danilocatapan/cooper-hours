import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.E2E_BASE_URL || "http://localhost:3000/cooper-hours/";

test.describe.configure({ timeout: 180_000 });

const sampleCsv = [
  "Usuário\tID do cartão\tTítulo\tEtiquetas\tData\tTempo registrado soma",
  "Usuario Teste\t893566\tTarefa A\t\"tag\"\t2026-04-01\t5.000",
  "Usuario Teste\t987589\tTarefa B\t\"tag\"\t2026-04-01\t3.000",
].join("\n");

async function checkA11y(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto(base, { waitUntil: "networkidle" });
});

test("initial screen has no automated accessibility violations", async ({ page }) => {
  await checkA11y(page);
});

test("CSV format dialog has no automated accessibility violations", async ({ page }) => {
  await page.getByRole("button", { name: /Formato do arquivo/i }).click();
  await expect(page.getByRole("dialog", { name: /Formato do arquivo CSV/i })).toBeVisible();
  await checkA11y(page);
});

test("report, Cecis tabs and sensitive confirmation have no automated accessibility violations", async ({ page }) => {
  await page.getByRole("checkbox", { name: /Li o Aviso de Privacidade/i }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "a11y.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sampleCsv, "utf8"),
  });

  await expect(page.getByText("Conferência do período")).toBeVisible();
  await checkA11y(page);

  await page.getByRole("tab", { name: /Criar Tarefas/i }).click();
  await expect(page.getByTestId("tasks-json")).toBeVisible();
  await checkA11y(page);

  await page.getByRole("button", { name: /Copiar JSON/i }).click();
  await expect(page.getByRole("alertdialog", { name: /Copiar JSON de tarefas/i })).toBeVisible();
  await checkA11y(page);
  await page.getByRole("button", { name: /Cancelar/i }).click();

  await page.getByRole("tab", { name: /Registrar Tempo/i }).click();
  await expect(page.getByTestId("time-entries-json")).toBeVisible();
  await checkA11y(page);
});

test("privacy dialog and 404 screen have no automated accessibility violations", async ({ page }) => {
  await page.getByRole("button", { name: /Aviso de Privacidade/i }).click();
  await expect(page.getByRole("dialog", { name: /Aviso de Privacidade LGPD/i })).toBeVisible();
  await checkA11y(page);

  await page.keyboard.press("Escape");
  await page.goto(new URL("rota-inexistente", base).toString(), { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await checkA11y(page);
});

test("features page has no automated accessibility violations", async ({ page }) => {
  await page.goto(new URL("features", base).toString(), { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Sobre \/ Features/i })).toBeVisible();
  await checkA11y(page);
});

test("Redmine automation panel has no automated accessibility violations", async ({ page }) => {
  await page.route("**/api/redmine/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      configured: true,
      connected: true,
      message: "Conexão segura com o Redmine validada.",
      account: { id: 388, login: "danilo.catapan", name: "Danilo Catapan" },
      project: { id: 333, name: "Maestro Cloud BB Corretora" },
      trackers: [], statuses: [], activities: [], versions: [],
    }),
  }));
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("checkbox", { name: /Li o Aviso de Privacidade/i }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "redmine-a11y.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sampleCsv, "utf8"),
  });
  await page.getByRole("tab", { name: /Automatizar/i }).click();
  await expect(page.getByTestId("redmine-automation-panel")).toBeVisible();
  await checkA11y(page);
});
