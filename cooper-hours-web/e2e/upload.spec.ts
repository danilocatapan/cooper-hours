import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const base = process.env.E2E_BASE_URL || 'http://localhost:3000/cooper-hours/';
const testDir = path.dirname(fileURLToPath(import.meta.url));

test.beforeEach(async ({ page }) => {
  await page.goto(base, { waitUntil: 'networkidle' });
  const privacyCheckbox = page.getByRole('checkbox', { name: /Entendi o processamento local/i });
  if (await privacyCheckbox.isVisible()) {
    await privacyCheckbox.click();
  }
});

const buildCsv = (rows: string[]) => [
  'Usuário\tID do cartão\tTítulo\tEtiquetas\tData\tTempo registrado soma',
  ...rows,
].join('\n');

const row = (date: string, hours: string, title = `Tarefa ${date}`) =>
  `Usuario Teste\t${date.replaceAll('-', '')}\t${title}\t"tag"\t${date}\t${hours}`;

function parsePayloadFromMessage(message: string | null): unknown {
  const match = message?.match(/INÍCIO DO PAYLOAD JSON\s*([\s\S]*?)\s*FIM DO PAYLOAD JSON/);
  expect(match, 'a mensagem deve conter um payload JSON delimitado').not.toBeNull();
  return JSON.parse(match![1]);
}

test('initial screen is usable and free of legacy debug hooks', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Conferir e preparar lançamento de horas/i })).toBeVisible();
  await expect(page.getByText('Importar CSV do BusinessMap')).toBeVisible();
  await expect(page.getByText(/Nenhum lançamento é enviado automaticamente/i)).toBeVisible();
  await expect(page.getByText('Como a conferência funciona')).toBeVisible();
  await expect(page.getByText(/Importe o CSV para começar/i)).toBeVisible();
  await expect(page.getByText('Onde obtenho este CSV?')).toBeVisible();
  await expect(page.getByText('Processamento local confirmado.')).toBeVisible();
  await page.getByText('Onde obtenho este CSV?').click();
  await expect(page.getByText(/Exporte no BusinessMap um CSV do período desejado/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Formato do arquivo/i })).toBeVisible();

  const logoResponse = await page.request.get(new URL('assets/coopersystem-logo.svg', base).toString());
  expect(logoResponse.ok()).toBeTruthy();

  const removedDebugNamespace = `${String.fromCharCode(95, 95)}${String.fromCharCode(109, 97, 110, 117, 115)}${String.fromCharCode(95, 95)}`;
  const debugScripts = await page.locator(`script[src*="${removedDebugNamespace}"]`).count();
  expect(debugScripts).toBe(0);

  const debugEndpoint = await page.request.get(new URL(`${removedDebugNamespace}/debug-collector.js`, base).toString());
  expect(debugEndpoint.headers()['content-type']).toContain('text/html');
  expect(await debugEndpoint.text()).not.toContain('Debug Collector initialized');
});

test('rendered Portuguese text is free of mojibake artifacts', async ({ page }) => {
  const visibleText = await page.locator('body').innerText();
  expect(visibleText).not.toMatch(/[ÃÂ�]|â€”|â†’|Ã§|Ã£|Ã¡|Ã©|Ã­|Ã³|Ãº/);
  await expect(page.getByRole('heading', { name: /Conferir e preparar lançamento de horas/i })).toBeVisible();
  await expect(page.getByText(/Importe o CSV para começar/i)).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(path.join(testDir, 'fixtures', 'sample.csv'));
  await expect(page.getByText('Conferência do período')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0);
  const reportText = await page.locator('body').innerText();
  expect(reportText).not.toMatch(/[ÃÂ�]|â€”|â†’|Ã§|Ã£|Ã¡|Ã©|Ã­|Ã³|Ãº/);
});

test('CSV format instructions open in a readable modal', async ({ page }) => {
  await page.getByRole('button', { name: /Formato do arquivo/i }).click();
  await expect(page.getByRole('dialog', { name: /Formato do arquivo CSV/i })).toBeVisible();
  await expect(page.getByText('Campos obrigatórios:')).toBeVisible();
  await expect(page.getByText('Exemplo de CSV:')).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Formato do arquivo CSV/i }).getByText('Tempo registrado soma', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('csv-format-example')).toBeVisible();
});

test('upload control is keyboard accessible and exposes workflow progress', async ({ page }) => {
  const filePath = path.join(testDir, 'fixtures', 'sample.csv');
  const uploadButton = page.getByRole('button', { name: /Selecionar CSV/i });

  await expect(uploadButton).toBeVisible();
  await expect(uploadButton).toBeEnabled();
  await uploadButton.focus();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  const chooser = await chooserPromise;
  await chooser.setFiles(filePath);

  await expect(page.getByText('Arquivo analisado com sucesso')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('navigation', { name: /Etapas para preparar o lançamento na Cesis/i })).toBeVisible();
  await expect(page.getByTestId('workflow-step-conference')).toContainText('Conferir horas');
  await expect(page.getByTestId('workflow-step-copy')).toContainText('Copiar lançamento final');
  await expect(page.getByRole('button', { name: /Continuar para conferência/i })).toBeVisible();
});

test('privacy notice is demonstrative, local, and free of institutional placeholders', async ({ page }) => {
  await page.getByRole('button', { name: /Privacidade e processamento local/i }).click();
  const dialog = page.getByRole('dialog', { name: /Privacidade e processamento local/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/ferramenta demonstrativa e independente/i)).toBeVisible();
  await expect(dialog.getByText(/não representa uma política oficial/i)).toBeVisible();
  await expect(dialog.getByText(/não substitui orientações institucionais/i)).toBeVisible();
  await expect(dialog).not.toContainText('PLACEHOLDER');
  await expect(dialog.getByRole('button', { name: 'Fechar' })).toBeVisible();
});

test('workflow steps navigate, focus their targets, and reflect completed current outputs', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('input[type="file"]').setInputFiles(path.join(testDir, 'fixtures', 'sample.csv'));

  await page.getByRole('button', { name: /Continuar para conferência/i }).click();
  await expect(page.locator('#conference-panel')).toBeFocused();

  const tasksStep = page.getByTestId('workflow-step-tasks');
  await expect(tasksStep).toContainText('Disponível');
  await tasksStep.click();
  await expect(page.locator('#tasks-panel')).toBeFocused();
  await expect(page.getByRole('heading', { name: /Preparar tarefas/i })).toBeVisible();

  await page.getByLabel('Sprint/Versão (fixed_version_name)').fill('SPRINT 113');
  await page.getByRole('checkbox', { name: /Revisei projeto, responsável, status e sprint\/versão/i }).click();
  await page.getByRole('button', { name: 'Copiar tarefas', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Crie ou reutilize para mim, no Redmine');
  await expect(tasksStep).toContainText('Concluída');

  await page.getByLabel('Projeto (project_id)').fill('334');
  await expect(tasksStep).toContainText('Disponível');

  const mapStep = page.getByTestId('workflow-step-map');
  await mapStep.click();
  await expect(page.locator('#cecis-mapping')).toBeFocused();
  await page.getByTestId('cecis-response').fill([
    'ID 291631 — Tarefa A — tracker: Desenvolvimento (5)',
    'ID 291632 — Tarefa B — tracker: Desenvolvimento (5)',
  ].join('\n'));
  await page.getByRole('button', { name: 'Mapear IDs', exact: true }).click();
  await expect(mapStep).toContainText('Concluída');

  const copyStep = page.getByTestId('workflow-step-copy');
  await expect(copyStep).toContainText('Disponível');
  await copyStep.click();
  await expect(page.locator('#time-entries-output')).toBeFocused();
  await page.locator('#time-entries-output').getByRole('button', { name: 'Copiar lançamento final', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Agora registre no Redmine as horas');
  await expect(copyStep).toContainText('Concluída');
  await expect(page.getByText(/Preparação concluída/i)).toBeVisible();
});

test('Redmine context explains defaults and requires a fresh confirmation after critical changes', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(path.join(testDir, 'fixtures', 'sample.csv'));
  await page.getByTestId('workflow-step-tasks').click();

  await expect(page.getByRole('heading', { name: 'Contexto de lançamento no Redmine' })).toBeVisible();
  await expect(page.getByText('Maestro Cloud BB Corretora', { exact: true })).toBeVisible();
  await expect(page.getByText('Danilo Rodrigues Catapan', { exact: true })).toBeVisible();
  await expect(page.getByText('Em execução', { exact: true })).toBeVisible();
  await expect(page.getByText('Normalmente atualizada a cada 15 dias', { exact: true })).toBeVisible();

  const sprintInput = page.getByLabel('Sprint/Versão (fixed_version_name)');
  const confirmation = page.getByRole('checkbox', { name: /Revisei projeto, responsável, status e sprint\/versão/i });
  const copyButton = page.getByRole('button', { name: 'Copiar tarefas', exact: true });

  await expect(sprintInput).toHaveValue('');
  await expect(sprintInput).toHaveAttribute('placeholder', 'Ex.: SPRINT 113');
  await expect(page.getByText('Preenchimento obrigatório', { exact: true })).toBeVisible();
  await expect(copyButton).toBeDisabled();

  await sprintInput.fill('SPRINT 113');
  await confirmation.click();
  await expect(copyButton).toBeEnabled();

  await page.getByLabel('Projeto (project_id)').fill('334');
  await expect(confirmation).not.toBeChecked();
  await expect(page.getByText('Valor personalizado', { exact: true })).toBeVisible();
  await expect(page.getByText(/confirme o projeto no Redmine/i)).toBeVisible();
  await expect(copyButton).toBeDisabled();

  await confirmation.click();
  await expect(copyButton).toBeEnabled();
});

test('destructive and sensitive downloads require confirmation', async ({ page }) => {
  const csv = buildCsv([
    row('2026-04-01', '8.000', 'Tarefa válida'),
    'Usuario Teste\t102\tTarefa sem data\t"tag"\tdata-invalida\t2.000',
  ]);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'confirmations.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await page.getByRole('button', { name: /Baixar inconsistências/i }).click();
  await expect(page.getByRole('alertdialog', { name: /Baixar inconsistências do CSV/i })).toBeVisible();
  await page.getByRole('button', { name: /Cancelar/i }).click();
  await expect(page.getByText('Conferência do período')).toBeVisible();

  await page.getByRole('button', { name: /Baixar inconsistências/i }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar inconsistências', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^inconsistencias-csv-/);

  await page.getByRole('button', { name: /Limpar dados importados/i }).click();
  await expect(page.getByRole('alertdialog', { name: /Limpar todos os dados importados/i })).toBeVisible();
  await page.getByRole('button', { name: /Cancelar/i }).click();
  await expect(page.getByText('Conferência do período')).toBeVisible();

  await page.getByRole('button', { name: /Limpar dados importados/i }).click();
  await page.getByRole('button', { name: 'Limpar dados', exact: true }).click();
  await expect(page.getByText('Conferência do período')).toBeHidden();
  await expect(page.getByText(/Importe o CSV para começar/i)).toBeVisible();
});

test('conference day cards stay compact and consistent on desktop', async ({ page }) => {
  const filePath = path.join(testDir, 'fixtures', 'sample.csv');
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await expect(page.getByText('Conferência diária')).toBeVisible({ timeout: 5000 });

  const firstDayButton = page.locator('[data-calendar-date]').first();
  await expect(firstDayButton).toBeVisible();
  const box = await firstDayButton.boundingBox();

  expect(box).not.toBeNull();
  expect(box?.height).toBeGreaterThanOrEqual(80);
  expect(box?.height).toBeLessThanOrEqual(100);
  expect(box?.width).toBeGreaterThan(box?.height ?? 0);
});

test('upload button remains contained inside dropzone and handles long file names', async ({ page }) => {
  const dropzone = page.getByTestId('file-dropzone');
  const uploadButton = page.getByRole('button', { name: /Selecionar CSV/i });

  const dropboxBox = await dropzone.boundingBox();
  const buttonBox = await uploadButton.boundingBox();

  expect(dropboxBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(buttonBox!.x).toBeGreaterThanOrEqual(dropboxBox!.x);
  expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(dropboxBox!.x + dropboxBox!.width);

  await uploadButton.focus();
  await expect(uploadButton).toBeFocused();
});

test('CSV format modal does not overflow horizontally on desktop and mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: /Formato do arquivo/i }).click();
  const dialog = page.getByRole('dialog', { name: /Formato do arquivo CSV/i });
  await expect(dialog).toBeVisible();

  const desktopOverflow = await dialog.evaluate((dialogElement) => dialogElement.scrollWidth > dialogElement.clientWidth);
  expect(desktopOverflow).toBeFalsy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Formato do arquivo/i }).click();
  const mobileDialog = page.getByRole('dialog', { name: /Formato do arquivo CSV/i });
  const mobileOverflow = await mobileDialog.evaluate((dialogElement) => dialogElement.scrollWidth > dialogElement.clientWidth);
  expect(mobileOverflow).toBeFalsy();
});

test('footer Sobre link navigates to features page and shows current version', async ({ page }) => {
  const aboutLink = page.getByRole('link', { name: /Sobre/i });
  await expect(aboutLink).toBeVisible();
  await aboutLink.click();
  await expect(page).toHaveURL(/features/);
  await expect(page.getByRole('heading', { name: /Sobre \/ Features/i })).toBeVisible();
  await expect(page.getByText(/Versão 1\.0\.\d+/i)).toBeVisible();
});

test('theme switcher supports dark, light, and high contrast modes', async ({ page }) => {
  for (const themeName of ['Escuro', 'Claro', 'Alto contraste']) {
    const control = page.getByRole('button', { name: `Usar tema ${themeName}` });
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(40);
    expect(box!.height).toBeGreaterThanOrEqual(40);
  }

  await page.getByRole('button', { name: /Usar tema Claro/i }).click();
  await expect(page.locator('html')).toHaveClass(/light/);

  await page.getByRole('button', { name: /Usar tema Alto contraste/i }).click();
  await expect(page.locator('html')).toHaveClass(/contrast/);

  await page.getByRole('button', { name: /Usar tema Escuro/i }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('semantic status tokens meet readable contrast targets', async ({ page }) => {
  const results = await page.evaluate(() => {
    const hexToRgb = (hex: string) => {
      const clean = hex.trim().replace('#', '');
      const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6);
      return [0, 2, 4].map((idx) => parseInt(full.slice(idx, idx + 2), 16) / 255);
    };
    const luminance = (hex: string) => {
      const rgb = hexToRgb(hex).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    };
    const ratio = (fg: string, bg: string) => {
      const [lighter, darker] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
      return (lighter + 0.05) / (darker + 0.05);
    };
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue(name).trim();
    return [
      ['primary', token('--primary-foreground'), token('--primary')],
      ['success', token('--success'), token('--card')],
      ['warning', token('--warning'), token('--card')],
      ['danger', token('--danger'), token('--card')],
      ['selection', token('--selection'), token('--card')],
      ['holiday', token('--holiday-foreground'), token('--background')],
    ].map(([name, fg, bg]) => ({ name, value: ratio(fg, bg) }));
  });

  for (const result of results) {
    expect.soft(result.value, `${result.name} contrast`).toBeGreaterThanOrEqual(4.5);
  }
});

test('light theme primary action keeps AA contrast at rest, hover, and focus', async ({ page }) => {
  await page.getByRole('button', { name: /Usar tema Claro/i }).click();
  await page.locator('input[type="file"]').setInputFiles(path.join(testDir, 'fixtures', 'sample.csv'));
  await page.getByTestId('workflow-step-map').click();
  const action = page.getByRole('button', { name: 'Mapear IDs', exact: true });

  const contrast = async () => action.evaluate((element) => {
    const parse = (value: string) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
    const luminance = (value: string) => {
      const rgb = parse(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    };
    const styles = getComputedStyle(element);
    const values = [luminance(styles.color), luminance(styles.backgroundColor)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  });

  expect(await contrast()).toBeGreaterThanOrEqual(4.5);
  await action.hover();
  await page.waitForTimeout(250);
  expect(await contrast()).toBeGreaterThanOrEqual(4.5);
  await action.focus();
  expect(await contrast()).toBeGreaterThanOrEqual(4.5);
});

test('upload CSV and show full report flow', async ({ page }) => {
  const filePath = path.join(testDir, 'fixtures', 'sample.csv');
  await page.locator('input[type="file"]').setInputFiles(filePath);

  await expect(page.getByText('Arquivo analisado com sucesso')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Conferência do período')).toBeVisible();
  await expect(page.getByText('1/20 dias úteis fechados com 8h.')).toBeVisible();
  await expect(page.getByText('8.0h / 160.0h')).toBeVisible();
  await expect(page.getByText('Lançado / esperado')).toBeVisible();
  await expect(page.getByText('quarta-feira, 1 de abril de 2026')).toBeVisible();
  await expect(page.getByText('8.0h lançadas de 8.0h esperadas.')).toBeVisible();
  await expect(page.getByText('Tarefa A')).toBeVisible();
  await expect(page.getByText('Tarefa B')).toBeVisible();
  await expect(page.getByText('Conferência diária')).toBeVisible();
  await expect(page.getByRole('button', { name: /01\/04\/2026/i })).toBeVisible();
});

test('prepare tasks step generates the complete Cesis message with the exact batch JSON contract', async ({ page }) => {
  const csv = buildCsv([
    'Usuario Teste\t893566\tTarefa API\t"tag"\t2026-04-01\t5.000',
    'Usuario Teste\t987589\tTarefa UI\t"tag"\t2026-04-15\t3.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'tasks-contract.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await page.getByTestId('workflow-step-tasks').click();

  await page.getByLabel('Sprint/Versão (fixed_version_name)').fill('SPRINT 113');

  const messageText = await page.getByTestId('tasks-message').textContent();
  expect(messageText).toContain('Crie ou reutilize para mim, no Redmine');
  expect(messageText).toContain('bloqueie o lote inteiro');
  expect(messageText).toContain('resultado: CRIADA|REUTILIZADA');
  const json = parsePayloadFromMessage(messageText) as { action: string; tasks: Array<Record<string, unknown>> };

  expect(Object.keys(json)).toEqual(['action', 'tasks']);
  expect(json.action).toBe('create_tasks_batch');
  expect(json.tasks).toHaveLength(2);
  expect(Object.keys(json.tasks[0])).toEqual([
    'subject',
    'project_id',
    'assigned_to_id',
    'tracker_id',
    'start_date',
    'due_date',
    'status_id',
    'fixed_version_name',
    'description',
  ]);
  expect(json.tasks[0]).toMatchObject({
    project_id: 333,
    assigned_to_id: 388,
    tracker_id: 4,
    start_date: '2026-04-01',
    due_date: '2026-04-15',
    status_id: 3,
    fixed_version_name: 'SPRINT 113',
    description: 'Detalhes...',
  });
  expect(json.tasks.map((task: { subject: string }) => task.subject).sort()).toEqual(['Tarefa API', 'Tarefa UI']);
});

test('mapping step applies Cesis issue ids and generates the complete grouped-hours message', async ({ page }) => {
  const csv = buildCsv([
    'Usuario Teste\t893566\tMaestro-Refinamentos S2-Abr\t"tag"\t2026-04-14\t2.000',
    'Usuario Teste\t987589\tMaestro-Ritos (Daily, Planning, Review e Retro) S2-Abr\t"tag"\t2026-04-15\t6.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'time-contract.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await page.getByTestId('workflow-step-map').click();

  await expect(page.getByText('tarefa(s) pendente(s)')).toBeVisible();
  await expect(page.getByText(/Mapeie issue_id e activity_id de todas as tarefas/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar lançamento final', exact: true })).toBeDisabled();

  await page.getByTestId('cecis-response').fill([
    'Tarefas criadas com sucesso — 2 issues:',
    'ID 291631 — Maestro-Refinamentos S2-Abr — tracker: Análise e Refinamento (12)',
    'ID 291632 — Maestro-Ritos (Daily, Planning, Review e Retro) S2-Abr — tracker: Reuniões (21)',
  ].join('\n'));
  await page.getByRole('button', { name: 'Mapear IDs', exact: true }).click();

  await expect(page.getByText('issue_id 291631')).toBeVisible();
  await expect(page.getByText('issue_id 291632')).toBeVisible();

  const messageText = await page.getByTestId('time-entries-message').textContent();
  expect(messageText).toContain('tolerância de 0,01 hora');
  expect(messageText).toContain('IGNORADO_DUPLICADO');
  const json = parsePayloadFromMessage(messageText) as Array<Record<string, unknown>>;

  expect(Array.isArray(json)).toBeTruthy();
  expect(json).toHaveLength(2);
  expect(Object.keys(json[0])).toEqual([
    'issue_id',
    'hours',
    'spent_on',
    'activity_id',
    'comments',
  ]);
  expect(json).toEqual(expect.arrayContaining([
    {
      issue_id: 291631,
      hours: 2,
      spent_on: '2026-04-14',
      activity_id: 20,
      comments: '',
    },
    {
      issue_id: 291632,
      hours: 6,
      spent_on: '2026-04-15',
      activity_id: 10,
      comments: '',
    },
  ]));
});

test('time entries message blocks copying while any Cesis mapping is pending', async ({ page }) => {
  const csv = buildCsv([
    'Usuario Teste\t893566\tTarefa Mapeada\t"tag"\t2026-04-14\t2.000',
    'Usuario Teste\t987589\tTarefa Pendente\t"tag"\t2026-04-15\t6.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'partial-cecis-map.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await page.getByTestId('workflow-step-map').click();
  await page.getByTestId('cecis-response').fill('ID 291700 — Tarefa Mapeada — tracker: Manutenção (5)');
  await page.getByRole('button', { name: 'Mapear IDs', exact: true }).click();

  await expect(page.getByText(/Pendentes de issue_id: Tarefa Pendente/i)).toBeVisible();

  const messageText = await page.getByTestId('time-entries-message').textContent();
  const json = parsePayloadFromMessage(messageText) as Array<Record<string, unknown>>;

  expect(json).toEqual([{
    issue_id: 291700,
    hours: 2,
    spent_on: '2026-04-14',
    activity_id: 9,
    comments: '',
  }]);
  await expect(page.getByRole('button', { name: 'Copiar lançamento final', exact: true })).toBeDisabled();
});

test('time entries with the same issue, date and activity are grouped before copying', async ({ page }) => {
  const csv = buildCsv([
    'Usuario Teste\t1001\tTarefa Agrupada\t"tag"\t2026-04-14\t2.000',
    'Usuario Teste\t1002\tTarefa Agrupada\t"tag"\t2026-04-14\t3.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'grouped-hours.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });
  await page.getByTestId('workflow-step-map').click();
  await page.getByTestId('cecis-response').fill('ID 291800 — Tarefa Agrupada — tracker: Desenvolvimento (4) — resultado: REUTILIZADA');
  await page.getByRole('button', { name: 'Mapear IDs', exact: true }).click();

  const messageText = await page.getByTestId('time-entries-message').textContent();
  const payload = parsePayloadFromMessage(messageText);
  expect(payload).toEqual([{
    issue_id: 291800,
    hours: 5,
    spent_on: '2026-04-14',
    activity_id: 9,
    comments: '',
  }]);
  await expect(page.getByRole('button', { name: 'Copiar lançamento final', exact: true })).toBeEnabled();
});

test('task message blocks invalid identifiers, date ranges and normalized title collisions', async ({ page }) => {
  const invalidCsv = buildCsv([
    'Usuario Teste\t2001\tTarefa Válida\t"tag"\t2026-04-14\t8.000',
  ]);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid-task-defaults.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(invalidCsv, 'utf8'),
  });
  await page.getByTestId('workflow-step-tasks').click();
  await page.getByLabel('Projeto (project_id)').fill('0');
  await page.getByLabel('Início (start_date)').fill('2026-04-20');
  await page.getByLabel('Prazo (due_date)').fill('2026-04-15');

  await expect(page.getByText(/project_id deve ser um número inteiro positivo/i)).toBeVisible();
  await expect(page.getByText(/data de início não pode ser posterior ao prazo/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar tarefas', exact: true })).toBeDisabled();

  const collisionCsv = buildCsv([
    'Usuario Teste\t2002\tTarefa Ágil\t"tag"\t2026-04-14\t4.000',
    'Usuario Teste\t2003\ttarefa agil\t"tag"\t2026-04-14\t4.000',
  ]);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'normalized-title-collision.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(collisionCsv, 'utf8'),
  });
  await page.getByTestId('workflow-step-tasks').click();

  await expect(page.getByText(/Há títulos equivalentes após normalização/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar tarefas', exact: true })).toBeDisabled();
});

test('Cesis response mapping blocks ambiguous, reused and manually divergent issue ids', async ({ page }) => {
  const csv = buildCsv([
    'Usuario Teste\t3001\tTarefa A\t"tag"\t2026-04-14\t4.000',
    'Usuario Teste\t3002\tTarefa B\t"tag"\t2026-04-14\t4.000',
  ]);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'mapping-conflicts.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });
  await page.getByTestId('workflow-step-map').click();

  await page.getByTestId('cecis-response').fill([
    'ID 301000 — Tarefa A — tracker: Desenvolvimento (4)',
    'ID 301000 — Tarefa B — tracker: Desenvolvimento (4)',
    'ID 301999 — Tarefa desconhecida — tracker: Desenvolvimento (4)',
  ].join('\n'));
  await page.getByRole('button', { name: 'Mapear IDs', exact: true }).click();
  await expect(page.getByText(/Conflitos na resposta da Cesis: Tarefa A; Tarefa B/i)).toBeVisible();
  await expect(page.getByText(/Títulos não reconhecidos.*Tarefa desconhecida/i)).toBeVisible();

  await page.getByTestId('cecis-response').fill([
    'ID 302000 — Tarefa A — tracker: Desenvolvimento (4)',
    'ID 302001 — Tarefa A — tracker: Desenvolvimento (4)',
    'ID 302002 — Tarefa B — tracker: Desenvolvimento (4)',
  ].join('\n'));
  await page.getByRole('button', { name: 'Mapear IDs', exact: true }).click();
  await expect(page.getByText(/Conflitos na resposta da Cesis: Tarefa A/i)).toBeVisible();

  await page.getByTestId('workflow-step-tasks').click();
  await page.getByLabel(/ID da tarefa na Cesis.*issue_id/i).first().fill('303000');
  await page.getByTestId('workflow-step-map').click();
  await page.getByTestId('cecis-response').fill([
    'ID 303001 — Tarefa A — tracker: Desenvolvimento (4)',
    'ID 303002 — Tarefa B — tracker: Desenvolvimento (4)',
  ].join('\n'));
  await page.getByRole('button', { name: 'Mapear IDs', exact: true }).click();

  await expect(page.getByText(/Conflitos na resposta da Cesis: Tarefa A/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar lançamento final', exact: true })).toBeDisabled();
});

test('all days remain navigable when CSV has more than five days', async ({ page }) => {
  const rows = Array.from({ length: 7 }, (_, idx) => {
    const day = String(idx + 1).padStart(2, '0');
    return `Usuario Teste\t${900 + idx}\tTarefa ${idx + 1}\t"tag"\t2026-04-${day}\t8.000`;
  });

  await page.locator('input[type="file"]').setInputFiles({
    name: 'seven-days.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildCsv(rows), 'utf8'),
  });

  await expect(page.getByText('4/20 dias úteis fechados com 8h.')).toBeVisible();
  await page.getByRole('button', { name: /01\/04\/2026/i }).click();
  await expect(page.getByText('quarta-feira, 1 de abril de 2026')).toBeVisible();
  await expect(page.getByText('Tarefa 1')).toBeVisible();
});

test('below and above target statuses are clearly differentiated', async ({ page }) => {
  const csv = buildCsv([
    'Usuario Teste\t101\tTarefa curta\t"tag"\t2026-04-01\t7.000',
    'Usuario Teste\t102\tTarefa longa\t"tag"\t2026-04-02\t9.000',
    'Usuario Teste\t103\tTarefa exata\t"tag"\t2026-04-06\t8.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'statuses.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await page.getByRole('button', { name: /01\/04\/2026/i }).click();
  await expect(page.getByRole('button', { name: /01\/04\/2026/i })).toHaveClass(/border-selection/);
  await expect(page.getByRole('button', { name: /01\/04\/2026/i })).toHaveClass(/bg-danger\/10/);
  await expect(page.getByText('Pendente: faltam 1.0h')).toBeVisible();
  await page.getByRole('button', { name: /02\/04\/2026/i }).click();
  await expect(page.getByRole('button', { name: /02\/04\/2026/i })).toHaveClass(/border-selection/);
  await expect(page.getByRole('button', { name: /02\/04\/2026/i })).toHaveClass(/bg-warning\/10/);
  await expect(page.getByRole('button', { name: /06\/04\/2026/i })).toHaveClass(/border-success\/30/);
  await expect(page.getByRole('button', { name: /06\/04\/2026/i })).toHaveClass(/bg-success\/10/);
  await expect(page.getByText('Acima da meta: +1.0h')).toBeVisible();
  await expect(page.getByText('1/20 dias úteis fechados com 8h.')).toBeVisible();
});

test('mobile layout keeps calendar and CSV modal within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const csv = buildCsv([
    row('2026-04-01', '7.000', 'Mobile pendente'),
    row('2026-04-02', '8.000', 'Mobile completo'),
    row('2026-04-03', '9.000', 'Mobile acima'),
    row('2026-04-06', '8.000', 'Mobile extra 1'),
    row('2026-04-07', '8.000', 'Mobile extra 2'),
    row('2026-04-08', '8.000', 'Mobile extra 3'),
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'mobile.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await expect(page.getByText('Conferência diária')).toBeVisible();
  await expect(page.getByRole('button', { name: /01\/04\/2026/i })).toBeVisible();

  let hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);

  await page.getByRole('button', { name: /Formato do arquivo/i }).click();
  const dialog = page.getByRole('dialog', { name: /Formato do arquivo CSV/i });
  await expect(dialog).toBeVisible();

  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(390);

  hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);
});

test('layout reflows at a viewport equivalent to 200 percent zoom', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 720 });
  await page.locator('input[type="file"]').setInputFiles(path.join(testDir, 'fixtures', 'sample.csv'));

  for (const step of ['conference', 'tasks', 'map'] as const) {
    await page.getByTestId(`workflow-step-${step}`).click();
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasHorizontalOverflow, `${step} should reflow without global horizontal scrolling`).toBe(false);
  }

  await page.getByTestId('workflow-step-map').click();
  const helpFontSize = await page.locator('#cecis-response-help').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(helpFontSize).toBeGreaterThanOrEqual(14);
});

test('partially invalid CSV shows ignored-line feedback', async ({ page }) => {
  const csv = buildCsv([
    'Usuario Teste\t101\tTarefa válida\t"tag"\t2026-04-01\t8.000',
    'Usuario Teste\t102\tTarefa sem data\t"tag"\tdata-invalida\t2.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'partial.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await expect(page.getByText(/1 linha\(s\) foram ignoradas/i)).toBeVisible();
  await expect(page.getByText('1/20 dias úteis fechados com 8h.')).toBeVisible();
});

test('report layout keeps issue actions contained and calendar days roomy', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });

  const csv = buildCsv([
    row('2026-04-01', '8.000', 'Dia completo'),
    'Usuario Teste\t102\tTarefa sem data\t"tag"\tdata-invalida\t2.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'layout-invalid-line.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  const issuesPanel = page.locator('details').filter({ hasText: /Inconsistências do CSV/i });
  await expect(issuesPanel).toBeVisible();

  const downloadIssuesButton = page.getByRole('button', { name: /Baixar inconsistências/i });
  await expect(downloadIssuesButton).toBeVisible();

  const issuesBox = await issuesPanel.boundingBox();
  const buttonBox = await downloadIssuesButton.boundingBox();
  expect(issuesBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(buttonBox!.x).toBeGreaterThanOrEqual(issuesBox!.x);
  expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(issuesBox!.x + issuesBox!.width + 1);

  const dayButton = page.getByRole('button', { name: /01\/04\/2026/i });
  await expect(dayButton).toBeVisible();
  const dayBox = await dayButton.boundingBox();
  expect(dayBox).not.toBeNull();
  expect(dayBox!.width).toBeGreaterThanOrEqual(96);
  expect(dayBox!.height).toBeGreaterThanOrEqual(80);
  expect(dayBox!.height).toBeLessThanOrEqual(100);
  expect(dayBox!.width).toBeGreaterThan(dayBox!.height);

  await page.getByTestId('workflow-step-tasks').click();
  await expect(page.getByTestId('tasks-message')).toBeVisible();

  await page.getByTestId('workflow-step-map').click();
  await expect(page.getByTestId('time-entries-message')).toBeVisible();

  await page.getByTestId('workflow-step-conference').click();
  await expect(page.getByText('Conferência diária')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);
});

test('drag and drop uploads a CSV', async ({ page }) => {
  const filePath = path.join(testDir, 'fixtures', 'sample.csv');
  await page.getByTestId('file-dropzone').dispatchEvent('drop', {
    dataTransfer: await page.evaluateHandle((fixturePath) => {
      const dataTransfer = new DataTransfer();
      const file = new File([
        'Usuário\tID do cartão\tTítulo\tEtiquetas\tData\tTempo registrado soma\nUsuario Teste\t1\tTarefa drop\t"tag"\t2026-04-01\t8.000',
      ], fixturePath.split(/[\\/]/).pop() || 'sample.csv', { type: 'text/csv' });
      dataTransfer.items.add(file);
      return dataTransfer;
    }, filePath),
  });

  await expect(page.getByText('Arquivo analisado com sucesso')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Tarefa drop')).toBeVisible();
});

test('minimum imported value is shown as pending with the missing balance', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'minimum.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildCsv([
      row('2026-04-01', '0.500', 'Ajuste mínimo'),
    ]), 'utf8'),
  });

  await expect(page.getByText('0/20 dias úteis fechados com 8h.')).toBeVisible();
  await expect(page.getByText('0.5h / 160.0h')).toBeVisible();
  await expect(page.getByText('19 dia(s) sem lançamento.')).toBeVisible();
  await expect(page.getByRole('button', { name: /02\/04\/2026/i })).toBeVisible();
  await expect(page.getByText('Pendente: faltam 7.5h').first()).toBeVisible();
  await expect(page.getByText('Ajuste mínimo')).toBeVisible();
});

test('median values on scattered days during one month are imported and displayed', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'scattered-days.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildCsv([
      row('2026-04-06', '4.000', 'Início parcial'),
      row('2026-04-15', '8.000', 'Meio do mês completo'),
      row('2026-04-27', '6.500', 'Fim parcial'),
    ]), 'utf8'),
  });

  await expect(page.getByText('1/20 dias úteis fechados com 8h.')).toBeVisible();
  await expect(page.getByText('18.5h / 160.0h')).toBeVisible();
  await page.getByRole('button', { name: /06\/04\/2026/i }).click();
  await expect(page.getByText('Pendente: faltam 4.0h')).toBeVisible();
  await page.getByRole('button', { name: /27\/04\/2026/i }).click();
  await expect(page.getByText('Pendente: faltam 1.5h').first()).toBeVisible();

  await page.getByRole('button', { name: /15\/04\/2026/i }).click();
  await expect(page.getByText('quarta-feira, 15 de abril de 2026')).toBeVisible();
  await expect(page.getByText('Meio do mês completo')).toBeVisible();
});

test('whole month import displays every day and the full expected total', async ({ page }) => {
  const rows = Array.from({ length: 30 }, (_, idx) => {
    const day = String(idx + 1).padStart(2, '0');
    return row(`2026-04-${day}`, '8.000', `Dia ${day}`);
  });

  await page.locator('input[type="file"]').setInputFiles({
    name: 'whole-month.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildCsv(rows), 'utf8'),
  });

  await expect(page.getByText('20/20 dias úteis fechados com 8h.')).toBeVisible();
  await expect(page.getByText('240.0h / 160.0h')).toBeVisible();
  await expect(page.getByText(/sábado\/domingo foram importados/i)).toBeVisible();
  await page.getByRole('button', { name: /01\/04\/2026/i }).click();
  await expect(page.getByText('quarta-feira, 1 de abril de 2026')).toBeVisible();
  await expect(page.getByText('Dia 01')).toBeVisible();
});

test('weekend records are displayed as optional overtime', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'weekend.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildCsv([
      row('2026-04-04', '3.000', 'Plantão sábado'),
    ]), 'utf8'),
  });

  await expect(page.getByText('0/20 dias úteis fechados com 8h.')).toBeVisible();
  await expect(page.getByText('3.0h / 160.0h')).toBeVisible();
  await expect(page.getByText(/sábado\/domingo foram importados/i)).toBeVisible();
  await expect(page.getByText('Hora extra, não obrigatória.')).toBeVisible();
  await expect(page.getByText('Plantão sábado')).toBeVisible();
});

test('national holiday without time is highlighted and excluded from missing days', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'holiday-empty.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildCsv([
      row('2026-04-01', '8.000', 'Dia útil completo'),
    ]), 'utf8'),
  });

  await expect(page.getByText('1/20 dias úteis fechados com 8h.')).toBeVisible();
  await expect(page.getByText('19 dia(s) sem lançamento.')).toBeVisible();

  const holiday = page.getByRole('button', { name: /03\/04\/2026 0\.0h feriado nacional Paixão de Cristo/i });
  await expect(holiday).toBeVisible();
  await expect(holiday).toHaveClass(/bg-holiday-surface/);
  await expect(holiday).not.toContainText('Paixão de Cristo');
  await holiday.hover();
  await expect(page.getByRole('tooltip')).toContainText('Paixão de Cristo');

  await holiday.click();
  await expect(page.getByText('Paixão de Cristo. Sem lançamento obrigatório.')).toBeVisible();
  await expect(page.getByText('Feriado nacional identificado automaticamente e fora da meta obrigatória de 8h.')).toBeVisible();
  await expect(page.getByText('Sem registro no CSV.')).toBeHidden();
});

test('national holiday with time stays outside the required target', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'holiday-with-time.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildCsv([
      row('2026-04-01', '8.000', 'Dia útil completo'),
      row('2026-04-03', '4.000', 'Apoio no feriado'),
    ]), 'utf8'),
  });

  await expect(page.getByText('1/20 dias úteis fechados com 8h.')).toBeVisible();
  await expect(page.getByText('12.0h / 160.0h')).toBeVisible();

  await page.getByRole('button', { name: /03\/04\/2026 4\.0h feriado nacional Paixão de Cristo/i }).click();
  await expect(page.getByText('4.0h lançadas de 0.0h esperadas.')).toBeVisible();
  await expect(page.getByText('Feriado: Paixão de Cristo')).toBeVisible();
  await expect(page.getByText('Apoio no feriado')).toBeVisible();
});

test('duplicate records are ignored and reported', async ({ page }) => {
  const duplicated = row('2026-04-01', '4.000', 'Tarefa duplicada');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'duplicates.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildCsv([
      duplicated,
      duplicated,
      row('2026-04-01', '4.000', 'Complemento válido'),
    ]), 'utf8'),
  });

  await expect(page.getByText(/1 registro\(s\) duplicado\(s\)/i)).toBeVisible();
  await expect(page.getByText('8.0h lançadas de 8.0h esperadas.')).toBeVisible();
  await expect(page.getByText('Tarefa duplicada')).toBeVisible();
  await expect(page.getByText('Complemento válido')).toBeVisible();
});

test('semicolon CSV supports decimal comma and separators inside quoted fields', async ({ page }) => {
  const csv = [
    'Usuário;ID do cartão;Título;Etiquetas;Data;Tempo registrado soma',
    'Usuario Teste;1;"Reunião, alinhamento";"tag;interna";2026-04-01;5,5',
    'Usuario Teste;2;"Execução; entrega";"tag;externa";2026-04-01;2,5',
  ].join('\n');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'semicolon-decimal.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await expect(page.getByText('1/20 dias úteis fechados com 8h.')).toBeVisible();
  await expect(page.getByText('Reunião, alinhamento')).toBeVisible();
  await expect(page.getByText('Execução; entrega')).toBeVisible();
  await expect(page.getByText('8.0h lançadas de 8.0h esperadas.')).toBeVisible();
});

test('CSV with more than one user is rejected', async ({ page }) => {
  const csv = buildCsv([
    row('2026-04-01', '8.000', 'Tarefa Usuario Teste'),
    'Maria\t20260402\tTarefa Maria\t"tag"\t2026-04-02\t8.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'multi-user.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await expect(page.getByText(/mais de um usuário/i)).toBeVisible();
  await expect(page.getByText('Conferência do período')).toBeHidden();
});

test('CSV with records from more than one month is rejected', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'multi-month.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildCsv([
      row('2026-04-30', '8.000', 'Fechamento abril'),
      row('2026-05-01', '8.000', 'Abertura maio'),
    ]), 'utf8'),
  });

  await expect(page.getByText(/mais de um mês/i)).toBeVisible();
  await expect(page.getByText('Conferência do período')).toBeHidden();
});

test('invalid CSV shows a clear error without report leftovers', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Coluna A,Coluna B\nvalor,1'),
  });

  await expect(page.getByText(/Colunas obrigatórias não encontradas/i)).toBeVisible();
  await expect(page.getByText('Conferência do período')).toBeHidden();
});

test('404 route is accessible and returns home', async ({ page }) => {
  await page.goto(new URL('rota-inexistente', base).toString(), { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.getByText('Página não encontrada')).toBeVisible();

  await page.getByRole('button', { name: /Voltar para o início/i }).click();
  await expect(page.getByText('Importar CSV do BusinessMap')).toBeVisible();
});
