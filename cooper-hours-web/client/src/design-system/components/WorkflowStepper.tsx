import { CheckCircle2, ClipboardCheck, ClipboardList, Clock3, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStepId = "conference" | "tasks" | "map" | "copy";
type WorkflowStepState = "pending" | "available" | "attention" | "complete";

interface WorkflowStepperProps {
  activeStep: WorkflowStepId;
  completeDays: number;
  businessDayCount: number;
  taskCount: number;
  tasksCopied: boolean;
  mappedTimeEntries: number;
  totalTimeEntries: number;
  blockerCount: number;
  timeEntriesCopied: boolean;
  onStepSelect: (step: WorkflowStepId) => void;
}

const stateLabels: Record<WorkflowStepState, string> = {
  pending: "Pendente",
  available: "Disponível",
  attention: "Requer atenção",
  complete: "Concluída",
};

export function WorkflowStepper({
  activeStep,
  completeDays,
  businessDayCount,
  taskCount,
  tasksCopied,
  mappedTimeEntries,
  totalTimeEntries,
  blockerCount,
  timeEntriesCopied,
  onStepSelect,
}: WorkflowStepperProps) {
  const allDaysComplete = businessDayCount > 0 && completeDays === businessDayCount;
  const allEntriesMapped = totalTimeEntries > 0 && blockerCount === 0 && mappedTimeEntries === totalTimeEntries;
  const steps: Array<{
    id: WorkflowStepId;
    label: string;
    detail: string;
    state: WorkflowStepState;
    Icon: typeof FileCheck2;
  }> = [
    {
      id: "conference",
      label: "Conferir",
      detail: `${completeDays}/${businessDayCount} dias úteis`,
      Icon: FileCheck2,
      state: allDaysComplete ? "complete" : "attention",
    },
    {
      id: "tasks",
      label: "Criar tarefas",
      detail: tasksCopied ? "Mensagem atual copiada" : `${taskCount} título(s) para revisar`,
      Icon: ClipboardList,
      state: tasksCopied ? "complete" : taskCount > 0 ? "available" : "pending",
    },
    {
      id: "map",
      label: "Mapear IDs",
      detail: allEntriesMapped ? "sem pendências" : `${blockerCount} pendente(s)`,
      Icon: Clock3,
      state: allEntriesMapped ? "complete" : totalTimeEntries > 0 ? "attention" : "pending",
    },
    {
      id: "copy",
      label: "Copiar mensagem",
      detail: timeEntriesCopied ? "Mensagem atual copiada" : `${mappedTimeEntries}/${totalTimeEntries} pronto(s)`,
      Icon: ClipboardCheck,
      state: timeEntriesCopied ? "complete" : allEntriesMapped ? "available" : "pending",
    },
  ];

  return (
    <nav aria-label="Etapas do fluxo CSV para Cesis" className="rounded-lg border border-border bg-card p-3">
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map(({ id, label, detail, Icon, state }, index) => {
          const active = activeStep === id;
          return (
            <li key={id}>
              <button
                type="button"
                data-testid={`workflow-step-${id}`}
                aria-current={active ? "step" : undefined}
                onClick={() => onStepSelect(id)}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45",
                  state === "complete" && "border-success/40 bg-success/10",
                  state === "available" && "border-selection/40 bg-selection/10",
                  state === "attention" && "border-warning/40 bg-warning/10",
                  state === "pending" && "border-border bg-surface-subtle",
                  active && "border-selection ring-2 ring-selection/35"
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current text-sm font-semibold" aria-hidden="true">
                  {state === "complete" ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{label}</span>
                  <span className="block text-sm text-muted-foreground">{detail}</span>
                  <span className="sr-only">Estado: {stateLabels[state]}.</span>
                </span>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
