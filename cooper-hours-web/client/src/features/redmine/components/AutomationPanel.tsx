import { useState } from "react";
import { AlertCircle, CheckCircle2, CloudCog, Eye, EyeOff, ExternalLink, KeyRound, Loader2, RefreshCw, Send, ShieldCheck, Trash2 } from "lucide-react";
import type { AutomationPreview, AutomationSubmissionResult, RedmineConnectionStatus } from "@shared/redmine";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/design-system/components/MetricCard";
import { SectionCard } from "@/design-system/components/SectionCard";
import { StatusBadge } from "@/design-system/components/StatusBadge";

type AutomationStage = "idle" | "status" | "preview" | "submit";

interface AutomationPanelProps {
  apiKey: string;
  status: RedmineConnectionStatus | null;
  preview: AutomationPreview | null;
  result: AutomationSubmissionResult | null;
  error: string | null;
  stage: AutomationStage;
  onApiKeyChange: (value: string) => void;
  onClearApiKey: () => void;
  onRefreshStatus: () => void;
  onPrepare: () => void;
  onSubmit: () => void;
  onReset: () => void;
}

export function AutomationPanel({
  apiKey,
  status,
  preview,
  result,
  error,
  stage,
  onApiKeyChange,
  onClearApiKey,
  onRefreshStatus,
  onPrepare,
  onSubmit,
  onReset,
}: AutomationPanelProps) {
  const busy = stage !== "idle";
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="space-y-6" data-testid="redmine-automation-panel">
      <SectionCard
        title={(
          <span className="flex items-center gap-2">
            <CloudCog className="h-5 w-5 text-primary" />
            Automação Redmine
          </span>
        )}
        description="Use sua chave pessoal somente nesta aba e revise a prévia antes de criar ou atualizar registros no projeto 333."
        action={(
          <Button type="button" variant="outline" size="sm" onClick={onRefreshStatus} disabled={busy || !apiKey.trim()}>
            <RefreshCw className={stage === "status" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Testar conexão
          </Button>
        )}
        contentClassName="space-y-5"
      >
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="redmine-api-key" className="flex items-center gap-2 font-semibold">
                  <KeyRound className="h-4 w-4 text-primary" />
                  API key pessoal do Redmine
                </Label>
                <a
                  href="https://redmine.coopersystem.com.br/my/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Obter em Minha conta <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="flex gap-2">
                <Input
                  id="redmine-api-key"
                  data-testid="redmine-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => onApiKeyChange(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Cole sua chave para testar a conexão"
                  aria-describedby="redmine-key-help"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowApiKey((value) => !value)} aria-label={showApiKey ? "Ocultar API key" : "Mostrar API key"}>
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={onClearApiKey} disabled={!apiKey || busy} aria-label="Limpar API key">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p id="redmine-key-help" className="text-xs leading-5 text-muted-foreground">
                A chave fica apenas na memória desta aba, é enviada por HTTPS e desaparece ao recarregar ou fechar a página.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-surface-border bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status?.connected ? "complete" : status?.configured ? "invalid" : "neutral"}>
                {status?.connected ? "Conectado" : status?.configured ? "Falha de conexão" : apiKey ? "Aguardando teste" : "Chave não informada"}
              </StatusBadge>
              {status?.project ? <Badge variant="outline">Projeto {status.project.id}</Badge> : null}
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              {status?.account ? `${status.account.name} (${status.account.login})` : "Credencial individual e não persistente"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {status?.message ?? "Informe a chave e teste a conexão antes de preparar a prévia."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            Sem armazenamento da chave
          </div>
        </div>

        {error ? (
          <Alert className="border-danger/30 bg-danger/10 text-danger" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Não foi possível continuar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={onPrepare}
            disabled={!apiKey.trim() || !status?.connected || busy}
            data-testid="prepare-redmine-preview"
          >
            {stage === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudCog className="h-4 w-4" />}
            Preparar prévia segura
          </Button>
          {preview || result ? (
            <Button type="button" variant="outline" onClick={onReset} disabled={busy}>
              Limpar prévia
            </Button>
          ) : null}
        </div>
      </SectionCard>

      {preview ? (
        <SectionCard
          title="Prévia da operação"
          description={`Válida até ${new Date(preview.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. Nenhuma alteração foi feita ainda.`}
          contentClassName="space-y-5"
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <MetricCard label="tarefas novas" value={preview.summary.tasksToCreate} status="underTarget" />
            <MetricCard label="tarefas atualizadas" value={preview.summary.tasksToUpdate} status="underTarget" />
            <MetricCard label="tarefas reutilizadas" value={preview.summary.tasksToReuse} status="complete" />
            <MetricCard label="horas novas" value={preview.summary.entriesToCreate} status="complete" />
            <MetricCard label="horas atualizadas" value={preview.summary.entriesToUpdate} status="underTarget" />
            <MetricCard label="duplicatas ignoradas" value={preview.summary.duplicateEntries} status="optional" />
          </div>

          {preview.blockers.length > 0 ? (
            <Alert className="border-danger/30 bg-danger/10 text-danger">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Prévia bloqueada</AlertTitle>
              <AlertDescription>{preview.blockers.join(" ")}</AlertDescription>
            </Alert>
          ) : null}

          <details className="rounded-lg border border-border bg-card" open>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
              Tarefas analisadas ({preview.tasks.length})
            </summary>
            <div className="space-y-2 border-t border-border p-4">
              {preview.tasks.map((task) => (
                <div key={task.title} className="flex flex-col gap-2 rounded-md border border-border bg-surface-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-foreground">{task.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{task.message}</p>
                  </div>
                  <AutomationBadge action={task.action} issueId={task.issueId} />
                </div>
              ))}
            </div>
          </details>

          <details className="rounded-lg border border-border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
              Lançamentos analisados ({preview.entries.length})
            </summary>
            <div className="max-h-96 space-y-2 overflow-y-auto border-t border-border p-4">
              {preview.entries.map((entry) => (
                <div key={entry.key} className="flex flex-col gap-2 rounded-md border border-border bg-surface-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.spentOn} · {entry.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{entry.hours.toFixed(2)}h · activity_id {entry.activityId} · {entry.message}</p>
                  </div>
                  <AutomationBadge action={entry.action} issueId={entry.issueId} />
                </div>
              ))}
            </div>
          </details>

          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" disabled={!preview.canSubmit || busy} data-testid="open-redmine-confirmation">
                  {stage === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Confirmar envio ao Redmine
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Criar e atualizar registros?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Serão criadas {preview.summary.tasksToCreate} tarefa(s) e {preview.summary.entriesToCreate} lançamento(s),
                    com {preview.summary.tasksToUpdate} tarefa(s) e {preview.summary.entriesToUpdate} lançamento(s) atualizados.
                    A aplicação revalidará marcadores e nunca excluirá registros.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar à prévia</AlertDialogCancel>
                  <AlertDialogAction onClick={onSubmit} data-testid="confirm-redmine-submit">
                    Confirmar e enviar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SectionCard>
      ) : null}

      {stage === "submit" ? (
        <Alert className="border-selection/30 bg-selection/10 text-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin text-selection" />
          <AlertTitle>Enviando em sequência</AlertTitle>
          <AlertDescription>Não feche esta aba. O backend está revalidando cada item antes de gravar.</AlertDescription>
        </Alert>
      ) : null}

      {result ? <SubmissionResult result={result} /> : null}
    </div>
  );
}

function AutomationBadge({ action, issueId }: { action: string; issueId: number | null }) {
  const classes = action === "create"
    ? "border-selection/30 bg-selection/10 text-foreground"
    : action === "update"
      ? "border-warning/30 bg-warning/10 text-foreground"
      : action === "reuse" || action === "duplicate"
      ? "border-success/30 bg-success/10 text-foreground"
      : "border-danger/30 bg-danger/10 text-foreground";
  const label = action === "create"
    ? "criar"
    : action === "update"
      ? `atualizar${issueId ? ` #${issueId}` : ""}`
      : action === "reuse"
      ? `reutilizar${issueId ? ` #${issueId}` : ""}`
      : action === "duplicate"
        ? "duplicata"
        : action === "conflict"
          ? "conflito"
          : "bloqueado";
  return <Badge className={classes}>{label}</Badge>;
}

function SubmissionResult({ result }: { result: AutomationSubmissionResult }) {
  const createdTasks = result.tasks.filter((item) => item.status === "created").length;
  const createdEntries = result.entries.filter((item) => item.status === "created").length;
  const updated = result.tasks.filter((item) => item.status === "updated").length + result.entries.filter((item) => item.status === "updated").length;
  const failed = result.tasks.some((item) => item.status === "failed") || result.entries.some((item) => item.status === "failed");
  return (
    <SectionCard
      title={(
        <span className="flex items-center gap-2">
          {failed ? <AlertCircle className="h-5 w-5 text-danger" /> : <CheckCircle2 className="h-5 w-5 text-success" />}
          Resultado da automação
        </span>
      )}
      description={result.message}
      contentClassName="space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <MetricCard label="tarefas criadas" value={createdTasks} status="complete" />
        <MetricCard label="horas lançadas" value={createdEntries} status="complete" />
        <MetricCard label="itens atualizados" value={updated} status="underTarget" />
        <MetricCard label="itens com falha" value={failed ? 1 : 0} status={failed ? "invalid" : "neutral"} />
      </div>
      <details className="rounded-lg border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">Detalhes por item</summary>
        <ul className="space-y-2 border-t border-border p-4 text-sm">
          {result.tasks.map((item) => <li key={`task-${item.title}`}><strong>{item.title}:</strong> {item.message}</li>)}
          {result.entries.map((item) => <li key={`entry-${item.key}`}><strong>{item.title}:</strong> {item.message}</li>)}
        </ul>
      </details>
    </SectionCard>
  );
}
