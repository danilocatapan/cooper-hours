import { AlertCircle, CheckCircle2, Clock3, Link2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessagePreview } from "@/design-system/components/MessagePreview";
import { MetricCard } from "@/design-system/components/MetricCard";
import { SectionCard } from "@/design-system/components/SectionCard";
import { getDefaultTaskConfig, parseInteger } from "../report";
import type { CecisMessageResult, CecisResponseDiagnostics, TaskConfig, TimeEntryDraft } from "../types";

interface TimeEntriesPanelProps {
  uniqueTaskTitles: string[];
  taskConfigs: Record<string, TaskConfig>;
  cecisResponseText: string;
  timeEntries: TimeEntryDraft[];
  readyTimeEntriesLength: number;
  pendingTimeEntryTitles: string[];
  conflictTaskTitles: string[];
  responseDiagnostics: CecisResponseDiagnostics;
  timeEntriesMessageResult: CecisMessageResult;
  copied: boolean;
  completed: boolean;
  onCecisResponseChange: (value: string) => void;
  onApplyCecisResponse: () => void;
  onCopyTimeEntries: () => void;
}

export function TimeEntriesPanel({
  uniqueTaskTitles,
  taskConfigs,
  cecisResponseText,
  timeEntries,
  readyTimeEntriesLength,
  pendingTimeEntryTitles,
  conflictTaskTitles,
  responseDiagnostics,
  timeEntriesMessageResult,
  copied,
  completed,
  onCecisResponseChange,
  onApplyCecisResponse,
  onCopyTimeEntries,
}: TimeEntriesPanelProps) {
  const hasConflicts = conflictTaskTitles.length > 0;
  const hasPending = pendingTimeEntryTitles.length > 0;
  const validation = timeEntriesMessageResult.canCopy
    ? {
        tone: "ready" as const,
        title: "Pronto para copiar",
        description: `${readyTimeEntriesLength} lançamento(s) agrupado(s), com IDs de tarefa e categoria de atividade, prontos para pré-validação no Redmine.`,
      }
    : {
        tone: "blocked" as const,
        title: hasConflicts ? "Conflito detectado" : hasPending ? "Mapeamento incompleto" : "Mensagem bloqueada",
        description: timeEntriesMessageResult.errors.join(" "),
      };

  return (
    <div className="space-y-6">
      <div id="cecis-mapping" tabIndex={-1} className="scroll-mt-4 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45">
        <SectionCard
          title={(
            <span className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Preparar lançamento
            </span>
          )}
          description="Cole a resposta da Cesis para preencher os IDs das tarefas e preparar a mensagem final de horas."
          contentClassName="space-y-5"
        >
        <div className="space-y-2">
          <Label htmlFor="cecis-response">Resposta da Cesis com as issues criadas ou reutilizadas</Label>
          <Textarea
            id="cecis-response"
            data-testid="cecis-response"
            value={cecisResponseText}
            onChange={(event) => onCecisResponseChange(event.target.value)}
            placeholder="Ex.: ID 291631 - Maestro-Refinamentos S2-Abr - tracker..."
            aria-describedby="cecis-response-help"
            className="min-h-32"
          />
          <p id="cecis-response-help" className="text-sm leading-6 text-muted-foreground">
            A resposta deve conter cada ID seguido do título exato da tarefa. Como alternativa, você pode preencher o ID da tarefa na Cesis (issue_id) manualmente na etapa “Preparar tarefas”. A mensagem de horas só pode ser copiada quando todos os IDs estiverem reconhecidos e sem conflitos.
          </p>
          <details className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-semibold text-foreground">Exemplo de resposta da Cesis</summary>
            <p className="mt-2 break-words font-mono text-sm">ID 291631 — Título da tarefa — tracker: Desenvolvimento (5) — resultado: CRIADA</p>
          </details>
          <Button type="button" size="sm" onClick={onApplyCecisResponse}>
            <Link2 className="h-4 w-4" />
            Mapear IDs
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MetricCard label="registro(s) prontos" value={readyTimeEntriesLength} status="complete" />
          <MetricCard label="tarefa(s) pendente(s)" value={pendingTimeEntryTitles.length} status="overTarget" />
          <MetricCard label="lançamento(s) no CSV" value={timeEntries.length} />
        </div>

        {pendingTimeEntryTitles.length > 0 ? (
          <Alert className="border-warning/40 bg-warning/10 text-warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Pendentes de issue_id: {pendingTimeEntryTitles.join("; ")}
            </AlertDescription>
          </Alert>
        ) : null}

        {hasConflicts ? (
          <Alert className="border-danger/30 bg-danger/10 text-danger">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Conflitos na resposta da Cesis: {conflictTaskTitles.join("; ")}
            </AlertDescription>
          </Alert>
        ) : null}

        {responseDiagnostics.unknownTitles.length > 0 ? (
          <Alert className="border-warning/40 bg-warning/10 text-warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Títulos não reconhecidos na resposta da Cesis: {responseDiagnostics.unknownTitles.join("; ")}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-lg border border-border bg-surface-subtle p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Mapa de tarefas</p>
          <div className="space-y-2">
            {uniqueTaskTitles.map((title) => {
              const config = taskConfigs[title] ?? getDefaultTaskConfig(title);
              const isMapped = parseInteger(config.issueId) > 0;
              const hasConflict = conflictTaskTitles.includes(title);
              return (
                <div key={title} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">Categoria de atividade <span className="font-mono">(activity_id {config.activityId})</span></p>
                  </div>
                  <Badge className={hasConflict ? "border-danger/30 bg-danger/10 text-foreground" : isMapped ? "border-success/30 bg-success/10 text-foreground" : "border-warning/40 bg-warning/10 text-foreground"}>
                    {hasConflict ? "conflito" : isMapped ? `issue_id ${config.issueId}` : "pendente"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
        </SectionCard>
      </div>

      <div id="time-entries-output" tabIndex={-1} className="scroll-mt-4 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45">
        {completed && (
          <Alert className="mb-6 border-success/30 bg-success/10 text-foreground" role="status">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription>
              <span className="font-semibold">Preparação concluída</span> — cole o lançamento final no fluxo autorizado da Cesis para concluir o registro de horas.
            </AlertDescription>
          </Alert>
        )}
        <MessagePreview
          title="Lançamento final para a Cesis"
          description="Mensagem preparada com instruções de conferência, agrupamento, prevenção de duplicidade e o payload de horas."
          value={timeEntriesMessageResult.message}
          copied={copied}
          testId="time-entries-message"
          validation={validation}
          copyDisabled={!timeEntriesMessageResult.canCopy}
          copyLabel="Copiar lançamento final"
          onCopy={onCopyTimeEntries}
        />
      </div>
    </div>
  );
}
