import { useMemo, useState } from "react";
import { CalendarRange, CircleUserRound, ClipboardList, FolderKanban, ShieldCheck, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessagePreview } from "@/design-system/components/MessagePreview";
import { SectionCard } from "@/design-system/components/SectionCard";
import { activityOptions, TASK_LAUNCH_CONTEXT, trackerOptions } from "../constants";
import { getDefaultTaskConfig, normalizeTitle } from "../report";
import type { CecisMessageResult, TaskConfig, TaskDefaults } from "../types";

interface TasksPanelProps {
  importedMonth: string;
  uniqueTaskTitles: string[];
  taskDefaults: TaskDefaults;
  taskConfigs: Record<string, TaskConfig>;
  tasksMessageResult: CecisMessageResult;
  copied: boolean;
  taskContextConfirmed: boolean;
  onTaskDefaultChange: (key: keyof TaskDefaults, value: string) => void;
  onTaskContextConfirmedChange: (confirmed: boolean) => void;
  onTaskConfigChange: (title: string, key: keyof TaskConfig, value: string) => void;
  onCopyTasks: () => void;
}

export function TasksPanel({
  importedMonth,
  uniqueTaskTitles,
  taskDefaults,
  taskConfigs,
  tasksMessageResult,
  copied,
  taskContextConfirmed,
  onTaskDefaultChange,
  onTaskContextConfirmedChange,
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
            Preparar tarefas
          </span>
        )}
        description="Revise os dados e prepare uma tarefa por título único do CSV, sem criar nada automaticamente."
        contentClassName="space-y-6"
      >
        <section className="overflow-hidden rounded-xl border border-warning/50 bg-card shadow-sm">
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Contexto de lançamento no Redmine</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Estes quatro valores serão aplicados a todas as tarefas. Revise-os antes de liberar a cópia.
                </p>
              </div>
              <Badge variant="outline" className="w-fit border-warning/50 bg-warning/15 text-foreground">
                Revisão obrigatória
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            <ContextField
              id="fixed-version-name"
              label="Sprint/Versão"
              apiName="fixed_version_name"
              value={taskDefaults.fixedVersionName}
              friendlyLabel={TASK_LAUNCH_CONTEXT.fixedVersion.label}
              customHelp="Informe a sprint vigente no Redmine antes de confirmar."
              icon={CalendarRange}
              prominent
              placeholder={TASK_LAUNCH_CONTEXT.fixedVersion.placeholder}
              reference={TASK_LAUNCH_CONTEXT.fixedVersion.cadenceLabel}
              onChange={(value) => onTaskDefaultChange("fixedVersionName", value)}
            />
            <ContextField
              id="project-id"
              label="Projeto"
              apiName="project_id"
              value={taskDefaults.projectId}
              expectedValue={TASK_LAUNCH_CONTEXT.project.value}
              friendlyLabel={TASK_LAUNCH_CONTEXT.project.label}
              customHelp="Valor personalizado — confirme o projeto no Redmine."
              icon={FolderKanban}
              inputMode="numeric"
              onChange={(value) => onTaskDefaultChange("projectId", value)}
            />
            <ContextField
              id="assigned-to-id"
              label="Responsável"
              apiName="assigned_to_id"
              value={taskDefaults.assignedToId}
              expectedValue={TASK_LAUNCH_CONTEXT.assignedTo.value}
              friendlyLabel={TASK_LAUNCH_CONTEXT.assignedTo.label}
              customHelp="Valor personalizado — confirme o responsável no Redmine."
              icon={CircleUserRound}
              inputMode="numeric"
              onChange={(value) => onTaskDefaultChange("assignedToId", value)}
            />
            <ContextField
              id="status-id"
              label="Status"
              apiName="status_id"
              value={taskDefaults.statusId}
              expectedValue={TASK_LAUNCH_CONTEXT.status.value}
              friendlyLabel={TASK_LAUNCH_CONTEXT.status.label}
              customHelp="Valor personalizado — confirme o status no Redmine."
              icon={ShieldCheck}
              inputMode="numeric"
              onChange={(value) => onTaskDefaultChange("statusId", value)}
            />
          </div>

          <div className="border-t border-surface-border bg-surface-subtle p-4 sm:p-5">
            <div className={`flex items-start gap-3 rounded-lg border p-4 ${taskContextConfirmed ? "border-success/40 bg-success/10" : "border-warning/50 bg-warning/10"}`}>
              <Checkbox
                id="task-context-confirmation"
                checked={taskContextConfirmed}
                onCheckedChange={(checked) => onTaskContextConfirmedChange(checked === true)}
                aria-describedby="task-context-confirmation-help"
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="task-context-confirmation" className="cursor-pointer text-sm font-semibold leading-5 text-foreground">
                  Revisei projeto, responsável, status e sprint/versão para este lançamento
                </Label>
                <p id="task-context-confirmation-help" aria-live="polite" className="mt-1 text-sm leading-6 text-muted-foreground">
                  {taskContextConfirmed
                    ? "Contexto confirmado. A cópia será liberada se os demais dados forem válidos."
                    : "A cópia das tarefas permanece bloqueada até esta confirmação."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface-subtle p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Outros dados da tarefa</h3>
              <p className="text-sm leading-6 text-muted-foreground">Datas e descrição também serão aplicadas a todas as tarefas.</p>
            </div>
            <details className="max-w-sm rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
              <summary className="cursor-pointer font-semibold text-foreground">Termos da Cesis</summary>
              <p className="mt-2">A Cesis é o fluxo manual autorizado que recebe estas mensagens. Projeto identifica o produto, responsável recebe a tarefa, tipo define o fluxo e atividade classifica o lançamento de horas.</p>
            </details>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <FieldInput id="start-date" label="Início" apiName="start_date" type="date" value={taskDefaults.startDate} onChange={(value) => onTaskDefaultChange("startDate", value)} />
            <FieldInput id="due-date" label="Prazo" apiName="due_date" type="date" value={taskDefaults.dueDate} onChange={(value) => onTaskDefaultChange("dueDate", value)} />
            <div className="space-y-2 sm:col-span-2 xl:col-span-3">
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
                    <th scope="col" className="px-3 py-2">ID da tarefa na Cesis</th>
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
                    <Label className="text-sm font-semibold text-muted-foreground">Categoria de atividade <span className="font-mono font-normal">(activity_id)</span></Label>
                    <TaskSelect title={title} label="Atividade" field="activityId" value={taskConfigs[title]?.activityId ?? getDefaultTaskConfig(title).activityId} options={activityOptions} onTaskConfigChange={onTaskConfigChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`issue-${normalizeTitle(title)}`} className="text-sm font-semibold text-muted-foreground">ID da tarefa na Cesis <span className="font-mono font-normal">(issue_id)</span></Label>
                    <IssueInput id={`issue-${normalizeTitle(title)}`} title={title} value={taskConfigs[title]?.issueId ?? ""} onTaskConfigChange={onTaskConfigChange} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 rounded-lg border border-selection/30 bg-selection/10 p-3 text-sm leading-6 text-foreground">
            O ID da tarefa na Cesis (issue_id) pode ser informado manualmente ou preenchido em lote na etapa “Mapear IDs” ao colar a resposta da Cesis.
          </p>
        </section>
      </SectionCard>

      <MessagePreview
        className="border-surface-border"
        title="Tarefas para a Cesis"
        description="Mensagem preparada para o fluxo manual, com pré-validação, prevenção de duplicidade e payload de criação em lote."
        value={tasksMessageResult.message}
        copied={copied}
        testId="tasks-message"
        validation={{
          tone: !tasksMessageResult.canCopy ? "blocked" : taskContextConfirmed ? "ready" : "warning",
          title: !tasksMessageResult.canCopy
            ? "Corrija os dados antes de copiar"
            : taskContextConfirmed
              ? "Pronto para copiar"
              : "Confirme o contexto do Redmine",
          description: !tasksMessageResult.canCopy
            ? tasksMessageResult.errors.join(" ")
            : taskContextConfirmed
              ? `${uniqueTaskTitles.length} tarefa(s) serão pré-validadas antes de qualquer escrita no Redmine.`
              : "Revise projeto, responsável, status e sprint/versão e marque a confirmação acima.",
        }}
        copyDisabled={!tasksMessageResult.canCopy || !taskContextConfirmed}
        copyLabel="Copiar tarefas"
        onCopy={onCopyTasks}
      />
    </div>
  );
}

function ContextField({
  id,
  label,
  apiName,
  value,
  expectedValue,
  friendlyLabel,
  customHelp,
  reference,
  placeholder,
  icon: Icon,
  prominent = false,
  inputMode,
  onChange,
}: {
  id: string;
  label: string;
  apiName: string;
  value: string;
  expectedValue?: string;
  friendlyLabel: string;
  customHelp: string;
  reference?: string;
  placeholder?: string;
  icon: LucideIcon;
  prominent?: boolean;
  inputMode?: "numeric";
  onChange: (value: string) => void;
}) {
  const empty = !value.trim();
  const customized = expectedValue !== undefined && value !== expectedValue;
  const usesRequiredFreeValue = expectedValue === undefined;
  const helpId = `${id}-context-help`;
  const contextLabel = empty
    ? friendlyLabel
    : usesRequiredFreeValue
      ? value
      : customized
        ? "Valor personalizado"
        : friendlyLabel;
  const badgeLabel = empty
    ? "Preenchimento obrigatório"
    : usesRequiredFreeValue
      ? "Informado para este lançamento"
      : customized
        ? "Revisar no Redmine"
        : `Padrão: ${expectedValue}`;
  const needsReview = empty || customized;

  return (
    <div className={`rounded-lg border p-4 ${prominent ? "border-warning/50 bg-warning/10 sm:col-span-2 xl:col-span-3" : "border-surface-border bg-surface-raised"}`}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${prominent ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"}`} aria-hidden="true">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{contextLabel}</p>
            {reference && <p className="mt-0.5 text-xs text-muted-foreground">{reference}</p>}
          </div>
        </div>
        <Badge variant="outline" className={needsReview ? "shrink-0 border-warning/50 bg-warning/10 text-foreground" : "shrink-0 border-success/30 bg-success/10 text-foreground"}>
          {badgeLabel}
        </Badge>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm font-semibold text-muted-foreground">
          {label} <span className="font-mono font-normal">({apiName})</span>
        </Label>
        <Input
          id={id}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          aria-describedby={helpId}
          onChange={(event) => onChange(event.target.value)}
        />
        <p id={helpId} className={`text-sm leading-5 ${needsReview ? "text-warning" : "text-muted-foreground"}`}>
          {empty
            ? customHelp
            : customized
              ? customHelp
              : usesRequiredFreeValue
                ? "Valor editável confirmado apenas para este lançamento."
                : `${friendlyLabel} — ID ${value}.`}
        </p>
      </div>
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
  const invalid = Boolean(value) && (!/^\d+$/.test(value) || Number(value) <= 0);
  return (
    <>
      <Input
        id={id}
        aria-label={id ? undefined : `ID da tarefa na Cesis para ${title}`}
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
