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

test("light, dark, and high contrast themes have no automated accessibility violations", async ({ page }) => {
  for (const themeName of ["Claro", "Escuro", "Alto contraste"]) {
    await page.getByRole("button", { name: `Usar tema ${themeName}` }).click();
    await checkA11y(page);
  }
});

test("CSV format dialog has no automated accessibility violations", async ({ page }) => {
  await page.getByRole("button", { name: /Formato do arquivo/i }).click();
  await expect(page.getByRole("dialog", { name: /Formato do arquivo CSV/i })).toBeVisible();
  await checkA11y(page);
});

test("report, Cesis steps and direct copy have no automated accessibility violations", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("checkbox", { name: /Entendi o processamento local/i }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "a11y.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sampleCsv, "utf8"),
  });

  await expect(page.getByText("Conferência do período")).toBeVisible();
  await checkA11y(page);

  await page.getByTestId("workflow-step-tasks").click();
  await expect(page.getByTestId("tasks-message")).toBeVisible();
  await checkA11y(page);

  await page.getByLabel("Sprint/Versão (fixed_version_name)").fill("SPRINT 113");
  await page.getByRole("checkbox", { name: /Revisei projeto, responsável, status e sprint\/versão/i }).click();
  await page.getByRole("button", { name: "Copiar tarefas", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await checkA11y(page);

  await page.getByTestId("workflow-step-map").click();
  await expect(page.getByTestId("time-entries-message")).toBeVisible();
  await checkA11y(page);
});

test("privacy dialog and 404 screen have no automated accessibility violations", async ({ page }) => {
  await page.getByRole("button", { name: /Privacidade e processamento local/i }).click();
  await expect(page.getByRole("dialog", { name: /Privacidade e processamento local/i })).toBeVisible();
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
