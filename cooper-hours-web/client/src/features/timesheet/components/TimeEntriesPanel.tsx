import { AlertCircle, Clock3, Link2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JsonPreview } from "@/design-system/components/JsonPreview";
import { MetricCard } from "@/design-system/components/MetricCard";
import { SectionCard } from "@/design-system/components/SectionCard";
import { getDefaultTaskConfig, parseInteger } from "../report";
import type { TaskConfig, TimeEntryDraft } from "../types";

interface TimeEntriesPanelProps {
  uniqueTaskTitles: string[];
  taskConfigs: Record<string, TaskConfig>;
  cecisResponseText: string;
  timeEntries: TimeEntryDraft[];
  readyTimeEntriesLength: number;
  pendingTimeEntryTitles: string[];
  conflictTaskTitles: string[];
  timeEntriesJsonText: string;
  copied: boolean;
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
  timeEntriesJsonText,
  copied,
  onCecisResponseChange,
  onApplyCecisResponse,
  onCopyTimeEntries,
}: TimeEntriesPanelProps) {
  const hasConflicts = conflictTaskTitles.length > 0;
  const hasPending = pendingTimeEntryTitles.length > 0;
  const hasReadyEntries = readyTimeEntriesLength > 0;
  const validation = hasConflicts
    ? {
        tone: "blocked" as const,
        title: "Conflito detectado",
        description: `${conflictTaskTitles.length} tarefa(s) aparecem com conflito na resposta da Cecis. Resolva antes de copiar.`,
      }
    : hasPending
      ? {
          tone: "warning" as const,
          title: `${pendingTimeEntryTitles.length} tarefa(s) sem issue_id`,
          description: `${readyTimeEntriesLength} lançamento(s) podem ser copiados agora; os pendentes ficam fora do JSON.`,
        }
      : {
          tone: "ready" as const,
          title: "Pronto para copiar",
          description: `${readyTimeEntriesLength} lançamento(s) mapeados com issue_id e activity_id.`,
        };

  return (
    <div className="space-y-6">
      <SectionCard
        title={(
          <span className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary" />
            Registrar tempo
          </span>
        )}
        description="Cole a resposta da Cecis para preencher os issue_id e gerar o JSON final de horas."
        contentClassName="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="cecis-response">Resposta da Cecis com as issues criadas</Label>
          <Textarea
            id="cecis-response"
            data-testid="cecis-response"
            value={cecisResponseText}
            onChange={(event) => onCecisResponseChange(event.target.value)}
            placeholder="Ex.: ID 291631 - Maestro-Refinamentos S2-Abr - tracker..."
            aria-describedby="cecis-response-help"
            className="min-h-32"
          />
          <p id="cecis-response-help" className="text-xs leading-5 text-muted-foreground">
            A resposta deve conter cada ID seguido do título da tarefa. O sistema só copia lançamentos com issue_id reconhecido.
          </p>
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
              Conflitos na resposta da Cecis: {conflictTaskTitles.join("; ")}
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
                    <p className="text-xs text-muted-foreground">Atividade <span className="font-mono">activity_id {config.activityId}</span></p>
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

      <JsonPreview
        title="JSON para Cecis - lançamentos"
        description="Saída manual com issue_id, spent_on e activity_id."
        value={timeEntriesJsonText}
        copied={copied}
        testId="time-entries-json"
        validation={validation}
        copyDisabled={!hasReadyEntries || hasConflicts}
        onCopy={onCopyTimeEntries}
      />
    </div>
  );
}
