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
  // Limpar linhas vazias e espaços em branco extras
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
  let invalidLines = 0;
  let processedLines = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const cols = line.split(separator).map((c) => c.trim().replace(/"/g, ""));

    if (cols.length <= Math.max(titleIdx, dataIdx, tempoIdx)) {
      console.log(`  ❌ Linha ${i}: colunas insuficientes (${cols.length} < ${Math.max(titleIdx, dataIdx, tempoIdx) + 1})`);
      invalidLines++;
      continue;
    }

    try {
      const date = cols[dataIdx]?.trim();
      const title = cols[titleIdx]?.trim();
      const hours = parseNumber(cols[tempoIdx]);

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.log(`  ❌ Linha ${i}: data inválida: "${date}"`);
        invalidLines++;
        continue;
      }

      if (!title || hours === 0) {
        console.log(`  ⚠️  Linha ${i}: título vazio ou horas zero`);
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
      console.error(`  ❌ Erro ao processar linha ${i}: ${line}`, e);
      invalidLines++;
    }
  }

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
    processedLines,
    invalidLines,
  };
};

// TESTES
console.log("=".repeat(80));
console.log("TESTE 1: Dados com espaços extras (como o usuário colou)");
console.log("=".repeat(80));

const testData1 = `Usuário	ID do cartão	Título	Etiquetas	Data	Tempo registrado soma
  Danilo 	893566	[Back] [Arquitetural] Replicação 	"QualityBot,#bbseg,#modelagem"	2026-04-01	5.000
  Danilo 	893566	[Back] [Arquitetural] Replicação 	"QualityBot,#bbseg,#modelagem"	2026-04-02	4.000
  Danilo 	893566	[Back] [Arquitetural] Replicação 	"QualityBot,#bbseg,#modelagem"	2026-04-06	4.000
  Danilo 	893566	[Back] [Arquitetural] Replicação 	"QualityBot,#bbseg,#modelagem"	2026-04-07	5.000
  Danilo 	893566	[Back] [Arquitetural] Replicação 	"QualityBot,#bbseg,#modelagem"	2026-04-08	7.000
  Danilo 	893566	[Back] [Arquitetural] Replicação 	"QualityBot,#bbseg,#modelagem"	2026-04-09	5.000
  Danilo 	893566	[Back] [Arquitetural] Replicação 	"QualityBot,#bbseg,#modelagem"	2026-04-10	7.000
  Danilo 	893566	[Back] [Arquitetural] Replicação 	"QualityBot,#bbseg,#modelagem"	2026-04-13	7.000
  Danilo 	893566	[Back] [Arquitetural] Replicação 	"QualityBot,#bbseg,#modelagem"	2026-04-14	5.000
  Danilo 	893566	[Back] [Arquitetural] Replicação 	"QualityBot,#bbseg,#modelagem"	2026-04-15	5.000
  Danilo 	987589	[313-Maestro] Ritos (Daily, Planning, Review e Retro) S1-Abril	"#bbseg"	2026-04-01	1.000
  Danilo 	987589	[313-Maestro] Ritos (Daily, Planning, Review e Retro) S1-Abril	"#bbseg"	2026-04-02	1.000
  Danilo 	987589	[313-Maestro] Ritos (Daily, Planning, Review e Retro) S1-Abril	"#bbseg"	2026-04-06	4.000
  Danilo 	987589	[313-Maestro] Ritos (Daily, Planning, Review e Retro) S1-Abril	"#bbseg"	2026-04-07	1.000
  Danilo 	987589	[313-Maestro] Ritos (Daily, Planning, Review e Retro) S1-Abril	"#bbseg"	2026-04-08	1.000
  Danilo 	987589	[313-Maestro] Ritos (Daily, Planning, Review e Retro) S1-Abril	"#bbseg"	2026-04-09	1.000
  Danilo 	987589	[313-Maestro] Ritos (Daily, Planning, Review e Retro) S1-Abril	"#bbseg"	2026-04-10	1.000
  Danilo 	987589	[313-Maestro] Ritos (Daily, Planning, Review e Retro) S1-Abril	"#bbseg"	2026-04-13	1.000
  Danilo 	987589	[313-Maestro] Ritos (Daily, Planning, Review e Retro) S1-Abril	"#bbseg"	2026-04-14	1.000
  Danilo 	987589	[313-Maestro] Ritos (Daily, Planning, Review e Retro) S1-Abril	"#bbseg"	2026-04-15	1.000
  Danilo 	987605	[313-Maestro] Refinamento S1-Abril	"#bbseg"	2026-04-01	2.000
  Danilo 	987605	[313-Maestro] Refinamento S1-Abril	"#bbseg"	2026-04-02	3.000
  Danilo 	987605	[313-Maestro] Refinamento S1-Abril	"#bbseg"	2026-04-07	2.000
  Danilo 	987605	[313-Maestro] Refinamento S1-Abril	"#bbseg"	2026-04-09	2.000
  Danilo 	987605	[313-Maestro] Refinamento S1-Abril	"#bbseg"	2026-04-14	2.000
  Danilo 	987605	[313-Maestro] Refinamento S1-Abril	"#bbseg"	2026-04-15	2.000`;

try {
  const result1 = processCsv(testData1);
  console.log(`\n✅ Processamento bem-sucedido`);
  console.log(`   Linhas processadas: ${result1.processedLines}`);
  console.log(`   Linhas inválidas: ${result1.invalidLines}`);
  console.log(`   Dias únicos: ${result1.dailySummaries.length}`);
  console.log(`   Total de horas: ${result1.overallTotalHours}`);
  
  console.log(`\n📅 Datas encontradas:`);
  result1.dailySummaries.forEach(d => {
    console.log(`   - ${d.date}: ${d.totalHours}h (${d.status})`);
  });

  // Validação
  const expectedDates = ['2026-04-01', '2026-04-02', '2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10', '2026-04-13', '2026-04-14', '2026-04-15'];
  const actualDates = result1.dailySummaries.map(d => d.date).sort();
  
  console.log(`\n🔍 Validação:`);
  console.log(`   Datas esperadas: ${expectedDates.length}`);
  console.log(`   Datas encontradas: ${actualDates.length}`);
  
  const missing = expectedDates.filter(d => !actualDates.includes(d));
  const extra = actualDates.filter(d => !expectedDates.includes(d));
  
  if (missing.length > 0) {
    console.log(`   ❌ Datas faltando: ${JSON.stringify(missing)}`);
  }
  if (extra.length > 0) {
    console.log(`   ❌ Datas extras: ${JSON.stringify(extra)}`);
  }
  
  const totalMatch = result1.overallTotalHours === 80;
  console.log(`   Total de horas: ${result1.overallTotalHours} (esperado: 80) ${totalMatch ? '✅' : '❌'}`);
  
  const testPassed = missing.length === 0 && extra.length === 0 && totalMatch;
  console.log(`\n${testPassed ? '✅ TESTE 1 PASSOU' : '❌ TESTE 1 FALHOU'}`);
} catch (error) {
  console.error('❌ Erro:', error.message);
}

console.log("\n" + "=".repeat(80));
console.log("TESTE 2: Verificar se 31/03/2026 está sendo criado");
console.log("=".repeat(80));

try {
  const result2 = processCsv(testData1);
  const has31March = result2.dailySummaries.some(d => d.date === '2026-03-31');
  console.log(`\n31/03/2026 presente? ${has31March ? '❌ SIM (BUG!)' : '✅ NÃO'}`);
  
  if (has31March) {
    const march31 = result2.dailySummaries.find(d => d.date === '2026-03-31');
    console.log(`   Atividades: ${march31.activities.length}`);
    console.log(`   Total de horas: ${march31.totalHours}`);
  }
} catch (error) {
  console.error('❌ Erro:', error.message);
}

console.log("\n" + "=".repeat(80));
console.log("TESTE 3: Verificar se 15/04/2026 está sendo exibido");
console.log("=".repeat(80));

try {
  const result3 = processCsv(testData1);
  const has15April = result3.dailySummaries.some(d => d.date === '2026-04-15');
  console.log(`\n15/04/2026 presente? ${has15April ? '✅ SIM' : '❌ NÃO (BUG!)'}`);
  
  if (has15April) {
    const april15 = result3.dailySummaries.find(d => d.date === '2026-04-15');
    console.log(`   Atividades: ${april15.activities.length}`);
    console.log(`   Total de horas: ${april15.totalHours}`);
    console.log(`   Status: ${april15.status}`);
  }
} catch (error) {
  console.error('❌ Erro:', error.message);
}
