import { useMemo, useState } from "react";
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
  const [taskFilter, setTaskFilter] = useState("");
  const [showIssuePendingOnly, setShowIssuePendingOnly] = useState(false);
  const denseMode = uniqueTaskTitles.length >= 10;
  const filteredTaskTitles = useMemo(() => {
    const normalizedFilter = normalizeTitle(taskFilter);
    return uniqueTaskTitles.filter((title) => {
      const config = taskConfigs[title] ?? getDefaultTaskConfig(title);
      const matchesFilter = !normalizedFilter || normalizeTitle(title).includes(normalizedFilter);
      const matchesPending = !showIssuePendingOnly || !config.issueId;
      return matchesFilter && matchesPending;
    });
  }, [showIssuePendingOnly, taskConfigs, taskFilter, uniqueTaskTitles]);

  return (
    <div className="space-y-6">
      <SectionCard
        className="border-surface-border"
        title={(
          <span className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Criar tarefas
          </span>
        )}
        description="Uma tarefa por título único do CSV, mantendo exatamente o contrato de criação em lote."
        contentClassName="space-y-6"
      >
        <section className="rounded-lg border border-surface-border bg-surface-subtle p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Dados padrão da tarefa</h3>
              <p className="text-sm leading-6 text-muted-foreground">O nome amigável aparece primeiro; o campo da API fica entre parênteses.</p>
            </div>
            <details className="max-w-sm rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
              <summary className="cursor-pointer font-semibold text-foreground">Termos Cecis</summary>
              <p className="mt-2">Projeto identifica o produto, responsável recebe a tarefa, tipo define o fluxo e atividade classifica o lançamento de horas.</p>
            </details>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <FieldInput id="project-id" label="Projeto" apiName="project_id" value={taskDefaults.projectId} onChange={(value) => onTaskDefaultChange("projectId", value)} />
            <FieldInput id="assigned-to-id" label="Responsável" apiName="assigned_to_id" value={taskDefaults.assignedToId} onChange={(value) => onTaskDefaultChange("assignedToId", value)} />
            <FieldInput id="start-date" label="Início" apiName="start_date" type="date" value={taskDefaults.startDate} onChange={(value) => onTaskDefaultChange("startDate", value)} />
            <FieldInput id="due-date" label="Prazo" apiName="due_date" type="date" value={taskDefaults.dueDate} onChange={(value) => onTaskDefaultChange("dueDate", value)} />
            <FieldInput id="status-id" label="Status" apiName="status_id" value={taskDefaults.statusId} onChange={(value) => onTaskDefaultChange("statusId", value)} />
            <div className="space-y-2 sm:col-span-2 xl:col-span-1">
              <Label htmlFor="fixed-version-name" className="text-sm font-semibold text-muted-foreground">Sprint/Versão <span className="font-mono font-normal">(fixed_version_name)</span></Label>
              <Input id="fixed-version-name" value={taskDefaults.fixedVersionName} onChange={(event) => onTaskDefaultChange("fixedVersionName", event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description" className="text-sm font-semibold text-muted-foreground">Descrição <span className="font-mono font-normal">(description)</span></Label>
              <Textarea id="description" className="min-h-24" value={taskDefaults.description} onChange={(event) => onTaskDefaultChange("description", event.target.value)} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface-subtle p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Títulos encontrados</h3>
              <p className="text-sm text-muted-foreground">{uniqueTaskTitles.length} tarefa(s) serão geradas.</p>
            </div>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">{importedMonth}</Badge>
          </div>

          {denseMode && (
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="task-filter" className="text-sm font-semibold text-muted-foreground">Buscar título</Label>
                <Input id="task-filter" value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)} placeholder="Filtrar por assunto" />
              </div>
              <label className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={showIssuePendingOnly}
                  onChange={(event) => setShowIssuePendingOnly(event.target.checked)}
                  className="h-4 w-4"
                />
                Somente sem issue
              </label>
            </div>
          )}

          {denseMode ? (
            <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface-raised">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface-subtle text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="sticky left-0 bg-surface-subtle px-3 py-2">Assunto</th>
                    <th scope="col" className="px-3 py-2">Tipo</th>
                    <th scope="col" className="px-3 py-2">Atividade</th>
                    <th scope="col" className="px-3 py-2">Issue pós-Cecis</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTaskTitles.map((title) => (
                    <tr key={title} className="border-t border-surface-border">
                      <td className="sticky left-0 max-w-sm bg-surface-raised px-3 py-3 font-medium text-foreground">
                        <HighlightedTitle title={title} filter={taskFilter} />
                      </td>
                      <td className="px-3 py-3">
                        <TaskSelect title={title} label="Tipo" field="trackerId" value={taskConfigs[title]?.trackerId ?? getDefaultTaskConfig(title).trackerId} options={trackerOptions} onTaskConfigChange={onTaskConfigChange} />
                      </td>
                      <td className="px-3 py-3">
                        <TaskSelect title={title} label="Atividade" field="activityId" value={taskConfigs[title]?.activityId ?? getDefaultTaskConfig(title).activityId} options={activityOptions} onTaskConfigChange={onTaskConfigChange} />
                      </td>
                      <td className="px-3 py-3">
                        <IssueInput title={title} value={taskConfigs[title]?.issueId ?? ""} onTaskConfigChange={onTaskConfigChange} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTaskTitles.map((title) => (
                <div key={title} className="grid grid-cols-1 gap-4 rounded-lg border border-surface-border bg-surface-raised p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_190px_190px_160px] lg:items-end">
                  <div className="min-w-0 lg:pb-1">
                    <Label className="text-sm font-semibold text-muted-foreground">Assunto <span className="font-mono font-normal">(subject)</span></Label>
                    <p className="mt-2 break-words text-sm font-semibold leading-5 text-foreground">
                      <HighlightedTitle title={title} filter={taskFilter} />
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">Tipo <span className="font-mono font-normal">(tracker_id)</span></Label>
                    <TaskSelect title={title} label="Tipo" field="trackerId" value={taskConfigs[title]?.trackerId ?? getDefaultTaskConfig(title).trackerId} options={trackerOptions} onTaskConfigChange={onTaskConfigChange} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">Atividade <span className="font-mono font-normal">(activity_id)</span></Label>
                    <TaskSelect title={title} label="Atividade" field="activityId" value={taskConfigs[title]?.activityId ?? getDefaultTaskConfig(title).activityId} options={activityOptions} onTaskConfigChange={onTaskConfigChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`issue-${normalizeTitle(title)}`} className="text-sm font-semibold text-muted-foreground">Issue pós-Cecis <span className="font-mono font-normal">(issue_id)</span></Label>
                    <IssueInput id={`issue-${normalizeTitle(title)}`} title={title} value={taskConfigs[title]?.issueId ?? ""} onTaskConfigChange={onTaskConfigChange} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 rounded-lg border border-selection/30 bg-selection/10 p-3 text-sm leading-6 text-foreground">
            O issue_id pode ser informado manualmente em cada tarefa ou preenchido em lote na etapa “Mapear IDs” ao colar a resposta da Cecis.
          </p>
        </section>
      </SectionCard>

      <JsonPreview
        className="border-surface-border"
        title="JSON para Cecis"
        description="Saída para criar tarefas, preservando o contrato exato do Cecis."
        value={tasksJsonText}
        copied={copied}
        testId="tasks-json"
        validation={{
          tone: uniqueTaskTitles.length > 0 ? "ready" : "blocked",
          title: uniqueTaskTitles.length > 0 ? "Pronto para copiar" : "Sem tarefas para copiar",
          description: uniqueTaskTitles.length > 0 ? `${uniqueTaskTitles.length} tarefa(s) serão enviadas no contrato de criação em lote.` : "Importe um CSV com títulos válidos antes de copiar.",
        }}
        copyDisabled={uniqueTaskTitles.length === 0}
        onCopy={onCopyTasks}
      />
    </div>
  );
}

function FieldInput({
  id,
  label,
  apiName,
  type = "text",
  value,
  onChange,
}: {
  id: string;
  label: string;
  apiName: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold text-muted-foreground">{label} <span className="font-mono font-normal">({apiName})</span></Label>
      <Input id={id} type={type} inputMode={type === "date" ? undefined : "numeric"} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TaskSelect({
  title,
  label,
  field,
  value,
  options,
  onTaskConfigChange,
}: {
  title: string;
  label: string;
  field: "trackerId" | "activityId";
  value: string;
  options: Array<{ value: string; label: string }>;
  onTaskConfigChange: (title: string, key: keyof TaskConfig, value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onTaskConfigChange(title, field, nextValue)}>
      <SelectTrigger className="w-full" aria-label={`${label} de ${title}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label} - ID {option.value}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function IssueInput({
  id,
  title,
  value,
  onTaskConfigChange,
}: {
  id?: string;
  title: string;
  value: string;
  onTaskConfigChange: (title: string, key: keyof TaskConfig, value: string) => void;
}) {
  const invalid = Boolean(value) && !/^\d+$/.test(value);
  return (
    <>
      <Input
        id={id}
        aria-label={id ? undefined : `Issue pós-Cecis de ${title}`}
        aria-invalid={invalid}
        inputMode="numeric"
        placeholder="Opcional"
        value={value}
        onChange={(event) => onTaskConfigChange(title, "issueId", event.target.value)}
      />
      {invalid && <p className="mt-1 text-sm text-danger">Use apenas números.</p>}
    </>
  );
}

function HighlightedTitle({ title, filter }: { title: string; filter: string }) {
  const normalizedFilter = normalizeTitle(filter);
  if (!normalizedFilter) return <>{title}</>;

  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle.includes(normalizedFilter)) return <>{title}</>;

  const rawIndex = title.toLowerCase().indexOf(filter.toLowerCase());
  if (rawIndex < 0) return <>{title}</>;

  return (
    <>
      {title.slice(0, rawIndex)}
      <mark className="rounded-sm bg-selection/20 px-0.5 text-foreground">{title.slice(rawIndex, rawIndex + filter.length)}</mark>
      {title.slice(rawIndex + filter.length)}
    </>
  );
}
