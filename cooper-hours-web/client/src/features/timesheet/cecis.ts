import type { ParsedIssue, TaskConfig, TaskDefaults, TimeEntryDraft } from "./types";
import { getDefaultTaskConfig, normalizeTitle, parseInteger } from "./report";

export function parseCecisIssues(text: string): ParsedIssue[] {
  const matches = Array.from(text.matchAll(/ID\s+(\d+)\s*[-\u2013\u2014]\s*([^\u2022\n\r]+?)(?=\s*[-\u2013\u2014]\s*(?:tracker|assigned_to|fixed_version|status|start|due)\b|$|\u2022)/gi));
  return matches.map((match) => ({
    issueId: match[1],
    title: match[2].trim(),
  }));
}

export function findTaskTitleForParsedIssue(parsedTitle: string, taskTitles: string[]): string | undefined {
  const normalizedParsedTitle = normalizeTitle(parsedTitle);
  return taskTitles.find((title) => normalizeTitle(title) === normalizedParsedTitle)
    ?? taskTitles.find((title) => {
      const normalizedTaskTitle = normalizeTitle(title);
      return normalizedTaskTitle.includes(normalizedParsedTitle) || normalizedParsedTitle.includes(normalizedTaskTitle);
    });
}

export function buildTasksJson(
  taskTitles: string[],
  taskDefaults: TaskDefaults,
  taskConfigs: Record<string, TaskConfig>
): string {
  const tasks = taskTitles.map((title) => ({
    subject: title,
    project_id: parseInteger(taskDefaults.projectId),
    assigned_to_id: parseInteger(taskDefaults.assignedToId),
    tracker_id: parseInteger(taskConfigs[title]?.trackerId ?? taskDefaults.trackerId),
    start_date: taskDefaults.startDate,
    due_date: taskDefaults.dueDate,
    status_id: parseInteger(taskDefaults.statusId),
    fixed_version_name: taskDefaults.fixedVersionName,
    description: taskDefaults.description,
  }));

  return JSON.stringify({ action: "create_tasks_batch", tasks }, null, 2);
}

export function getReadyTimeEntries(timeEntries: TimeEntryDraft[]) {
  return timeEntries
    .filter((entry) => entry.issue_id > 0 && entry.activity_id > 0)
    .map(({ title: _title, ...entry }) => entry);
}

export function getPendingTimeEntryTitles(timeEntries: TimeEntryDraft[]): string[] {
  const pending = new Set<string>();
  timeEntries.forEach((entry) => {
    if (entry.issue_id <= 0 || entry.activity_id <= 0) pending.add(entry.title);
  });
  return Array.from(pending).sort((a, b) => a.localeCompare(b));
}

export function getConflictTaskTitles(cecisResponseText: string, taskTitles: string[]): string[] {
  const counts = new Map<string, number>();
  parseCecisIssues(cecisResponseText).forEach((issue) => {
    const matchingTitle = findTaskTitleForParsedIssue(issue.title, taskTitles);
    if (!matchingTitle) return;
    counts.set(matchingTitle, (counts.get(matchingTitle) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([title]) => title);
}

export function applyCecisIssuesToTaskConfigs(
  text: string,
  taskTitles: string[],
  currentConfigs: Record<string, TaskConfig>
): Record<string, TaskConfig> {
  const next = { ...currentConfigs };

  parseCecisIssues(text).forEach((issue) => {
    const matchingTitle = findTaskTitleForParsedIssue(issue.title, taskTitles);
    if (!matchingTitle) return;

    next[matchingTitle] = {
      ...(next[matchingTitle] ?? getDefaultTaskConfig(matchingTitle)),
      issueId: issue.issueId,
    };
  });

  return next;
}
