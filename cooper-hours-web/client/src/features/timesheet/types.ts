export interface Activity {
  title: string;
  hours: number;
  cardId?: string;
}

export interface DailySummary {
  date: string;
  activities: Activity[];
  totalHours: number;
  isBusinessDay: boolean;
  isMissing: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

export interface TimesheetReport {
  dailySummaries: DailySummary[];
  overallTotalHours: number;
  ignoredLineCount: number;
  duplicateLineCount: number;
  rawLineCount: number;
  validLineCount: number;
  importedDayCount: number;
  importedMonth: string;
  userName: string | null;
  businessDayCount: number;
  missingBusinessDays: string[];
  weekendOrExtraDays: string[];
  cardIds: string[];
  minImportedDate: string;
  maxImportedDate: string;
}

export interface TaskDefaults {
  projectId: string;
  assignedToId: string;
  trackerId: string;
  startDate: string;
  dueDate: string;
  statusId: string;
  fixedVersionName: string;
  description: string;
}

export interface TaskConfig {
  trackerId: string;
  activityId: string;
  issueId: string;
}

export interface ParsedIssue {
  issueId: string;
  title: string;
}

export interface TimeEntryDraft {
  issue_id: number;
  hours: number;
  spent_on: string;
  activity_id: number;
  comments: string;
  title: string;
}

export type DailyStatus = "complete" | "pending" | "over";
export type TimesheetStatus = DailyStatus | "missing" | "optional" | "holiday" | "invalid" | "neutral";
