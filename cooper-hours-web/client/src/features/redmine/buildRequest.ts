import type { AutomationPreviewRequest } from "@shared/redmine";
import { getDefaultTaskConfig, parseInteger } from "@/features/timesheet/report";
import type { TaskConfig, TaskDefaults, TimeEntryDraft, TimesheetReport } from "@/features/timesheet/types";

export function buildAutomationRequest(
  report: TimesheetReport,
  taskTitles: string[],
  taskDefaults: TaskDefaults,
  taskConfigs: Record<string, TaskConfig>,
  timeEntries: TimeEntryDraft[],
): AutomationPreviewRequest {
  const entryOccurrences = new Map<string, number>();
  return {
    importedMonth: report.importedMonth,
    minDate: report.minImportedDate,
    maxDate: report.maxImportedDate,
    tasks: taskTitles.map((title) => {
      const config = taskConfigs[title] ?? getDefaultTaskConfig(title);
      const issueId = parseInteger(config.issueId);
      return {
        sourceKey: sourceTaskKey(title),
        title,
        trackerId: parseInteger(config.trackerId),
        activityId: parseInteger(config.activityId),
        manualIssueId: issueId > 0 ? issueId : null,
      };
    }),
    taskDefaults: {
      startDate: taskDefaults.startDate,
      dueDate: taskDefaults.dueDate,
      statusId: parseInteger(taskDefaults.statusId),
      fixedVersionName: taskDefaults.fixedVersionName,
      description: taskDefaults.description,
    },
    entries: timeEntries.map((entry) => {
      const taskKey = sourceTaskKey(entry.title);
      const occurrence = (entryOccurrences.get(taskKey) ?? 0) + 1;
      entryOccurrences.set(taskKey, occurrence);
      return {
        sourceKey: `${taskKey}::entry::${occurrence}`,
        title: entry.title,
        hours: entry.hours,
        spentOn: entry.spent_on,
        activityId: entry.activity_id,
      };
    }),
  };
}

function sourceTaskKey(title: string): string {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}
