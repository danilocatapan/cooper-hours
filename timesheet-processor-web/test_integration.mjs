import fs from 'fs';
import path from 'path';

// Simular o processamento de CSV como o site faria
const csvContent = fs.readFileSync('/tmp/test_data.csv', 'utf-8');

console.log("=".repeat(80));
console.log("TESTE DE INTEGRAÇÃO: Simulando upload no site");
console.log("=".repeat(80));

// Copiar as funções do Home.tsx
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

const detectSeparator = (headerLine) => {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(";")) return ";";
  if (headerLine.includes(",")) return ",";
  if (headerLine.includes("  ")) return " ";
  return ",";
};

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

const processCsv = (csvText) => {
  let lines = csvText.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) throw new Error("CSV vazio");

  const headerLine = lines[0];
  const separator = detectSeparator(headerLine);
  const headers = headerLine.split(separator).map((h) => h.trim().replace(/"/g, ""));

  const titleIdx = findHeaderIndex(headers, "Título", "Titulo");
  const dataIdx = findHeaderIndex(headers, "Data");
  const tempoIdx = findHeaderIndex(headers, "Tempo registrado soma", "Tempo");

  if (titleIdx === -1 || dataIdx === -1 || tempoIdx === -1) {
    throw new Error("Colunas obrigatórias não encontradas");
  }

  const dailySummaries = new Map();
  let overallTotalHours = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const cols = line.split(separator).map((c) => c.trim().replace(/"/g, ""));

    if (cols.length <= Math.max(titleIdx, dataIdx, tempoIdx)) {
      continue;
    }

    try {
      const date = cols[dataIdx]?.trim();
      const title = cols[titleIdx]?.trim();
      const hours = parseNumber(cols[tempoIdx]);

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        continue;
      }

      if (!title || hours === 0) continue;

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
    } catch (e) {
      console.error(`Erro ao processar linha ${i}:`, e);
    }
  }

  // CORREÇÃO: Usar localeCompare em vez de new Date()
  const sortedSummaries = Array.from(dailySummaries.values())
    .sort((a, b) => b.date.localeCompare(a.date))
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

try {
  const result = processCsv(csvContent);
  
  console.log(`\n✅ Processamento bem-sucedido`);
  console.log(`   Total de horas: ${result.overallTotalHours}h`);
  console.log(`   Dias encontrados: ${result.dailySummaries.length}`);
  
  console.log(`\n📅 Datas exibidas (em ordem decrescente):`);
  result.dailySummaries.forEach((d, idx) => {
    console.log(`   ${idx + 1}. ${d.date}: ${d.totalHours}h (${d.status})`);
  });

  // Validações
  console.log(`\n🔍 Validações:`);
  
  // Verificar se 31/03/2026 está presente
  const has31March = result.dailySummaries.some(d => d.date === '2026-03-31');
  console.log(`   31/03/2026 presente? ${has31March ? '❌ SIM (BUG!)' : '✅ NÃO'}`);
  
  // Verificar se 15/04/2026 está presente
  const has15April = result.dailySummaries.some(d => d.date === '2026-04-15');
  console.log(`   15/04/2026 presente? ${has15April ? '✅ SIM' : '❌ NÃO (BUG!)'}`);
  
  // Verificar total de horas
  const totalMatch = result.overallTotalHours === 80;
  console.log(`   Total 80h? ${totalMatch ? '✅ SIM' : '❌ NÃO'}`);
  
  // Verificar ordem decrescente
  let isDescending = true;
  for (let i = 0; i < result.dailySummaries.length - 1; i++) {
    if (result.dailySummaries[i].date < result.dailySummaries[i + 1].date) {
      isDescending = false;
      break;
    }
  }
  console.log(`   Ordem decrescente? ${isDescending ? '✅ SIM' : '❌ NÃO'}`);
  
  const allValid = !has31March && has15April && totalMatch && isDescending;
  console.log(`\n${allValid ? '✅ TESTE PASSOU' : '❌ TESTE FALHOU'}`);
  
} catch (error) {
  console.error('❌ Erro:', error.message);
}
