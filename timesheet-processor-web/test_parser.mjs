import fs from 'fs';

// Função parseNumber (copiada do Home.tsx)
const parseNumber = (numberStr) => {
  if (!numberStr || numberStr.trim() === "") return 0.0;
  
  let cleaned = numberStr.trim();
  cleaned = cleaned.replace(",", "");
  
  try {
    return parseFloat(cleaned);
  } catch {
    return 0.0;
  }
};

// Função detectSeparator (copiada do Home.tsx)
const detectSeparator = (headerLine) => {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(";")) return ";";
  if (headerLine.includes(",")) return ",";
  if (headerLine.includes("  ")) return " ";
  return ",";
};

// Função findHeaderIndex (copiada do Home.tsx)
const findHeaderIndex = (headers, ...possibleNames) => {
  for (const name of possibleNames) {
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].toLowerCase() === name.toLowerCase()) {
        return i;
      }
    }
  }
  return -1;
};

// Função processCsv (copiada do Home.tsx com ajustes)
const processCsv = (csvText) => {
  const lines = csvText.split("\n");
  if (lines.length === 0) throw new Error("CSV vazio");

  const headerLine = lines[0];
  const separator = detectSeparator(headerLine);
  console.log(`Separador detectado: ${separator === "\t" ? "TAB" : separator}`);
  
  const headers = headerLine.split(separator).map((h) => h.trim().replace(/"/g, ""));
  console.log(`Headers: ${JSON.stringify(headers)}`);

  const titleIdx = findHeaderIndex(headers, "Título", "Titulo");
  const dataIdx = findHeaderIndex(headers, "Data");
  const tempoIdx = findHeaderIndex(headers, "Tempo registrado soma", "Tempo");

  console.log(`titleIdx: ${titleIdx}, dataIdx: ${dataIdx}, tempoIdx: ${tempoIdx}`);

  if (titleIdx === -1 || dataIdx === -1 || tempoIdx === -1) {
    throw new Error("Colunas obrigatórias não encontradas (Título, Data, Tempo registrado soma)");
  }

  const dailySummaries = new Map();
  let overallTotalHours = 0;
  let invalidLines = 0;
  let processedLines = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(separator).map((c) => c.trim().replace(/"/g, ""));

    if (cols.length <= Math.max(titleIdx, dataIdx, tempoIdx)) {
      console.log(`Linha ${i}: número de colunas insuficiente (${cols.length} < ${Math.max(titleIdx, dataIdx, tempoIdx) + 1})`);
      invalidLines++;
      continue;
    }

    try {
      const date = cols[dataIdx]?.trim();
      const title = cols[titleIdx]?.trim();
      const hours = parseNumber(cols[tempoIdx]);

      // Validar formato da data (YYYY-MM-DD)
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.log(`Linha ${i}: data inválida: "${date}"`);
        invalidLines++;
        continue;
      }

      if (!title || hours === 0) {
        console.log(`Linha ${i}: título vazio ou horas zero`);
        continue;
      }

      if (!dailySummaries.has(date)) {
        dailySummaries.set(date, {
          date,
          activities: [],
          totalHours: 0,
          status: "",
        });
      }

      const summary = dailySummaries.get(date);
      summary.activities.push({ title, hours });
      summary.totalHours += hours;
      overallTotalHours += hours;
      processedLines++;
    } catch (e) {
      console.error(`Erro ao processar linha ${i}: ${line}`, e);
      invalidLines++;
    }
  }

  console.log(`\nResumo do processamento:`);
  console.log(`- Linhas processadas com sucesso: ${processedLines}`);
  console.log(`- Linhas inválidas: ${invalidLines}`);
  console.log(`- Dias únicos encontrados: ${dailySummaries.size}`);
  console.log(`- Total de horas: ${overallTotalHours}`);

  // Sort dates in descending order and calculate status
  const sortedSummaries = Array.from(dailySummaries.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((summary) => {
      if (summary.totalHours < 8) {
        summary.status = "Menos de 8 horas";
      } else if (summary.totalHours > 8) {
        summary.status = "Mais de 8 horas";
      } else {
        summary.status = "No horário";
      }
      summary.activities.sort((a, b) => a.title.localeCompare(b.title));
      return summary;
    });

  return {
    dailySummaries: sortedSummaries,
    overallTotalHours,
  };
};

// Teste
try {
  const csvText = fs.readFileSync('/home/ubuntu/timesheet-processor-web/test_data_debug.csv', 'utf-8');
  const result = processCsv(csvText);

  console.log(`\n\nDias encontrados:`);
  result.dailySummaries.forEach((summary) => {
    console.log(`- ${summary.date}: ${summary.totalHours}h (${summary.status})`);
  });

  // Validação
  console.log(`\n\nValidação:`);
  const expectedDates = ['2026-04-01', '2026-04-02', '2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10'];
  const actualDates = result.dailySummaries.map(s => s.date).sort();
  
  console.log(`Datas esperadas: ${JSON.stringify(expectedDates)}`);
  console.log(`Datas encontradas: ${JSON.stringify(actualDates)}`);
  
  const match = JSON.stringify(expectedDates) === JSON.stringify(actualDates);
  console.log(`\nTeste: ${match ? '✅ PASSOU' : '❌ FALHOU'}`);

  if (!match) {
    const missing = expectedDates.filter(d => !actualDates.includes(d));
    const extra = actualDates.filter(d => !expectedDates.includes(d));
    if (missing.length > 0) console.log(`Datas faltando: ${JSON.stringify(missing)}`);
    if (extra.length > 0) console.log(`Datas extras: ${JSON.stringify(extra)}`);
  }

  // Validar total de horas
  console.log(`\nTotal de horas: ${result.overallTotalHours} (esperado: 56)`);
  console.log(`Validação total: ${result.overallTotalHours === 56 ? '✅ PASSOU' : '❌ FALHOU'}`);
} catch (error) {
  console.error('Erro:', error);
  process.exit(1);
}
