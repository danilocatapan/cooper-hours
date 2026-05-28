import type { KeyboardEvent } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DAILY_TARGET_HOURS } from "../constants";
import type { DailySummary, TimesheetReport, TimesheetStatus } from "../types";
import {
  formatLocalDate,
  getDailyStatus,
  getStatusLabel,
  isBusinessDay,
} from "../report";
import { MetricCard } from "@/design-system/components/MetricCard";
import { SectionCard } from "@/design-system/components/SectionCard";
import { StatusBadge } from "@/design-system/components/StatusBadge";
import { statusMap } from "@/design-system/status";

interface ConferencePanelProps {
  report: TimesheetReport;
  reportStats: {
    completeDays: number;
    pendingDays: number;
    overDays: number;
    expectedTotalHours: number;
  };
  calendarCells: Array<string | null>;
  summaryByDate: Map<string, DailySummary>;
  selectedSummary: DailySummary | undefined;
  onSelectDate: (date: string) => void;
  onDownloadReportCsv: () => void;
}

export function ConferencePanel({
  report,
  reportStats,
  calendarCells,
  summaryByDate,
  selectedSummary,
  onSelectDate,
  onDownloadReportCsv,
}: ConferencePanelProps) {
  const calendarWeeks = Array.from({ length: Math.ceil(calendarCells.length / 7) }, (_, index) =>
    calendarCells.slice(index * 7, index * 7 + 7)
  );

  const focusCalendarDate = (date: string) => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-calendar-date="${date}"]`)?.focus();
    });
  };

  const handleCalendarKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const dates = calendarCells.filter((cell): cell is string => Boolean(cell));
    const currentIndex = dates.indexOf(date);
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -currentIndex,
      End: dates.length - currentIndex - 1,
    };

    if (!(event.key in offsets)) return;

    event.preventDefault();
    const nextIndex = Math.min(Math.max(currentIndex + offsets[event.key], 0), dates.length - 1);
    const nextDate = dates[nextIndex];
    onSelectDate(nextDate);
    focusCalendarDate(nextDate);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Conferência do período"
        description={`${reportStats.completeDays}/${report.businessDayCount} dias úteis fechados com 8h.`}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="8h completas" value={reportStats.completeDays} status="complete" />
          <MetricCard label="Dias pendentes" value={reportStats.pendingDays} status="underTarget" />
          <MetricCard label="Acima da meta" value={reportStats.overDays} status="overTarget" />
          <MetricCard
            label="Lançado / esperado"
            value={`${report.overallTotalHours.toFixed(1)}h / ${reportStats.expectedTotalHours.toFixed(1)}h`}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface-subtle p-3">
            <p className="text-muted-foreground">Resumo da importação</p>
            <p className="mt-1 text-foreground">
              {report.validLineCount} de {report.rawLineCount} linhas válidas
              {report.userName ? ` para ${report.userName}` : ""} em {report.importedMonth}.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-subtle p-3">
            <p className="text-muted-foreground">Dias úteis ausentes</p>
            <p className="mt-1 text-foreground">
              {report.missingBusinessDays.length === 0
                ? "Nenhum dia útil ausente no mês."
                : `${report.missingBusinessDays.length} dia(s) sem lançamento.`}
            </p>
          </div>
        </div>

        {report.missingBusinessDays.length > 0 && (
          <Alert className="mt-4 border-danger/30 bg-danger/10 text-danger">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {report.missingBusinessDays.length} dia(s) úteis estão sem lançamento. Eles aparecem em vermelho na grade mensal abaixo.
            </AlertDescription>
          </Alert>
        )}

        {report.weekendOrExtraDays.length > 0 && (
          <Alert className="mt-4 border-warning/40 bg-warning/10 text-warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {report.weekendOrExtraDays.length} sábado/domingo foram importados e exibidos como hora extra, mas não entram na meta obrigatória de dias úteis.
            </AlertDescription>
          </Alert>
        )}

        <Button type="button" variant="outline" size="sm" className="mt-4 w-full sm:w-auto" onClick={onDownloadReportCsv}>
          Baixar relatório CSV
        </Button>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          O arquivo baixado pode conter dados pessoais do CSV importado. Compartilhe apenas com sistemas e pessoas autorizadas.
        </p>
      </SectionCard>

      <SectionCard title="Conferência diária" description="Selecione qualquer dia para revisar total e atividades.">
        <div className="space-y-4">
          <div className="overflow-x-auto pb-1">
            <div role="grid" aria-label="Calendário do mês importado" aria-describedby="calendar-help" className="min-w-[42rem] sm:min-w-0">
              <p id="calendar-help" className="sr-only">
                Use as setas do teclado para navegar entre os dias. Apenas o dia selecionado fica na ordem de tabulação. A seleção atual controla o detalhe diário abaixo.
              </p>
              <div role="row" className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground lg:gap-3">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((weekday) => (
                  <span key={weekday} role="columnheader">{weekday}</span>
                ))}
              </div>
              <div role="rowgroup" className="mt-2 space-y-2">
                {calendarWeeks.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} role="row" className="grid grid-cols-7 gap-2 lg:gap-3">
                    {week.map((date, idx) => {
                      if (!date) return <div key={`empty-${weekIndex}-${idx}`} role="gridcell" aria-hidden="true" className="h-20 sm:h-24 rounded-lg border border-border/60 bg-surface-subtle" />;

                    const summary = summaryByDate.get(date);
                    const dayNumber = Number(date.slice(-2));
                    const weekend = !isBusinessDay(date);
                    const isSelected = selectedSummary?.date === date;

                    if (!summary) {
                      return (
                        <div key={date} role="gridcell" aria-label={`${dayNumber} sem registro`} className="h-20 sm:h-24 overflow-hidden rounded-lg border border-border/60 bg-surface-subtle p-2 text-left">
                          <p className="text-sm font-semibold text-muted-foreground">{dayNumber}</p>
                          {weekend && <p className="mt-1 text-[11px] text-muted-foreground">opcional</p>}
                        </div>
                      );
                    }

                    const dailyStatus = getDailyStatus(summary.totalHours);
                    const visualStatus: TimesheetStatus = summary.isHoliday ? "holiday" : summary.isMissing ? "missing" : !summary.isBusinessDay ? "optional" : dailyStatus;
                    const Icon = statusMap[visualStatus].Icon;
                    const holidayTooltip = summary.isHoliday ? summary.holidayName ?? "Feriado nacional" : null;

                    const dayButton = (
                      <button
                        type="button"
                        data-calendar-date={date}
                        onClick={() => onSelectDate(date)}
                        onKeyDown={(event) => handleCalendarKeyDown(event, date)}
                        tabIndex={isSelected ? 0 : -1}
                        aria-label={`${formatLocalDate(date)} ${summary.totalHours.toFixed(1)}h ${summary.isHoliday ? `feriado nacional ${summary.holidayName ?? ""}` : summary.isMissing ? "ausente" : summary.isBusinessDay ? "dia útil" : "hora extra"}`}
                        aria-controls="daily-detail"
                        aria-pressed={isSelected}
                        className={cn(
                          "h-20 sm:h-24 w-full overflow-hidden rounded-lg border p-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-selection/40",
                          statusMap[visualStatus].panelClassName,
                          isSelected && "relative z-10 border-selection ring-2 ring-selection/70",
                          !isSelected && "hover:bg-surface-raised"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-semibold text-foreground">{dayNumber}</span>
                          <Icon className={cn("h-5 w-5", statusMap[visualStatus].iconClassName)} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{summary.totalHours.toFixed(1)}h</p>
                        <StatusBadge status={visualStatus}>
                          {summary.isHoliday ? "feriado" : summary.isMissing ? "ausente" : summary.isBusinessDay ? "dia útil" : "extra"}
                        </StatusBadge>
                      </button>
                    );

                    if (!holidayTooltip) {
                      return (
                        <div key={date} role="gridcell" aria-selected={isSelected}>
                          {dayButton}
                        </div>
                      );
                    }

                    return (
                      <div key={date} role="gridcell" aria-selected={isSelected}>
                        <Tooltip>
                          <TooltipTrigger asChild>{dayButton}</TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8} className="max-w-56 text-center">
                            {holidayTooltip}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedSummary && <DailyDetail summary={selectedSummary} />}
        </div>
      </SectionCard>
    </div>
  );
}

function DailyDetail({ summary }: { summary: DailySummary }) {
  const dailyStatus = getDailyStatus(summary.totalHours);
  const visualStatus: TimesheetStatus = summary.isHoliday ? "holiday" : summary.isMissing ? "missing" : !summary.isBusinessDay ? "optional" : dailyStatus;
  const Icon = statusMap[visualStatus].Icon;
  const expectedHours = summary.isHoliday || !summary.isBusinessDay ? 0 : DAILY_TARGET_HOURS;

  return (
    <div id="daily-detail" className={cn("rounded-lg border-2 p-4", statusMap[visualStatus].panelClassName)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {formatLocalDate(summary.date, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.totalHours.toFixed(1)}h lançadas de {expectedHours.toFixed(1)}h esperadas.
          </p>
          {summary.isHoliday && (
            <p className="mt-1 text-sm text-holiday-foreground">
              {summary.holidayName ?? "Feriado nacional"}. Sem lançamento obrigatório.
            </p>
          )}
          {summary.isMissing && <p className="mt-1 text-sm text-danger">Sem registro no CSV.</p>}
          {!summary.isHoliday && !summary.isBusinessDay && <p className="mt-1 text-sm text-warning">Hora extra, não obrigatória.</p>}
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className={cn("h-5 w-5", statusMap[visualStatus].iconClassName)} />
          <span>{getStatusLabel(summary)}</span>
        </div>
      </div>

      {summary.isHoliday ? (
        <p className="mt-4 rounded-lg bg-background/60 p-3 text-sm text-muted-foreground">
          Feriado nacional identificado automaticamente e fora da meta obrigatória de 8h.
        </p>
      ) : dailyStatus !== "complete" && (
        <p className="mt-4 rounded-lg bg-background/60 p-3 text-sm text-muted-foreground">
          {summary.isMissing
            ? "Inclua este dia no BusinessMap e exporte novamente o CSV após corrigir o lançamento."
            : "Revise este dia no BusinessMap e exporte novamente o CSV após corrigir o lançamento."}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {summary.activities.length > 0 ? (
          summary.activities.map((activity, actIdx) => (
            <div key={actIdx} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                {activity.cardId && <p className="mt-1 text-xs text-muted-foreground">Cartão {activity.cardId}</p>}
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-sm font-medium text-foreground">
                  {activity.hours.toFixed(1)}h
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            Nenhuma atividade encontrada para este dia.
          </div>
        )}
      </div>
    </div>
  );
}
