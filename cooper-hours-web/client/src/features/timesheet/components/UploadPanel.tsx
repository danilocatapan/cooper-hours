import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertCircle, Download, Info, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SectionCard } from "@/design-system/components/SectionCard";
import { PrivacyNoticeDialog } from "@/features/privacy/components/PrivacyNoticeDialog";
import { cn } from "@/lib/utils";
import type { CsvIssueType, TimesheetReport } from "../types";

const requiredCsvFields = [
  {
    name: "Título",
    description: "Descrição da tarefa como aparece no BusinessMap.",
    example: "[Back] [Arquitetural] Replicação dos endpoints",
  },
  {
    name: "Data",
    description: "Dia do lançamento no formato YYYY-MM-DD.",
    example: "2026-04-01",
  },
  {
    name: "Tempo registrado soma",
    description: "Horas trabalhadas no dia, aceitando ponto ou vírgula decimal.",
    example: "5.000",
  },
];

const csvExample = `Usuário\tID do cartão\tTítulo\tEtiquetas\tData\tTempo registrado soma
[PLACEHOLDER_USUARIO]\t893566\t[Back] [Arquitetural] Replicação dos endpoints\t"QualityBot,#inic0004688"\t2026-04-01\t5.000
[PLACEHOLDER_USUARIO]\t987589\t[313-Maestro] Ritos (Daily, Planning)\t"#inic0004688,#bbseg"\t2026-04-01\t1.000
[PLACEHOLDER_USUARIO]\t987605\t[313-Maestro] Refinamento\t"#inic0004688,#bbseg"\t2026-04-01\t2.000`;

interface UploadPanelProps {
  isLoading: boolean;
  isDragging: boolean;
  error: string | null;
  report: TimesheetReport | null;
  completeDays: number;
  selectedFileName: string | null;
  privacyAcknowledged: boolean;
  onDraggingChange: (isDragging: boolean) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onPrivacyAcknowledgedChange: (acknowledged: boolean) => void;
  onClearImportedData: () => void;
  onDownloadCsvIssues: () => void;
}

export function UploadPanel({
  isLoading,
  isDragging,
  error,
  report,
  completeDays,
  selectedFileName,
  privacyAcknowledged,
  onDraggingChange,
  onDrop,
  onFileUpload,
  onPrivacyAcknowledgedChange,
  onClearImportedData,
  onDownloadCsvIssues,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <SectionCard
      className="xl:sticky xl:top-8"
      title="Validar lançamento diário de 8h"
      description="Envie o CSV do BusinessMap para conferir dias completos, pendentes e acima da meta."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-selection/30 bg-selection/10 p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="privacy-acknowledgement"
              checked={privacyAcknowledged}
              onCheckedChange={(checked) => onPrivacyAcknowledgedChange(checked === true)}
              aria-label="Li o Aviso de Privacidade e confirmo autorização para importar este arquivo"
              aria-describedby="privacy-acknowledgement-help"
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <label htmlFor="privacy-acknowledgement" className="cursor-pointer text-sm font-medium leading-5 text-foreground">
                Li o Aviso de Privacidade e confirmo autorização para importar este arquivo.
              </label>
              <p id="privacy-acknowledgement-help" className="mt-1 text-xs leading-5 text-muted-foreground">
                O processamento ocorre localmente neste navegador. Cópias, downloads e colagens em outros sistemas dependem de ação manual.
              </p>
              <div className="mt-2">
                <PrivacyNoticeDialog />
              </div>
            </div>
          </div>
        </div>

        <div
          data-testid="file-dropzone"
          onDragEnter={(event) => {
            event.preventDefault();
            if (!isLoading && privacyAcknowledged) onDraggingChange(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isLoading && privacyAcknowledged) onDraggingChange(true);
          }}
          onDragLeave={() => onDraggingChange(false)}
          onDrop={onDrop}
          aria-disabled={!privacyAcknowledged || isLoading}
          className={cn(
            "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary",
            (!privacyAcknowledged || isLoading) && "opacity-70"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={onFileUpload}
            disabled={isLoading || !privacyAcknowledged}
            className="sr-only"
            id="file-upload"
            tabIndex={-1}
            aria-label="Arquivo CSV do BusinessMap"
          />
          <Button
            type="button"
            variant="ghost"
            aria-describedby="file-upload-help"
            disabled={isLoading || !privacyAcknowledged}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "mx-auto inline-flex h-auto w-fit flex-col items-center rounded-lg px-4 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-selection/50",
              privacyAcknowledged && !isLoading ? "cursor-pointer" : "cursor-not-allowed"
            )}
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground whitespace-normal">Selecionar CSV</span>
            <span id="file-upload-help" className="mt-1 text-xs text-muted-foreground whitespace-normal break-words">
              {privacyAcknowledged ? "Use Enter, Espaço ou arraste um arquivo CSV aqui" : "Confirme a ciência sobre privacidade antes de importar"}
            </span>
          </Button>
          {selectedFileName && (
            <p className="mt-3 max-w-full text-xs text-muted-foreground break-words">
              Último arquivo selecionado: <span className="font-medium text-foreground break-words">{selectedFileName}</span>
            </p>
          )}
          <p className="sr-only" role="status" aria-live="polite">
            {isDragging ? "Arquivo sobre a área de upload. Solte para importar." : "Upload por clique ou teclado disponível."}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-4" role="status" aria-label="Processando arquivo">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {report && (
          <div className="space-y-3 rounded-lg border border-success/30 bg-success/10 p-4">
            <div>
              <p className="text-sm font-medium text-success">Arquivo analisado com sucesso</p>
              <p className="mt-1 text-xs text-foreground">
                {completeDays} de {report.businessDayCount} dias úteis com 8h completas
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" className="w-full justify-center border-success/40 bg-background/50" onClick={onClearImportedData}>
              <Trash2 className="h-4 w-4" />
              Limpar dados importados
            </Button>
          </div>
        )}

        <Alert className="border-selection/30 bg-selection/10 text-foreground">
          <ShieldCheck className="h-4 w-4 text-selection" />
          <AlertDescription>
            A aplicação não mantém histórico de uploads. Evite usar arquivos pessoais em dispositivos compartilhados.
          </AlertDescription>
        </Alert>

        {report && report.ignoredLineCount > 0 && (
          <Alert className="border-warning/40 bg-warning/10 text-warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {report.ignoredLineCount} linha(s) foram ignoradas por data inválida, horas zeradas ou campos obrigatórios ausentes.
            </AlertDescription>
          </Alert>
        )}

        {report && report.ignoredLineIssues.length > 0 && (
          <CsvIssuesPanel report={report} onDownloadCsvIssues={onDownloadCsvIssues} />
        )}

        {report && report.duplicateLineCount > 0 && (
          <Alert className="border-warning/40 bg-warning/10 text-warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {report.duplicateLineCount} registro(s) duplicado(s) foram desconsiderados para não inflar o total de horas.
            </AlertDescription>
          </Alert>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between border-border bg-background/40 px-4">
              <span className="inline-flex items-center gap-2">
                <Info className="h-4 w-4 text-selection" />
                Formato do arquivo
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden border-border bg-card p-0 sm:max-w-4xl">
            <DialogHeader className="border-b border-border px-5 py-4 pr-12 text-left sm:px-6 sm:pr-14">
              <DialogTitle>Formato do arquivo CSV</DialogTitle>
              <DialogDescription>
                Confira se a exportação do BusinessMap inclui os campos abaixo antes de importar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
              <section aria-labelledby="required-csv-fields">
                <p id="required-csv-fields" className="mb-3 text-sm font-semibold text-foreground">
                  Campos obrigatórios:
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {requiredCsvFields.map((field) => (
                    <div key={field.name} className="min-w-0 rounded-lg border border-border bg-surface-subtle p-3">
                      <p className="text-sm font-semibold text-foreground">{field.name}</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{field.description}</p>
                      <p className="mt-3 rounded-md bg-background/70 px-2 py-1 font-mono text-[11px] text-foreground break-words whitespace-pre-wrap">
                        {field.example}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section aria-labelledby="csv-example">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <p id="csv-example" className="text-sm font-semibold text-foreground">
                    Exemplo de CSV:
                  </p>
                  <p className="text-xs text-muted-foreground">Separado por tabulação no exemplo.</p>
                </div>
                <pre
                  data-testid="csv-format-example"
                  className="max-h-64 overflow-auto rounded-lg border border-surface-border bg-code p-4 text-xs leading-6 text-foreground shadow-inner"
                >
                  <code className="block min-w-0 whitespace-pre-wrap break-words">{csvExample}</code>
                </pre>
                <p className="mt-3 rounded-lg border border-selection/30 bg-selection/10 p-3 text-xs leading-5 text-foreground">
                  O arquivo pode ser separado por vírgula, ponto-e-vírgula ou tabulação.
                </p>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SectionCard>
  );
}

const issueTypeLabels: Record<CsvIssueType | "all", string> = {
  all: "Todos os tipos",
  "missing-fields": "Campos ausentes",
  "invalid-date": "Data inválida",
  "missing-title": "Título ausente",
  "invalid-hours": "Horas inválidas",
  "parse-failure": "Falha de leitura",
};

function CsvIssuesPanel({
  report,
  onDownloadCsvIssues,
}: {
  report: TimesheetReport;
  onDownloadCsvIssues: () => void;
}) {
  const [issueFilter, setIssueFilter] = useState<CsvIssueType | "all">("all");
  const issueTypes = useMemo(() => {
    return Array.from(new Set(report.ignoredLineIssues.map((issue) => issue.type))).sort();
  }, [report.ignoredLineIssues]);
  const visibleIssues = issueFilter === "all"
    ? report.ignoredLineIssues
    : report.ignoredLineIssues.filter((issue) => issue.type === issueFilter);

  return (
    <details className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm" open>
      <summary className="cursor-pointer font-semibold text-warning">
        Inconsistências do CSV ({report.ignoredLineIssues.length})
      </summary>
      <div className="mt-3 space-y-3">
        <div className="flex min-w-0 flex-col gap-2">
          <label className="text-xs font-medium text-foreground" htmlFor="csv-issue-filter">
            Filtrar inconsistências
          </label>
          <div className="grid min-w-0 gap-2">
            <select
              id="csv-issue-filter"
              value={issueFilter}
              onChange={(event) => setIssueFilter(event.target.value as CsvIssueType | "all")}
              className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
            >
              <option value="all">{issueTypeLabels.all}</option>
              {issueTypes.map((type) => (
                <option key={type} value={type}>{issueTypeLabels[type]}</option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" className="min-h-9 w-full min-w-0 whitespace-normal px-3 text-center leading-tight" onClick={onDownloadCsvIssues}>
              <Download className="h-4 w-4" />
              Baixar inconsistências
            </Button>
          </div>
        </div>

        <div className="space-y-2" aria-live="polite">
          {visibleIssues.slice(0, 8).map((issue) => (
            <div key={`${issue.lineNumber}-${issue.reason}`} className="rounded-md border border-border bg-card p-3">
              <p className="font-medium text-foreground">
                Linha {issue.lineNumber}: {issue.reason}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {issue.date ? `Data: ${issue.date}. ` : ""}
                {issue.hours ? `Horas: ${issue.hours}. ` : ""}
                {issue.suggestion}
              </p>
            </div>
          ))}
          {visibleIssues.length > 8 && (
            <p className="text-xs text-muted-foreground">Mostrando as 8 primeiras inconsistências do filtro atual.</p>
          )}
          {visibleIssues.length === 0 && (
            <p className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
              Nenhuma inconsistência encontrada para este filtro.
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
