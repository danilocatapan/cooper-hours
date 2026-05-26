import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { JsonPreview } from "@/design-system/components/JsonPreview";
import { SectionCard } from "@/design-system/components/SectionCard";
import { activityOptions, trackerOptions } from "../constants";
import { getDefaultTaskConfig, normalizeTitle } from "../report";
import type { TaskConfig, TaskDefaults } from "../types";

interface TasksPanelProps {
  importedMonth: string;
  uniqueTaskTitles: string[];
  taskDefaults: TaskDefaults;
  taskConfigs: Record<string, TaskConfig>;
  tasksJsonText: string;
  copied: boolean;
  onTaskDefaultChange: (key: keyof TaskDefaults, value: string) => void;
  onTaskConfigChange: (title: string, key: keyof TaskConfig, value: string) => void;
  onCopyTasks: () => void;
}

export function TasksPanel({
  importedMonth,
  uniqueTaskTitles,
  taskDefaults,
  taskConfigs,
  tasksJsonText,
  copied,
  onTaskDefaultChange,
  onTaskConfigChange,
  onCopyTasks,
}: TasksPanelProps) {
  return (
    <div className="space-y-6">
      <SectionCard
        className="border-surface-border"
        title={(
          <span className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Criar Tarefas
          </span>
        )}
        description="Uma tarefa por título único do CSV, mantendo exatamente o contrato de criação em lote."
        contentClassName="space-y-6"
      >
        <section className="rounded-lg border border-surface-border bg-surface-subtle p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Dados padrão da tarefa</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="project-id" className="text-xs font-semibold text-muted-foreground">Projeto (project_id)</Label>
              <Input id="project-id" inputMode="numeric" value={taskDefaults.projectId} onChange={(event) => onTaskDefaultChange("projectId", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned-to-id" className="text-xs font-semibold text-muted-foreground">Responsável (assigned_to_id)</Label>
              <Input id="assigned-to-id" inputMode="numeric" value={taskDefaults.assignedToId} onChange={(event) => onTaskDefaultChange("assignedToId", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-xs font-semibold text-muted-foreground">Início (start_date)</Label>
              <Input id="start-date" type="date" value={taskDefaults.startDate} onChange={(event) => onTaskDefaultChange("startDate", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date" className="text-xs font-semibold text-muted-foreground">Prazo (due_date)</Label>
              <Input id="due-date" type="date" value={taskDefaults.dueDate} onChange={(event) => onTaskDefaultChange("dueDate", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-id" className="text-xs font-semibold text-muted-foreground">Status (status_id)</Label>
              <Input id="status-id" inputMode="numeric" value={taskDefaults.statusId} onChange={(event) => onTaskDefaultChange("statusId", event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2 xl:col-span-1">
              <Label htmlFor="fixed-version-name" className="text-xs font-semibold text-muted-foreground">Sprint/Versão (fixed_version_name)</Label>
              <Input id="fixed-version-name" value={taskDefaults.fixedVersionName} onChange={(event) => onTaskDefaultChange("fixedVersionName", event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground">Descrição (description)</Label>
              <Textarea id="description" className="min-h-24" value={taskDefaults.description} onChange={(event) => onTaskDefaultChange("description", event.target.value)} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface-subtle p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Títulos encontrados</h3>
              <p className="text-xs text-muted-foreground">{uniqueTaskTitles.length} tarefa(s) serão geradas.</p>
            </div>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">{importedMonth}</Badge>
          </div>
          <div className="space-y-3">
            {uniqueTaskTitles.map((title) => (
              <div key={title} className="grid grid-cols-1 gap-4 rounded-lg border border-surface-border bg-surface-raised p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_190px_190px_160px] lg:items-end">
                <div className="min-w-0 lg:pb-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Assunto (subject)</Label>
                  <p className="mt-2 break-words text-sm font-semibold leading-5 text-foreground">{title}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Tipo (tracker_id)</Label>
                  <Select value={taskConfigs[title]?.trackerId ?? getDefaultTaskConfig(title).trackerId} onValueChange={(value) => onTaskConfigChange(title, "trackerId", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {trackerOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label} ({option.value})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Atividade (activity_id)</Label>
                  <Select value={taskConfigs[title]?.activityId ?? getDefaultTaskConfig(title).activityId} onValueChange={(value) => onTaskConfigChange(title, "activityId", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label} ({option.value})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`issue-${normalizeTitle(title)}`} className="text-xs font-semibold text-muted-foreground">Issue pós-Cecis (issue_id)</Label>
                  <Input id={`issue-${normalizeTitle(title)}`} inputMode="numeric" placeholder="Opcional" value={taskConfigs[title]?.issueId ?? ""} onChange={(event) => onTaskConfigChange(title, "issueId", event.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </SectionCard>

      <JsonPreview
        className="border-surface-border"
        title="JSON para Cecis"
        description="Saída para criar tarefas, preservando o contrato exato do Cecis."
        value={tasksJsonText}
        copied={copied}
        testId="tasks-json"
        onCopy={onCopyTasks}
      />
    </div>
  );
}
