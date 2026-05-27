import { getNationalHoliday, getNationalHolidaysForMonth } from "./holidays";
import { getBusinessDaysForMonth, isBusinessDay } from "./report";
import type { CsvIssue, DailySummary, TimesheetReport } from "./types";

function parseNumber(numberStr: string): number {
  if (!numberStr || numberStr.trim() === "") return 0.0;

  let s = numberStr.trim();
  s = s.replace(/"/g, "");

  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(/,/g, ".");
  }

  s = s.replace(/\s+/g, "");

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0.0;
}

function detectSeparator(headerLine: string): string {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(";")) return ";";
  if (headerLine.includes(",")) return ",";
  if (headerLine.includes("  ")) return " ";
  return ",";
}

function splitLine(line: string, separator: string): string[] {
  if (separator === " ") return line.split(/\s{2,}/);

  const cols: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === "\"" && nextChar === "\"") {
      current += "\"";
      i++;
    } else if (char === "\"") {
      insideQuotes = !insideQuotes;
    } else if (char === separator && !insideQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cols.push(current);
  return cols;
}

function findHeaderIndex(headers: string[], ...possibleNames: string[]): number {
  for (const name of possibleNames) {
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].toLowerCase() === name.toLowerCase()) {
        return i;
      }
    }
  }
  return -1;
}

function createDailySummary(date: string, isMissing: boolean): DailySummary {
  const holiday = getNationalHoliday(date);

  return {
    date,
    activities: [],
    totalHours: 0,
    isBusinessDay: isBusinessDay(date),
    isMissing,
    isHoliday: holiday !== null,
    holidayName: holiday?.name,
  };
}

function createCsvIssue(
  lineNumber: number,
  reason: string,
  suggestion: string,
  date?: string,
  hours?: string
): CsvIssue {
  return {
    lineNumber,
    reason,
    suggestion,
    date: date || undefined,
    hours: hours || undefined,
  };
}

export function processCsv(csvText: string): TimesheetReport {
  const lines = csvText.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) throw new Error("CSV vazio");

  const headerLine = lines[0];
  const separator = detectSeparator(headerLine);
  const headers = splitLine(headerLine, separator).map((h) => h.trim().replace(/"/g, ""));

  const titleIdx = findHeaderIndex(headers, "Título", "TÃ­tulo", "TÃƒÂ­tulo", "Titulo");
  const dataIdx = findHeaderIndex(headers, "Data");
  const tempoIdx = findHeaderIndex(headers, "Tempo registrado soma", "Tempo");
  const userIdx = findHeaderIndex(headers, "Usuário", "TÃ¡rio", "UsuÃ¡rio", "UsuÃƒÂ¡rio", "Usuario");
  const cardIdx = findHeaderIndex(headers, "ID do cartão", "ID do cartÃ£o", "ID do cartÃƒÂ£o", "ID do cartao", "ID", "Cartão", "CartÃ£o", "CartÃƒÂ£o", "Cartao", "Card ID");

  if (titleIdx === -1 || dataIdx === -1 || tempoIdx === -1) {
    throw new Error("Colunas obrigatórias não encontradas (Título, Data, Tempo registrado soma)");
  }

  const dailySummaries: Map<string, DailySummary> = new Map();
  const importedMonths: Set<string> = new Set();
  const importedUsers: Set<string> = new Set();
  const duplicateKeys: Set<string> = new Set();
  const cardIds: Set<string> = new Set();
  const importedDates: Set<string> = new Set();
  let overallTotalHours = 0;
  let ignoredLineCount = 0;
  const ignoredLineIssues: CsvIssue[] = [];
  let duplicateLineCount = 0;
  let validLineCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const cols = splitLine(line, separator).map((c) => c.trim().replace(/"/g, ""));

    if (cols.length <= Math.max(titleIdx, dataIdx, tempoIdx)) {
      ignoredLineCount++;
      ignoredLineIssues.push(createCsvIssue(
        i + 1,
        "Campos obrigatórios ausentes",
        "Exporte novamente com Título, Data e Tempo registrado soma."
      ));
      continue;
    }

    try {
      const date = cols[dataIdx]?.trim();
      const title = cols[titleIdx]?.trim();
      const hours = parseNumber(cols[tempoIdx]);
      const user = userIdx >= 0 ? cols[userIdx]?.trim() : "";
      const cardId = cardIdx >= 0 ? cols[cardIdx]?.trim() : "";

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        ignoredLineCount++;
        ignoredLineIssues.push(createCsvIssue(
          i + 1,
          "Data inválida",
          "Use o formato YYYY-MM-DD, por exemplo 2026-04-01.",
          date,
          cols[tempoIdx]
        ));
        continue;
      }

      if (!title) {
        ignoredLineCount++;
        ignoredLineIssues.push(createCsvIssue(
          i + 1,
          "Título ausente",
          "Preencha o título da tarefa no BusinessMap antes de exportar.",
          date,
          cols[tempoIdx]
        ));
        continue;
      }

      if (hours === 0) {
        ignoredLineCount++;
        ignoredLineIssues.push(createCsvIssue(
          i + 1,
          "Horas zeradas ou inválidas",
          "Informe horas maiores que zero usando ponto ou vírgula decimal.",
          date,
          cols[tempoIdx]
        ));
        continue;
      }

      importedMonths.add(date.slice(0, 7));
      importedDates.add(date);
      if (user) importedUsers.add(user);
      if (cardId) cardIds.add(cardId);

      const duplicateKey = [date, cardId, title, hours.toFixed(3)].join("|").toLowerCase();
      if (duplicateKeys.has(duplicateKey)) {
        duplicateLineCount++;
        continue;
      }
      duplicateKeys.add(duplicateKey);

      if (!dailySummaries.has(date)) {
        dailySummaries.set(date, createDailySummary(date, false));
      }

      const summary = dailySummaries.get(date)!;
      summary.activities.push({ title, hours, cardId });
      summary.totalHours += hours;
      overallTotalHours += hours;
      validLineCount++;
    } catch (e) {
      console.error(`Erro ao processar linha: ${line}`, e);
      ignoredLineCount++;
      ignoredLineIssues.push(createCsvIssue(
        i + 1,
        "Falha ao processar linha",
        "Revise separadores, aspas e campos obrigatórios desta linha."
      ));
    }
  }

  if (importedMonths.size > 1) {
    throw new Error("O arquivo contém registros de mais de um mês. Envie um CSV com apenas um mês por importação.");
  }

  if (importedUsers.size > 1) {
    throw new Error("O arquivo contém registros de mais de um usuário. Envie um CSV individual por importação.");
  }

  if (dailySummaries.size === 0) {
    throw new Error("Nenhum registro válido encontrado no arquivo");
  }

  const importedMonth = Array.from(importedMonths)[0];
  const sortedImportedDates = Array.from(importedDates).sort();
  const businessDays = getBusinessDaysForMonth(importedMonth);
  const missingBusinessDays = businessDays.filter((date) => !dailySummaries.has(date));
  const weekendOrExtraDays = Array.from(dailySummaries.values())
    .filter((summary) => !summary.isBusinessDay && !summary.isHoliday)
    .map((summary) => summary.date);

  missingBusinessDays.forEach((date) => {
    dailySummaries.set(date, createDailySummary(date, true));
  });

  getNationalHolidaysForMonth(importedMonth).forEach((holiday) => {
    if (!dailySummaries.has(holiday.date)) {
      dailySummaries.set(holiday.date, createDailySummary(holiday.date, false));
    }
  });

  const sortedSummaries = Array.from(dailySummaries.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((summary) => {
      summary.activities.sort((a, b) => a.title.localeCompare(b.title));
      return summary;
    });

  return {
    dailySummaries: sortedSummaries,
    overallTotalHours,
    ignoredLineCount,
    ignoredLineIssues,
    duplicateLineCount,
    rawLineCount: lines.length - 1,
    validLineCount,
    importedDayCount: Array.from(importedDates).length,
    importedMonth,
    userName: importedUsers.size === 1 ? Array.from(importedUsers)[0] : null,
    businessDayCount: businessDays.length,
    missingBusinessDays,
    weekendOrExtraDays,
    cardIds: Array.from(cardIds).sort(),
    minImportedDate: sortedImportedDates[0] ?? `${importedMonth}-01`,
    maxImportedDate: sortedImportedDates[sortedImportedDates.length - 1] ?? `${importedMonth}-01`,
  };
}
