import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const base = process.env.E2E_BASE_URL || 'http://localhost:3000/cooper-hours/';
const testDir = path.dirname(fileURLToPath(import.meta.url));

test.beforeEach(async ({ page }) => {
  await page.goto(base, { waitUntil: 'networkidle' });
});

const buildCsv = (rows: string[]) => [
  'Usuário\tID do cartão\tTítulo\tEtiquetas\tData\tTempo registrado soma',
  ...rows,
].join('\n');

const row = (date: string, hours: string, title = `Tarefa ${date}`) =>
  `Danilo\t${date.replaceAll('-', '')}\t${title}\t"tag"\t${date}\t${hours}`;

test('initial screen is usable and free of legacy debug hooks', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /validação diária de 8h/i })).toBeVisible();
  await expect(page.getByText('Validar lançamento diário de 8h')).toBeVisible();
  await expect(page.getByText('Como a validação funciona')).toBeVisible();
  await expect(page.getByText(/Envie o CSV para começar/i)).toBeVisible();
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

test('CSV format instructions open in a readable modal', async ({ page }) => {
  await page.getByRole('button', { name: /Formato do arquivo/i }).click();
  await expect(page.getByRole('dialog', { name: /Formato do arquivo CSV/i })).toBeVisible();
  await expect(page.getByText('Campos obrigatórios:')).toBeVisible();
  await expect(page.getByText('Exemplo de CSV:')).toBeVisible();
  await expect(page.getByText('Tempo registrado soma').first()).toBeVisible();
  await expect(page.getByTestId('csv-format-example')).toBeVisible();
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

test('create tasks tab generates the exact batch JSON contract', async ({ page }) => {
  const csv = buildCsv([
    'Danilo\t893566\tTarefa API\t"tag"\t2026-04-01\t5.000',
    'Danilo\t987589\tTarefa UI\t"tag"\t2026-04-15\t3.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'tasks-contract.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await expect(page.getByRole('tab', { name: /Criar Tarefas/i })).toBeVisible();
  await page.getByRole('tab', { name: /Criar Tarefas/i }).click();

  const jsonText = await page.getByTestId('tasks-json').textContent();
  const json = JSON.parse(jsonText || '');

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
    tracker_id: 5,
    start_date: '2026-04-01',
    due_date: '2026-04-15',
    status_id: 3,
    fixed_version_name: 'SPRINT 103',
    description: 'Detalhes...',
  });
  expect(json.tasks.map((task: { subject: string }) => task.subject).sort()).toEqual(['Tarefa API', 'Tarefa UI']);
});

test('time entries tab maps Cecis issue ids and generates the manual array JSON contract', async ({ page }) => {
  const csv = buildCsv([
    'Danilo\t893566\tMaestro-Refinamentos S2-Abr\t"tag"\t2026-04-14\t2.000',
    'Danilo\t987589\tMaestro-Ritos (Daily, Planning, Review e Retro) S2-Abr\t"tag"\t2026-04-15\t6.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'time-contract.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await expect(page.getByRole('tab', { name: /Registrar Tempo/i })).toBeVisible();
  await page.getByRole('tab', { name: /Registrar Tempo/i }).click();

  await expect(page.getByText('tarefa(s) pendente(s)')).toBeVisible();
  await expect(page.getByTestId('time-entries-json')).toHaveText(/\[\]/);

  await page.getByTestId('cecis-response').fill([
    'Tarefas criadas com sucesso — 2 issues:',
    'ID 291631 — Maestro-Refinamentos S2-Abr — tracker: Análise e Refinamento (12)',
    'ID 291632 — Maestro-Ritos (Daily, Planning, Review e Retro) S2-Abr — tracker: Reuniões (21)',
  ].join('\n'));
  await page.getByRole('button', { name: /Mapear IDs/i }).click();

  await expect(page.getByText('issue_id 291631')).toBeVisible();
  await expect(page.getByText('issue_id 291632')).toBeVisible();

  const jsonText = await page.getByTestId('time-entries-json').textContent();
  const json = JSON.parse(jsonText || '');

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

test('time entries JSON excludes tasks that were not mapped by Cecis', async ({ page }) => {
  const csv = buildCsv([
    'Danilo\t893566\tTarefa Mapeada\t"tag"\t2026-04-14\t2.000',
    'Danilo\t987589\tTarefa Pendente\t"tag"\t2026-04-15\t6.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'partial-cecis-map.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await page.getByRole('tab', { name: /Registrar Tempo/i }).click();
  await page.getByTestId('cecis-response').fill('ID 291700 — Tarefa Mapeada — tracker: Manutenção (5)');
  await page.getByRole('button', { name: /Mapear IDs/i }).click();

  await expect(page.getByText(/Pendentes de issue_id: Tarefa Pendente/i)).toBeVisible();

  const jsonText = await page.getByTestId('time-entries-json').textContent();
  const json = JSON.parse(jsonText || '');

  expect(json).toEqual([{
    issue_id: 291700,
    hours: 2,
    spent_on: '2026-04-14',
    activity_id: 9,
    comments: '',
  }]);
});

test('all days remain navigable when CSV has more than five days', async ({ page }) => {
  const rows = Array.from({ length: 7 }, (_, idx) => {
    const day = String(idx + 1).padStart(2, '0');
    return `Danilo\t${900 + idx}\tTarefa ${idx + 1}\t"tag"\t2026-04-${day}\t8.000`;
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
    'Danilo\t101\tTarefa curta\t"tag"\t2026-04-01\t7.000',
    'Danilo\t102\tTarefa longa\t"tag"\t2026-04-02\t9.000',
    'Danilo\t103\tTarefa exata\t"tag"\t2026-04-06\t8.000',
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

test('partially invalid CSV shows ignored-line feedback', async ({ page }) => {
  const csv = buildCsv([
    'Danilo\t101\tTarefa válida\t"tag"\t2026-04-01\t8.000',
    'Danilo\t102\tTarefa sem data\t"tag"\tdata-invalida\t2.000',
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'partial.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await expect(page.getByText(/1 linha\(s\) foram ignoradas/i)).toBeVisible();
  await expect(page.getByText('1/20 dias úteis fechados com 8h.')).toBeVisible();
});

test('drag and drop uploads a CSV', async ({ page }) => {
  const filePath = path.join(testDir, 'fixtures', 'sample.csv');
  await page.locator('label[for="file-upload"]').dispatchEvent('drop', {
    dataTransfer: await page.evaluateHandle((fixturePath) => {
      const dataTransfer = new DataTransfer();
      const file = new File([
        'Usuário\tID do cartão\tTítulo\tEtiquetas\tData\tTempo registrado soma\nDanilo\t1\tTarefa drop\t"tag"\t2026-04-01\t8.000',
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
  await expect(holiday).toHaveClass(/bg-\[#A855F7\]\/15/);
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
    'Danilo;1;"Reunião, alinhamento";"tag;interna";2026-04-01;5,5',
    'Danilo;2;"Execução; entrega";"tag;externa";2026-04-01;2,5',
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
    row('2026-04-01', '8.000', 'Tarefa Danilo'),
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
  await expect(page.getByText('Page Not Found')).toBeVisible();

  await page.getByRole('button', { name: /Go Home/i }).click();
  await expect(page.getByText('Validar lançamento diário de 8h')).toBeVisible();
});
