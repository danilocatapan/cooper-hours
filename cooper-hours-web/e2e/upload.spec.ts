import { test, expect } from '@playwright/test';
import path from 'path';

test('upload CSV and show report summary', async ({ page }) => {
  // Serve the built site via file:// (assumes build output will be served by Pages in CI)
  // In CI we will run the serverless build preview; here we test the built index.html path if needed.

  // Navigate to the base URL provided by CI (will be http://localhost:3000 in preview jobs)
  const base = process.env.E2E_BASE_URL || 'http://localhost:3000';
  await page.goto(base, { waitUntil: 'networkidle' });

  // Ensure Upload area exists
  await expect(page.locator('text=Upload CSV')).toBeVisible();

  // Upload sample CSV
  const filePath = path.join(__dirname, 'fixtures', 'sample.csv');
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(filePath);

  // Wait for success message
  await expect(page.locator('text=Arquivo processado com sucesso')).toBeVisible({ timeout: 5000 });

  // Check that summary shows total hours
  await expect(page.locator('text=Total de Horas')).toBeVisible();
});
