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
  return {
    importedMonth: report.importedMonth,
    minDate: report.minImportedDate,
    maxDate: report.maxImportedDate,
    tasks: taskTitles.map((title) => {
      const config = taskConfigs[title] ?? getDefaultTaskConfig(title);
      const issueId = parseInteger(config.issueId);
      return {
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
    entries: timeEntries.map((entry) => ({
      title: entry.title,
      hours: entry.hours,
      spentOn: entry.spent_on,
      activityId: entry.activity_id,
    })),
  };
}
