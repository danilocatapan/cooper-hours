import type { TaskDefaults } from "./types";

export const DAILY_TARGET_HOURS = 8;
export const HOUR_TOLERANCE = 0.01;

export const DEFAULT_TASKS: TaskDefaults = {
  projectId: "333",
  assignedToId: "388",
  trackerId: "4",
  startDate: "2026-04-01",
  dueDate: "2026-04-15",
  statusId: "3",
  fixedVersionName: "SPRINT 103",
  description: "Detalhes...",
};

export const trackerOptions = [
  { value: "4", label: "Desenvolvimento" },
  { value: "21", label: "Reuniões" },
  { value: "12", label: "Análise e Refinamento" },
];

export const activityOptions = [
  { value: "9", label: "Desenvolvimento" },
  { value: "10", label: "Reuniões" },
  { value: "20", label: "Análise e Refinamento" },
];
