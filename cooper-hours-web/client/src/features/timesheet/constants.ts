import type { TaskDefaults } from "./types";

export const DAILY_TARGET_HOURS = 8;
export const HOUR_TOLERANCE = 0.01;

export const TASK_LAUNCH_CONTEXT = {
  project: {
    value: "333",
    label: "Maestro Cloud BB Corretora",
  },
  assignedTo: {
    value: "388",
    label: "Danilo Rodrigues Catapan",
  },
  status: {
    value: "3",
    label: "Em execução",
  },
  fixedVersion: {
    placeholder: "Ex.: SPRINT 113",
    label: "Informe a sprint vigente",
    cadenceLabel: "Normalmente atualizada a cada 15 dias",
  },
} as const;

export const DEFAULT_TASKS: TaskDefaults = {
  projectId: TASK_LAUNCH_CONTEXT.project.value,
  assignedToId: TASK_LAUNCH_CONTEXT.assignedTo.value,
  trackerId: "4",
  startDate: "2026-04-01",
  dueDate: "2026-04-15",
  statusId: TASK_LAUNCH_CONTEXT.status.value,
  fixedVersionName: "",
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
