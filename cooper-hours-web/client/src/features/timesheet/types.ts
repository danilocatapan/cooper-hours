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

export interface CsvIssue {
  lineNumber: number;
  reason: string;
  type: CsvIssueType;
  date?: string;
  hours?: string;
  suggestion: string;
}

export type CanonicalCsvField = "user" | "cardId" | "title" | "labels" | "date" | "timeTotal";

export interface CsvHeaderAlias {
  field: CanonicalCsvField;
  aliases: string[];
}

export interface CsvHeaderRecognition {
  field: CanonicalCsvField;
  label: string;
  columnIndex: number;
  matchedHeader: string | null;
  required: boolean;
}

export type CsvIssueType = "missing-fields" | "invalid-date" | "missing-title" | "invalid-hours" | "parse-failure";

export interface TimesheetReport {
  dailySummaries: DailySummary[];
  overallTotalHours: number;
  ignoredLineCount: number;
  ignoredLineIssues: CsvIssue[];
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
  headerRecognition: CsvHeaderRecognition[];
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

export interface CecisMessageResult {
  message: string;
  errors: string[];
  canCopy: boolean;
}

export interface CecisResponseDiagnostics {
  parsedIssues: ParsedIssue[];
  conflictTaskTitles: string[];
  unknownTitles: string[];
  manualIssueConflictTitles: string[];
  recognizedIssueCount: number;
}

export type TimeEntryPayload = Omit<TimeEntryDraft, "title">;

export interface TimeEntryDraft {
  issue_id: number;
  hours: number;
  spent_on: string;
  activity_id: number;
  comments: string;
  title: string;
}

export type DailyStatus = "complete" | "underTarget" | "overTarget";
export type LegacyDailyStatus = "pending" | "over";
export type TimesheetStatus = DailyStatus | LegacyDailyStatus | "missing" | "optional" | "holiday" | "invalid" | "neutral";

export type SensitiveActionKind =
  | "copyTasks"
  | "copyTimeEntries"
  | "downloadReport"
  | "downloadCsvIssues"
  | "clearImportedData";
