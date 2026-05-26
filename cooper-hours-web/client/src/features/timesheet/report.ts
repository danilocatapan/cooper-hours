import { DAILY_TARGET_HOURS, HOUR_TOLERANCE } from "./constants";
import { isNationalHoliday } from "./holidays";
import type { DailyStatus, DailySummary, TaskConfig, TimeEntryDraft, TimesheetReport } from "./types";

export function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseInteger(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

export function getDefaultTaskConfig(title: string): TaskConfig {
  const normalized = normalizeTitle(title);

  if (normalized.match(/\b(rito|daily|planning|review|retro|reuniao|reunioes)\b/)) {
    return { trackerId: "21", activityId: "10", issueId: "" };
  }

  if (normalized.match(/\b(refinamento|refinamentos|analise|analises)\b/)) {
    return { trackerId: "12", activityId: "20", issueId: "" };
  }

  return { trackerId: "5", activityId: "9", issueId: "" };
}

export function getDailyStatus(totalHours: number): DailyStatus {
  const difference = totalHours - DAILY_TARGET_HOURS;
  if (Math.abs(difference) < HOUR_TOLERANCE) return "complete";
  return difference < 0 ? "pending" : "over";
}

export function isBusinessDay(date: string): boolean {
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5 && !isNationalHoliday(date);
}

export function getBusinessDaysForMonth(month: string): string[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const businessDays: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (isBusinessDay(date)) businessDays.push(date);
  }

  return businessDays;
}

export function getCalendarCellsForMonth(month: string): Array<string | null> {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const firstDay = new Date(`${month}-01T00:00:00`).getDay();
  const leadingEmptyCells = (firstDay + 6) % 7;
  const cells: Array<string | null> = Array.from({ length: leadingEmptyCells }, () => null);

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }

  return cells;
}

export function formatLocalDate(date: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", options);
}

export function getStatusLabel(summary: DailySummary): string {
  if (summary.isHoliday) return summary.holidayName ? `Feriado: ${summary.holidayName}` : "Feriado nacional";

  const status = getDailyStatus(summary.totalHours);
  const difference = Math.abs(summary.totalHours - DAILY_TARGET_HOURS);

  if (status === "complete") return "8h completas";
  if (status === "pending") return `Pendente: faltam ${difference.toFixed(1)}h`;
  return `Acima da meta: +${difference.toFixed(1)}h`;
}

export function getUniqueTaskTitles(report: TimesheetReport | null): string[] {
  const titles = new Set<string>();
  report?.dailySummaries.forEach((summary) => {
    if (summary.isMissing) return;
    summary.activities.forEach((activity) => titles.add(activity.title));
  });
  return Array.from(titles).sort((a, b) => a.localeCompare(b));
}

export function getReportStats(report: TimesheetReport | null) {
  if (!report) return null;

  const expectedSummaries = report.dailySummaries.filter((summary) => summary.isBusinessDay);
  const completeDays = expectedSummaries.filter((summary) => getDailyStatus(summary.totalHours) === "complete").length;
  const pendingDays = expectedSummaries.filter((summary) => getDailyStatus(summary.totalHours) === "pending").length;
  const overDays = expectedSummaries.filter((summary) => getDailyStatus(summary.totalHours) === "over").length;
  const expectedTotalHours = report.businessDayCount * DAILY_TARGET_HOURS;

  return {
    completeDays,
    pendingDays,
    overDays,
    expectedTotalHours,
    expectedSummaries,
  };
}

export function buildTimeEntries(report: TimesheetReport | null, taskConfigs: Record<string, TaskConfig>): TimeEntryDraft[] {
  if (!report) return [];

  return report.dailySummaries
    .filter((summary) => !summary.isMissing)
    .flatMap((summary) =>
      summary.activities.map((activity) => {
        const config = taskConfigs[activity.title] ?? getDefaultTaskConfig(activity.title);
        return {
          issue_id: parseInteger(config.issueId),
          hours: activity.hours,
          spent_on: summary.date,
          activity_id: parseInteger(config.activityId),
          comments: "",
          title: activity.title,
        };
      })
    );
}
