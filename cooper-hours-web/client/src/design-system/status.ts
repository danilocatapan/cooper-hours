import { AlertCircle, CheckCircle2, Info, TrendingUp, type LucideIcon } from "lucide-react";
import type { TimesheetStatus } from "@/features/timesheet/types";

interface StatusDefinition {
  label: string;
  Icon: LucideIcon;
  iconClassName: string;
  badgeClassName: string;
  panelClassName: string;
  metricClassName: string;
}

export const statusMap: Record<TimesheetStatus, StatusDefinition> = {
  complete: {
    label: "8h completas",
    Icon: CheckCircle2,
    iconClassName: "text-success",
    badgeClassName: "border-success/30 bg-success/10 text-success",
    panelClassName: "border-success/30 bg-success/10",
    metricClassName: "border-success/30 bg-success/10 text-success",
  },
  pending: {
    label: "Pendente",
    Icon: AlertCircle,
    iconClassName: "text-danger",
    badgeClassName: "border-danger/30 bg-danger/10 text-danger",
    panelClassName: "border-danger/30 bg-danger/10",
    metricClassName: "border-danger/30 bg-danger/10 text-danger",
  },
  over: {
    label: "Acima da meta",
    Icon: TrendingUp,
    iconClassName: "text-warning",
    badgeClassName: "border-warning/40 bg-warning/10 text-warning",
    panelClassName: "border-warning/40 bg-warning/10",
    metricClassName: "border-warning/40 bg-warning/10 text-warning",
  },
  missing: {
    label: "Ausente",
    Icon: AlertCircle,
    iconClassName: "text-danger",
    badgeClassName: "border-danger/30 bg-danger/10 text-danger",
    panelClassName: "border-danger/30 bg-danger/10",
    metricClassName: "border-danger/30 bg-danger/10 text-danger",
  },
  optional: {
    label: "Extra",
    Icon: TrendingUp,
    iconClassName: "text-warning",
    badgeClassName: "border-warning/40 bg-warning/10 text-warning",
    panelClassName: "border-warning/40 bg-warning/10",
    metricClassName: "border-warning/40 bg-warning/10 text-warning",
  },
  invalid: {
    label: "Inválido",
    Icon: AlertCircle,
    iconClassName: "text-destructive",
    badgeClassName: "border-destructive/30 bg-destructive/10 text-destructive",
    panelClassName: "border-destructive/30 bg-destructive/10",
    metricClassName: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  neutral: {
    label: "Neutro",
    Icon: Info,
    iconClassName: "text-muted-foreground",
    badgeClassName: "border-border bg-surface-subtle text-muted-foreground",
    panelClassName: "border-border bg-surface-subtle",
    metricClassName: "border-border bg-surface-subtle text-foreground",
  },
};
