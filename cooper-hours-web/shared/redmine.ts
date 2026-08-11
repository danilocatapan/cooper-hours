import { z } from "zod";

export const REDMINE_REQUEST_HEADER = "X-Cooper-Hours-Request";
export const REDMINE_REQUEST_HEADER_VALUE = "1";
export const REDMINE_AUTH_SCHEME = "RedmineKey";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sourceKeySchema = z.string().trim().min(1).max(300);

export const automationPreviewRequestSchema = z.object({
  importedMonth: z.string().regex(/^\d{4}-\d{2}$/),
  minDate: isoDateSchema,
  maxDate: isoDateSchema,
  tasks: z.array(z.object({
    sourceKey: sourceKeySchema,
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
    sourceKey: sourceKeySchema,
    title: z.string().trim().min(1).max(255),
    hours: z.number().positive().max(24),
    spentOn: isoDateSchema,
    activityId: z.number().int().positive(),
  }).strict()).min(1).max(1_000),
}).strict().refine((value) => value.minDate <= value.maxDate, {
  message: "O período importado é inválido.",
  path: ["maxDate"],
}).superRefine((value, context) => {
  const taskKeys = new Set<string>();
  value.tasks.forEach((task, index) => {
    if (taskKeys.has(task.sourceKey)) context.addIssue({ code: "custom", message: "A chave de origem da tarefa deve ser única.", path: ["tasks", index, "sourceKey"] });
    taskKeys.add(task.sourceKey);
  });
  const entryKeys = new Set<string>();
  value.entries.forEach((entry, index) => {
    if (entryKeys.has(entry.sourceKey)) context.addIssue({ code: "custom", message: "A chave de origem do lançamento deve ser única.", path: ["entries", index, "sourceKey"] });
    entryKeys.add(entry.sourceKey);
    const separator = entry.sourceKey.lastIndexOf("::entry::");
    const taskKey = separator < 0 ? "" : entry.sourceKey.slice(0, separator);
    if (!taskKeys.has(taskKey)) context.addIssue({ code: "custom", message: "O lançamento não corresponde a uma tarefa importada.", path: ["entries", index, "sourceKey"] });
  });
});

export const automationSubmitRequestSchema = z.object({
  previewId: z.string().uuid(),
}).strict();

export type AutomationPreviewRequest = z.infer<typeof automationPreviewRequestSchema>;

export interface RedmineOption {
  id: number;
  name: string;
}

export type RedmineWriteMode = "disabled" | "create" | "create-update";

export interface RedmineConnectionStatus {
  configured: boolean;
  connected: boolean;
  message: string;
  writeMode: RedmineWriteMode;
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

export interface AutomationChange {
  field: string;
  before: string | number | null;
  after: string | number | null;
}

export type AutomationTaskAction = "create" | "update" | "reuse" | "conflict" | "blocked";
export type AutomationEntryAction = "create" | "update" | "duplicate" | "blocked";

export interface AutomationTaskPreview {
  sourceKey: string;
  title: string;
  action: AutomationTaskAction;
  trackerId: number;
  activityId: number;
  issueId: number | null;
  candidates: Array<{ id: number; subject: string }>;
  changes: AutomationChange[];
  message: string;
}

export interface AutomationEntryPreview {
  sourceKey: string;
  key: string;
  title: string;
  action: AutomationEntryAction;
  issueId: number | null;
  timeEntryId: number | null;
  hours: number;
  spentOn: string;
  activityId: number;
  marker: string;
  changes: AutomationChange[];
  message: string;
}

export interface AutomationPreview {
  previewId: string;
  expiresAt: string;
  account: NonNullable<RedmineConnectionStatus["account"]>;
  project: RedmineOption;
  writeMode: RedmineWriteMode;
  tasks: AutomationTaskPreview[];
  entries: AutomationEntryPreview[];
  blockers: string[];
  canSubmit: boolean;
  summary: {
    tasksToCreate: number;
    tasksToUpdate: number;
    tasksToReuse: number;
    taskConflicts: number;
    entriesToCreate: number;
    entriesToUpdate: number;
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
    status: "created" | "updated" | "reused" | "failed";
    issueId: number | null;
    message: string;
  }>;
  entries: Array<{
    key: string;
    title: string;
    status: "created" | "updated" | "skipped" | "failed";
    timeEntryId: number | null;
    message: string;
  }>;
}

export interface ApiErrorResponse {
  error: string;
  details?: string[];
}
