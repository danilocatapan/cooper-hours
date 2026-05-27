import { AlertCircle, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStepperProps {
  completeDays: number;
  businessDayCount: number;
  taskCount: number;
  mappedTimeEntries: number;
  totalTimeEntries: number;
  blockerCount: number;
}

const iconClassName = "h-4 w-4";

export function WorkflowStepper({
  completeDays,
  businessDayCount,
  taskCount,
  mappedTimeEntries,
  totalTimeEntries,
  blockerCount,
}: WorkflowStepperProps) {
  const steps = [
    {
      label: "Conferir",
      detail: `${completeDays}/${businessDayCount} dias úteis`,
      Icon: FileCheck2,
      state: completeDays === businessDayCount ? "ready" : "attention",
    },
    {
      label: "Criar tarefas",
      detail: `${taskCount} título(s)`,
      Icon: ClipboardList,
      state: taskCount > 0 ? "ready" : "idle",
    },
    {
      label: "Mapear IDs",
      detail: blockerCount > 0 ? `${blockerCount} pendente(s)` : "sem pendências",
      Icon: Clock3,
      state: blockerCount > 0 ? "attention" : "ready",
    },
    {
      label: "Copiar lançamentos",
      detail: `${mappedTimeEntries}/${totalTimeEntries} pronto(s)`,
      Icon: ClipboardCheck,
      state: totalTimeEntries > 0 && mappedTimeEntries === totalTimeEntries ? "ready" : "attention",
    },
  ] as const;

  return (
    <nav aria-label="Progresso do fluxo CSV para Cecis" className="rounded-lg border border-border bg-card p-3">
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map(({ label, detail, Icon, state }, index) => (
          <li
            key={label}
            className={cn(
              "flex items-center gap-3 rounded-md border p-3",
              state === "ready" && "border-success/30 bg-success/10",
              state === "attention" && "border-warning/40 bg-warning/10",
              state === "idle" && "border-border bg-surface-subtle"
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current text-sm font-semibold">
              {state === "ready" ? <CheckCircle2 className={iconClassName} /> : state === "attention" ? <AlertCircle className={iconClassName} /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{index + 1}. {label}</span>
              <span className="block truncate text-xs text-muted-foreground">{detail}</span>
            </span>
            <Icon className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </li>
        ))}
      </ol>
    </nav>
  );
}
