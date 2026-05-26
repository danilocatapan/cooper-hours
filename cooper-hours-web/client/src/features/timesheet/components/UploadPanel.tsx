import type { ChangeEvent, DragEvent } from "react";
import { AlertCircle, Upload } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { TimesheetReport } from "../types";
import { SectionCard } from "@/design-system/components/SectionCard";

interface UploadPanelProps {
  isLoading: boolean;
  isDragging: boolean;
  error: string | null;
  report: TimesheetReport | null;
  completeDays: number;
  onDraggingChange: (isDragging: boolean) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function UploadPanel({
  isLoading,
  isDragging,
  error,
  report,
  completeDays,
  onDraggingChange,
  onDrop,
  onFileUpload,
}: UploadPanelProps) {
  return (
    <SectionCard
      className="sticky top-8"
      title="Validar lançamento diário de 8h"
      description="Envie o CSV do BusinessMap para conferir dias completos, pendentes e acima da meta."
    >
      <div className="space-y-4">
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            if (!isLoading) onDraggingChange(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isLoading) onDraggingChange(true);
          }}
          onDragLeave={() => onDraggingChange(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary"
          )}
        >
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={onFileUpload}
            disabled={isLoading}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="block cursor-pointer">
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Clique para selecionar</p>
            <p className="mt-1 text-xs text-muted-foreground">ou arraste um arquivo CSV aqui</p>
          </label>
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
          <div className="rounded-lg border border-success/30 bg-success/10 p-4">
            <p className="text-sm font-medium text-success">Arquivo analisado com sucesso</p>
            <p className="mt-1 text-xs text-success/80">
              {completeDays} de {report.businessDayCount} dias úteis com 8h completas
            </p>
          </div>
        )}

        {report && report.ignoredLineCount > 0 && (
          <Alert className="border-warning/40 bg-warning/10 text-warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {report.ignoredLineCount} linha(s) foram ignoradas por data inválida, horas zeradas ou campos obrigatórios ausentes.
            </AlertDescription>
          </Alert>
        )}

        {report && report.duplicateLineCount > 0 && (
          <Alert className="border-warning/40 bg-warning/10 text-warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {report.duplicateLineCount} registro(s) duplicado(s) foram desconsiderados para não inflar o total de horas.
            </AlertDescription>
          </Alert>
        )}

        <Accordion type="single" collapsible className="rounded-lg border border-border bg-background/40 px-4">
          <AccordionItem value="csv-format">
            <AccordionTrigger>Formato do arquivo</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Campos obrigatórios:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">Título</strong> - descrição da tarefa</li>
                  <li><strong className="text-foreground">Data</strong> - formato YYYY-MM-DD</li>
                  <li><strong className="text-foreground">Tempo registrado soma</strong> - horas trabalhadas, exemplo 5.000</li>
                </ul>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Exemplo de CSV:</p>
                <div className="overflow-x-auto rounded bg-code p-3 text-xs font-mono text-muted-foreground">
                  <div className="whitespace-pre-wrap break-words">
{`Usuário	ID do cartão	Título	Etiquetas	Data	Tempo registrado soma
Danilo	893566	[Back] [Arquitetural] Replicação dos endpoints	"QualityBot,#inic0004688"	2026-04-01	5.000
Danilo	987589	[313-Maestro] Ritos (Daily, Planning)	"#inic0004688,#bbseg"	2026-04-01	1.000
Danilo	987605	[313-Maestro] Refinamento	"#inic0004688,#bbseg"	2026-04-01	2.000`}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  O arquivo pode ser separado por vírgula, ponto-e-vírgula ou tabulação.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </SectionCard>
  );
}
