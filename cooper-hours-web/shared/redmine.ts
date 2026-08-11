import { z } from "zod";

export const REDMINE_REQUEST_HEADER = "X-Cooper-Hours-Request";
export const REDMINE_REQUEST_HEADER_VALUE = "1";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const automationPreviewRequestSchema = z.object({
  importedMonth: z.string().regex(/^\d{4}-\d{2}$/),
  minDate: isoDateSchema,
  maxDate: isoDateSchema,
  tasks: z.array(z.object({
    title: z.string().trim().min(1).max(255),
    trackerId: z.number().int().positive(),
    activityId: z.number().int().positive(),
    manualIssueId: z.number().int().positive().nullable(),
  }).strict()).min(1).max(100),
  taskDefaults: z.object({
    startDate: isoDateSchema,
    dueDate: isoDateSchema,
    statusId: z.number().int().positive(),
    fixedVersionName: z.string().trim().max(255),
    description: z.string().max(10_000),
  }).strict(),
  entries: z.array(z.object({
    title: z.string().trim().min(1).max(255),
    hours: z.number().positive().max(24),
    spentOn: isoDateSchema,
    activityId: z.number().int().positive(),
  }).strict()).min(1).max(1_000),
}).strict().refine((value) => value.minDate <= value.maxDate, {
  message: "O período importado é inválido.",
  path: ["maxDate"],
});

export const automationSubmitRequestSchema = z.object({
  previewId: z.string().uuid(),
}).strict();

export type AutomationPreviewRequest = z.infer<typeof automationPreviewRequestSchema>;

export interface RedmineOption {
  id: number;
  name: string;
}

export interface RedmineConnectionStatus {
  configured: boolean;
  connected: boolean;
  message: string;
  account?: {
    id: number;
    login: string;
    name: string;
  };
  project?: RedmineOption;
  trackers: RedmineOption[];
  statuses: RedmineOption[];
  activities: RedmineOption[];
  versions: RedmineOption[];
}

export type AutomationTaskAction = "create" | "reuse" | "conflict" | "blocked";
export type AutomationEntryAction = "create" | "duplicate" | "blocked";

export interface AutomationTaskPreview {
  title: string;
  action: AutomationTaskAction;
  trackerId: number;
  activityId: number;
  issueId: number | null;
  candidates: Array<{ id: number; subject: string }>;
  message: string;
}

export interface AutomationEntryPreview {
  key: string;
  title: string;
  action: AutomationEntryAction;
  issueId: number | null;
  hours: number;
  spentOn: string;
  activityId: number;
  marker: string;
  message: string;
}

export interface AutomationPreview {
  previewId: string;
  expiresAt: string;
  account: NonNullable<RedmineConnectionStatus["account"]>;
  project: RedmineOption;
  tasks: AutomationTaskPreview[];
  entries: AutomationEntryPreview[];
  blockers: string[];
  canSubmit: boolean;
  summary: {
    tasksToCreate: number;
    tasksToReuse: number;
    taskConflicts: number;
    entriesToCreate: number;
    duplicateEntries: number;
    blockedEntries: number;
  };
}

export interface AutomationSubmissionResult {
  previewId: string;
  completed: boolean;
  halted: boolean;
  message: string;
  tasks: Array<{
    title: string;
    status: "created" | "reused" | "failed";
    issueId: number | null;
    message: string;
  }>;
  entries: Array<{
    key: string;
    title: string;
    status: "created" | "skipped" | "failed";
    timeEntryId: number | null;
    message: string;
  }>;
}

export interface ApiErrorResponse {
  error: string;
  details?: string[];
}
