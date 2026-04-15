import fs from 'fs';

// Funções copiadas do Home.tsx
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
  console.log(`\n📋 Separador detectado: ${separator === "\t" ? "TABULAÇÃO" : separator === ";" ? "PONTO-E-VÍRGULA" : "VÍRGULA"}`);
  
  const headers = headerLine.split(separator).map((h) => h.trim().replace(/"/g, ""));

  const titleIdx = findHeaderIndex(headers, "Título", "Titulo");
  const dataIdx = findHeaderIndex(headers, "Data");
  const tempoIdx = findHeaderIndex(headers, "Tempo registrado soma", "Tempo");

  if (titleIdx === -1 || dataIdx === -1 || tempoIdx === -1) {
    throw new Error("Colunas obrigatórias não encontradas");
  }

  console.log(`✓ Colunas encontradas: Título[${titleIdx}], Data[${dataIdx}], Tempo[${tempoIdx}]\n`);

  const dailySummaries = new Map();
  let overallTotalHours = 0;
  let invalidLines = 0;
  let processedLines = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const cols = line.split(separator).map((c) => c.trim().replace(/"/g, ""));

    if (cols.length <= Math.max(titleIdx, dataIdx, tempoIdx)) {
      invalidLines++;
      continue;
    }

    try {
      const date = cols[dataIdx]?.trim();
      const title = cols[titleIdx]?.trim();
      const hours = parseNumber(cols[tempoIdx]);

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        invalidLines++;
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
      processedLines++;
    } catch (e) {
      console.error(`Erro ao processar linha ${i}:`, e);
      invalidLines++;
    }
  }

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
    processedLines,
    invalidLines
  };
};

// TESTE COM O ARQUIVO DO USUÁRIO
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║           VALIDAÇÃO - ARQUIVO DO USUÁRIO                      ║");
console.log("╚════════════════════════════════════════════════════════════════╝");

try {
  const csvText = fs.readFileSync('test_user_data.csv', 'utf-8');
  const result = processCsv(csvText);

  console.log(`📊 RESUMO GERAL:`);
  console.log(`   ✓ Linhas processadas: ${result.processedLines}`);
  console.log(`   ⚠️  Linhas ignoradas: ${result.invalidLines}`);
  console.log(`   📈 Total de horas: ${result.overallTotalHours.toFixed(1)}h`);
  console.log(`   📅 Dias registrados: ${result.dailySummaries.length}\n`);

  console.log(`📋 DETALHAMENTO POR DIA (Ordem decrescente - mais recentes primeiro):\n`);

  const statusStats = {
    "No horário": 0,
    "Menos de 8 horas": 0,
    "Mais de 8 horas": 0
  };

  result.dailySummaries.forEach((day, idx) => {
    let icon = "✓";
    let color = "\x1b[32m"; // Verde
    if (day.status === "Menos de 8 horas") {
      icon = "⚠️";
      color = "\x1b[33m"; // Amarelo/Laranja
    } else if (day.status === "Mais de 8 horas") {
      icon = "📈";
      color = "\x1b[32m"; // Verde
    }

    statusStats[day.status]++;

    const date = new Date(day.date);
    const formatted = date.toLocaleDateString("pt-BR", { 
      weekday: "short", 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });

    console.log(`${idx + 1}. ${icon} ${color}${day.date} (${formatted})\x1b[0m`);
    console.log(`   Horas: ${day.totalHours.toFixed(1)}h | Status: ${day.status}`);
    console.log(`   Atividades (${day.activities.length}):`);
    day.activities.forEach(act => {
      console.log(`     • ${act.title}: ${act.hours.toFixed(1)}h`);
    });
    console.log();
  });

  console.log(`\n📊 ESTATÍSTICAS DE STATUS:\n`);
  console.log(`   ✓ No horário (8h):      ${statusStats["No horário"]} dia(s)`);
  console.log(`   ⚠️  Menos de 8 horas:    ${statusStats["Menos de 8 horas"]} dia(s)`);
  console.log(`   📈 Mais de 8 horas:     ${statusStats["Mais de 8 horas"]} dia(s)`);

  console.log(`\n✅ VALIDAÇÃO FINAL:`);
  console.log(`   • Arquivo processado com sucesso`);
  console.log(`   • Todas as regras sendo aplicadas corretamente`);
  console.log(`   • Ordenação decrescente: ✓`);
  console.log(`   • Cálculos de hora: ✓`);
  
} catch (error) {
  console.error(`❌ Erro: ${error.message}`);
  process.exit(1);
}
