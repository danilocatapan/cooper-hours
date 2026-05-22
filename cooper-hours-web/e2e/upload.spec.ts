import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const base = process.env.E2E_BASE_URL || 'http://localhost:3000/cooper-hours/';
const testDir = path.dirname(fileURLToPath(import.meta.url));

test.beforeEach(async ({ page }) => {
  await page.goto(base, { waitUntil: 'networkidle' });
});

test('initial screen is usable and free of legacy debug hooks', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /lançamento de horas/i })).toBeVisible();
  await expect(page.getByText('Upload CSV')).toBeVisible();
  await expect(page.getByText('Como usar')).toBeVisible();
  await expect(page.getByText(/Faça upload de um arquivo CSV/i)).toBeVisible();

  const logoResponse = await page.request.get(new URL('assets/coopersystem-logo.svg', base).toString());
  expect(logoResponse.ok()).toBeTruthy();

  const removedDebugNamespace = `${String.fromCharCode(95, 95)}${String.fromCharCode(109, 97, 110, 117, 115)}${String.fromCharCode(95, 95)}`;
  const debugScripts = await page.locator(`script[src*="${removedDebugNamespace}"]`).count();
  expect(debugScripts).toBe(0);

  const debugEndpoint = await page.request.get(new URL(`${removedDebugNamespace}/debug-collector.js`, base).toString());
  expect(debugEndpoint.headers()['content-type']).toContain('text/html');
  expect(await debugEndpoint.text()).not.toContain('Debug Collector initialized');
});

test('instructions can be hidden', async ({ page }) => {
  await page.getByRole('button', { name: /Entendi, esconder instruções/i }).click();
  await expect(page.getByText('Como usar')).toBeHidden();
  await expect(page.getByText(/Faça upload de um arquivo CSV/i)).toBeVisible();
});

test('upload CSV and show full report flow', async ({ page }) => {
  const filePath = path.join(testDir, 'fixtures', 'sample.csv');
  await page.locator('input[type="file"]').setInputFiles(filePath);

  await expect(page.getByText('Arquivo processado com sucesso')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Total de Horas')).toBeVisible();
  await expect(page.getByText('8.0h')).toHaveCount(3);
  await expect(page.getByText('Dias Registrados')).toBeVisible();
  await expect(page.getByText('quarta-feira, 1 de abril de 2026')).toBeVisible();
  await expect(page.getByText('No horário')).toBeVisible();
  await expect(page.getByText('Tarefa A')).toBeVisible();
  await expect(page.getByText('Tarefa B')).toBeVisible();
  await expect(page.getByText('Todos os Dias')).toBeVisible();
  await expect(page.getByText('01/04/2026')).toBeVisible();
});

test('invalid CSV shows a clear error without report leftovers', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Coluna A,Coluna B\nvalor,1'),
  });

  await expect(page.getByText(/Colunas obrigatórias não encontradas/i)).toBeVisible();
  await expect(page.getByText('Resumo Geral')).toBeHidden();
});

test('404 route is accessible and returns home', async ({ page }) => {
  await page.goto(new URL('rota-inexistente', base).toString(), { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.getByText('Page Not Found')).toBeVisible();

  await page.getByRole('button', { name: /Go Home/i }).click();
  await expect(page.getByText('Upload CSV')).toBeVisible();
});
