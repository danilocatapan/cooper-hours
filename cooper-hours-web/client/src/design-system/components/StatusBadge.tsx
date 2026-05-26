import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TimesheetStatus } from "@/features/timesheet/types";
import { statusMap } from "../status";

interface StatusBadgeProps {
  status: TimesheetStatus;
  children?: ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium", statusMap[status].badgeClassName, className)}>
      {children ?? statusMap[status].label}
    </span>
  );
}
