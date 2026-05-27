import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { CheckCircle2, ClipboardList, Clock3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/design-system/components/AppShell";
import { EmptyState } from "@/design-system/components/EmptyState";
import { WorkflowStepper } from "@/design-system/components/WorkflowStepper";
import {
  applyCecisIssuesToTaskConfigs,
  buildTasksJson,
  getConflictTaskTitles,
  getPendingTimeEntryTitles,
  getReadyTimeEntries,
} from "@/features/timesheet/cecis";
import { DEFAULT_TASKS } from "@/features/timesheet/constants";
import { ConferencePanel } from "@/features/timesheet/components/ConferencePanel";
import { TasksPanel } from "@/features/timesheet/components/TasksPanel";
import { TimeEntriesPanel } from "@/features/timesheet/components/TimeEntriesPanel";
import { UploadPanel } from "@/features/timesheet/components/UploadPanel";
import { sanitizeProcessingError } from "@/features/privacy/lgpd";
import { processCsv } from "@/features/timesheet/parseCsv";
import {
  buildTimeEntries,
  getCalendarCellsForMonth,
  getDefaultTaskConfig,
  getReportStats,
  getStatusLabel,
  getUniqueTaskTitles,
} from "@/features/timesheet/report";
import type { TaskConfig, TaskDefaults, TimesheetReport } from "@/features/timesheet/types";

type CopiedTarget = "tasks" | "time" | "report" | null;

export default function Home() {
  const [report, setReport] = useState<TimesheetReport | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState("conference");
  const [taskDefaults, setTaskDefaults] = useState<TaskDefaults>(DEFAULT_TASKS);
  const [copiedTarget, setCopiedTarget] = useState<CopiedTarget>(null);
  const [taskConfigs, setTaskConfigs] = useState<Record<string, TaskConfig>>({});
  const [cecisResponseText, setCecisResponseText] = useState("");
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");

  const logoSrc = `${import.meta.env.BASE_URL}assets/coopersystem-logo.svg`;
  const reportStats = useMemo(() => getReportStats(report), [report]);
  const uniqueTaskTitles = useMemo(() => getUniqueTaskTitles(report), [report]);

  useEffect(() => {
    setTaskConfigs((current) => {
      const next: Record<string, TaskConfig> = {};
      uniqueTaskTitles.forEach((title) => {
        next[title] = current[title] ?? getDefaultTaskConfig(title);
      });
      return next;
    });
  }, [uniqueTaskTitles]);

  const tasksJsonText = useMemo(() => {
    return buildTasksJson(uniqueTaskTitles, taskDefaults, taskConfigs);
  }, [taskConfigs, taskDefaults, uniqueTaskTitles]);

  const timeEntries = useMemo(() => {
    return buildTimeEntries(report, taskConfigs);
  }, [report, taskConfigs]);

  const readyTimeEntries = useMemo(() => getReadyTimeEntries(timeEntries), [timeEntries]);
  const pendingTimeEntryTitles = useMemo(() => getPendingTimeEntryTitles(timeEntries), [timeEntries]);
  const conflictTaskTitles = useMemo(() => getConflictTaskTitles(cecisResponseText, uniqueTaskTitles), [cecisResponseText, uniqueTaskTitles]);
  const timeEntriesJsonText = useMemo(() => JSON.stringify(readyTimeEntries, null, 2), [readyTimeEntries]);

  const selectedSummary = report?.dailySummaries.find((summary) => summary.date === selectedDate) ?? report?.dailySummaries[0];
  const summaryByDate = useMemo(() => {
    return new Map(report?.dailySummaries.map((summary) => [summary.date, summary]) ?? []);
  }, [report]);
  const calendarCells = useMemo(() => {
    return report ? getCalendarCellsForMonth(report.importedMonth) : [];
  }, [report]);

  const processFile = (file: File) => {
    if (!privacyAcknowledged) {
      setError("Confirme a ciência sobre privacidade antes de importar um arquivo.");
      setLiveMessage("Importação bloqueada até a confirmação do Aviso de Privacidade.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsDragging(false);
    setCopiedTarget(null);
    setCecisResponseText("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const processedReport = processCsv(csvText);

        setReport(processedReport);
        setLiveMessage(
          `CSV analisado: ${processedReport.validLineCount} linhas válidas, ${processedReport.ignoredLineCount} ignoradas e ${processedReport.duplicateLineCount} duplicadas.`
        );
        setSelectedDate(
          processedReport.dailySummaries.find((summary) => !summary.isMissing && summary.activities.length > 0)?.date
          ?? processedReport.dailySummaries.find((summary) => !summary.isMissing)?.date
          ?? processedReport.dailySummaries[0]?.date
          ?? null
        );
        setActiveResultTab("conference");
        setTaskDefaults({
          ...DEFAULT_TASKS,
          startDate: processedReport.minImportedDate,
          dueDate: processedReport.maxImportedDate,
        });
      } catch (err) {
        setError(sanitizeProcessingError(err));
        setLiveMessage("Não foi possível analisar o CSV. Revise o erro exibido no painel de upload.");
        setReport(null);
        setSelectedDate(null);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Não foi possível ler o arquivo selecionado");
      setLiveMessage("Não foi possível ler o arquivo selecionado.");
      setIsLoading(false);
      setReport(null);
      setSelectedDate(null);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLoading) return;

    if (!privacyAcknowledged) {
      setIsDragging(false);
      setError("Confirme a ciência sobre privacidade antes de importar um arquivo.");
      setLiveMessage("Importação por arrastar e soltar bloqueada até a confirmação de privacidade.");
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      setIsDragging(false);
      return;
    }

    processFile(file);
  };

  const updateTaskDefault = (key: keyof TaskDefaults, value: string) => {
    setTaskDefaults((current) => ({ ...current, [key]: value }));
  };

  const updateTaskConfig = (title: string, key: keyof TaskConfig, value: string) => {
    setTaskConfigs((current) => ({
      ...current,
      [title]: {
        ...(current[title] ?? getDefaultTaskConfig(title)),
        [key]: value,
      },
    }));
  };

  const applyCecisResponse = () => {
    setTaskConfigs((current) => applyCecisIssuesToTaskConfigs(cecisResponseText, uniqueTaskTitles, current));
    setLiveMessage("Resposta da Cecis aplicada ao mapa de tarefas.");
  };

  const clearImportedData = () => {
    setReport(null);
    setSelectedDate(null);
    setError(null);
    setIsDragging(false);
    setCopiedTarget(null);
    setTaskConfigs({});
    setCecisResponseText("");
    setTaskDefaults(DEFAULT_TASKS);
    setActiveResultTab("conference");
    setLiveMessage("Dados importados removidos desta sessão do navegador.");
  };

  const copyJson = async (jsonText: string, target: Exclude<CopiedTarget, null>) => {
    await navigator.clipboard.writeText(jsonText);
    setCopiedTarget(target);
    setLiveMessage(target === "tasks" ? "JSON de tarefas copiado." : "JSON de lançamentos copiado.");
    window.setTimeout(() => setCopiedTarget(null), 1800);
  };

  const downloadReportCsv = () => {
    if (!report) return;

    const rows = [
      ["Data", "Dia útil", "Total lançado", "Status", "Atividades"],
      ...report.dailySummaries
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((summary) => [
          summary.date,
          summary.isBusinessDay ? "sim" : "não",
          summary.totalHours.toFixed(1),
          getStatusLabel(summary),
          summary.activities.map((activity) => `${activity.title} (${activity.hours.toFixed(1)}h)`).join(" | "),
        ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(";"))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `validacao-8h-${report.importedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell logoSrc={logoSrc}>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <UploadPanel
            isLoading={isLoading}
            isDragging={isDragging}
            error={error}
            report={report}
            completeDays={reportStats?.completeDays ?? 0}
            privacyAcknowledged={privacyAcknowledged}
            onDraggingChange={setIsDragging}
            onDrop={handleDrop}
            onFileUpload={handleFileUpload}
            onPrivacyAcknowledgedChange={setPrivacyAcknowledged}
            onClearImportedData={clearImportedData}
          />
        </div>

        <div className="lg:col-span-2">
          {report && reportStats ? (
            <div className="space-y-6">
            <WorkflowStepper
              completeDays={reportStats.completeDays}
              businessDayCount={report.businessDayCount}
              taskCount={uniqueTaskTitles.length}
              mappedTimeEntries={readyTimeEntries.length}
              totalTimeEntries={timeEntries.length}
              blockerCount={pendingTimeEntryTitles.length + conflictTaskTitles.length}
            />

            <Tabs value={activeResultTab} onValueChange={setActiveResultTab} className="space-y-6">
              <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg border border-border bg-card p-1">
                <TabsTrigger value="conference" className="flex-none px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Conferência
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex-none px-3 py-2">
                  <ClipboardList className="h-4 w-4" />
                  Criar Tarefas
                </TabsTrigger>
                <TabsTrigger value="time" className="flex-none px-3 py-2">
                  <Clock3 className="h-4 w-4" />
                  Registrar Tempo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="conference">
                <ConferencePanel
                  report={report}
                  reportStats={reportStats}
                  calendarCells={calendarCells}
                  summaryByDate={summaryByDate}
                  selectedSummary={selectedSummary}
                  onSelectDate={setSelectedDate}
                  onDownloadReportCsv={downloadReportCsv}
                />
              </TabsContent>

              <TabsContent value="tasks">
                <TasksPanel
                  importedMonth={report.importedMonth}
                  uniqueTaskTitles={uniqueTaskTitles}
                  taskDefaults={taskDefaults}
                  taskConfigs={taskConfigs}
                  tasksJsonText={tasksJsonText}
                  copied={copiedTarget === "tasks"}
                  onTaskDefaultChange={updateTaskDefault}
                  onTaskConfigChange={updateTaskConfig}
                  onCopyTasks={() => copyJson(tasksJsonText, "tasks")}
                />
              </TabsContent>

              <TabsContent value="time">
                <TimeEntriesPanel
                  uniqueTaskTitles={uniqueTaskTitles}
                  taskConfigs={taskConfigs}
                  cecisResponseText={cecisResponseText}
                  timeEntries={timeEntries}
                  readyTimeEntriesLength={readyTimeEntries.length}
                  pendingTimeEntryTitles={pendingTimeEntryTitles}
                  conflictTaskTitles={conflictTaskTitles}
                  timeEntriesJsonText={timeEntriesJsonText}
                  copied={copiedTarget === "time"}
                  onCecisResponseChange={setCecisResponseText}
                  onApplyCecisResponse={applyCecisResponse}
                  onCopyTimeEntries={() => copyJson(timeEntriesJsonText, "time")}
                />
              </TabsContent>
            </Tabs>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </AppShell>
  );
}
