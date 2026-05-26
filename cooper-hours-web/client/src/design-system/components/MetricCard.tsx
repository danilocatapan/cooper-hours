import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TimesheetStatus } from "@/features/timesheet/types";
import { statusMap } from "../status";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  status?: TimesheetStatus;
}

export function MetricCard({ label, value, status = "neutral" }: MetricCardProps) {
  return (
    <div className={cn("rounded-lg border p-4", statusMap[status].metricClassName)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-current">{value}</p>
    </div>
  );
}
