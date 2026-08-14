import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { CheckCircle2, ClipboardList, Clock3 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/design-system/components/AppShell";
import { EmptyState } from "@/design-system/components/EmptyState";
import { WorkflowStepper, type WorkflowStepId } from "@/design-system/components/WorkflowStepper";
import {
  applyCecisIssuesToTaskConfigs,
  buildTasksCecisMessage,
  buildTimeEntriesCecisMessage,
  getCecisResponseDiagnostics,
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
import type { SensitiveActionKind, TaskConfig, TaskDefaults, TimesheetReport } from "@/features/timesheet/types";

type CopiedTarget = "tasks" | "time" | null;

export default function Home() {
  const [report, setReport] = useState<TimesheetReport | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState("conference");
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<WorkflowStepId>("conference");
  const [taskDefaults, setTaskDefaults] = useState<TaskDefaults>(DEFAULT_TASKS);
  const [copiedTarget, setCopiedTarget] = useState<CopiedTarget>(null);
  const [taskConfigs, setTaskConfigs] = useState<Record<string, TaskConfig>>({});
  const [cecisResponseText, setCecisResponseText] = useState("");
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pendingSensitiveAction, setPendingSensitiveAction] = useState<SensitiveActionKind | null>(null);
  const [lastCopiedTasksMessage, setLastCopiedTasksMessage] = useState<string | null>(null);
  const [lastCopiedTimeEntriesMessage, setLastCopiedTimeEntriesMessage] = useState<string | null>(null);

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

  const tasksMessageResult = useMemo(() => {
    return buildTasksCecisMessage(uniqueTaskTitles, taskDefaults, taskConfigs);
  }, [taskConfigs, taskDefaults, uniqueTaskTitles]);

  const timeEntries = useMemo(() => {
    return buildTimeEntries(report, taskConfigs);
  }, [report, taskConfigs]);

  const readyTimeEntries = useMemo(() => getReadyTimeEntries(timeEntries), [timeEntries]);
  const pendingTimeEntryTitles = useMemo(() => getPendingTimeEntryTitles(timeEntries), [timeEntries]);
  const cecisResponseDiagnostics = useMemo(
    () => getCecisResponseDiagnostics(cecisResponseText, uniqueTaskTitles, taskConfigs),
    [cecisResponseText, taskConfigs, uniqueTaskTitles]
  );
  const conflictTaskTitles = cecisResponseDiagnostics.conflictTaskTitles;
  const timeEntriesMessageResult = useMemo(
    () => buildTimeEntriesCecisMessage(timeEntries, conflictTaskTitles),
    [conflictTaskTitles, timeEntries]
  );
  const mappedTimeEntriesLength = useMemo(
    () => timeEntries.filter((entry) => entry.issue_id > 0 && entry.activity_id > 0).length,
    [timeEntries]
  );
  const tasksCopied = lastCopiedTasksMessage !== null && lastCopiedTasksMessage === tasksMessageResult.message;
  const timeEntriesCopied = lastCopiedTimeEntriesMessage !== null && lastCopiedTimeEntriesMessage === timeEntriesMessageResult.message;
  const selectedSummary = report?.dailySummaries.find((summary) => summary.date === selectedDate) ?? report?.dailySummaries[0];
  const summaryByDate = useMemo(() => {
    return new Map(report?.dailySummaries.map((summary) => [summary.date, summary]) ?? []);
  }, [report]);
  const calendarCells = useMemo(() => {
    return report ? getCalendarCellsForMonth(report.importedMonth) : [];
  }, [report]);

  const processFile = (file: File) => {
    if (!privacyAcknowledged) {
      setError("Confirme que você entendeu o processamento local antes de importar um arquivo.");
      setLiveMessage("Importação bloqueada até a confirmação sobre processamento local.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsDragging(false);
    setCopiedTarget(null);
    setLastCopiedTasksMessage(null);
    setLastCopiedTimeEntriesMessage(null);
    setCecisResponseText("");
    setSelectedFileName(file.name);

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
        setActiveWorkflowStep("conference");
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
      setError("Confirme que você entendeu o processamento local antes de importar um arquivo.");
      setLiveMessage("Importação por arrastar e soltar bloqueada até a confirmação sobre processamento local.");
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
    if (cecisResponseDiagnostics.parsedIssues.length === 0) {
      setLiveMessage("Nenhum ID de tarefa foi reconhecido na resposta da Cesis.");
    } else if (conflictTaskTitles.length > 0) {
      setLiveMessage(`Resposta da Cesis analisada com ${conflictTaskTitles.length} conflito(s). Mapeamentos conflitantes não foram aplicados.`);
    } else {
      setLiveMessage(`Resposta da Cesis aplicada: ${cecisResponseDiagnostics.recognizedIssueCount} tarefa(s) mapeada(s).`);
    }
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
    setActiveWorkflowStep("conference");
    setSelectedFileName(null);
    setLastCopiedTasksMessage(null);
    setLastCopiedTimeEntriesMessage(null);
    setLiveMessage("Dados importados removidos desta sessão do navegador.");
  };

  const copyMessage = async (messageText: string, target: Exclude<CopiedTarget, null>) => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedTarget(target);
      if (target === "tasks") setLastCopiedTasksMessage(messageText);
      if (target === "time") setLastCopiedTimeEntriesMessage(messageText);
      setLiveMessage(target === "tasks" ? "Mensagem de tarefas copiada." : "Mensagem de lançamentos copiada.");
      window.setTimeout(() => setCopiedTarget(null), 1800);
    } catch (_error) {
      setError("Não foi possível copiar a mensagem. Verifique as permissões da área de transferência.");
      setLiveMessage("Não foi possível copiar a mensagem. Verifique as permissões da área de transferência.");
    }
  };

  const downloadRowsAsCsv = (rows: Array<Array<string | number>>, fileName: string) => {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(";"))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
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

    downloadRowsAsCsv(rows, `validacao-8h-${report.importedMonth}.csv`);
    setLiveMessage("Relatório CSV baixado para este dispositivo.");
  };

  const downloadCsvIssues = () => {
    if (!report || report.ignoredLineIssues.length === 0) return;

    const rows = [
      ["Linha", "Tipo", "Motivo", "Data", "Horas", "Sugestão"],
      ...report.ignoredLineIssues.map((issue) => [
        issue.lineNumber,
        issue.type,
        issue.reason,
        issue.date ?? "",
        issue.hours ?? "",
        issue.suggestion,
      ]),
    ];

    downloadRowsAsCsv(rows, `inconsistencias-csv-${report.importedMonth}.csv`);
    setLiveMessage("Relatório de inconsistências baixado para este dispositivo.");
  };

  const requestSensitiveAction = (action: SensitiveActionKind) => {
    setPendingSensitiveAction(action);
  };

  const handleResultTabChange = (tab: string) => {
    setActiveResultTab(tab);
    setActiveWorkflowStep(
      tab === "conference" ? "conference" : tab === "tasks" ? "tasks" : pendingTimeEntryTitles.length > 0 || conflictTaskTitles.length > 0 ? "map" : "copy"
    );
  };

  const handleWorkflowStepSelect = (step: WorkflowStepId) => {
    setActiveWorkflowStep(step);
    const tab = step === "conference" ? "conference" : step === "tasks" ? "tasks" : "time";
    setActiveResultTab(tab);

    if (step === "map" || step === "copy") {
      window.setTimeout(() => {
        const target = document.getElementById(step === "map" ? "cecis-mapping" : "time-entries-output");
        target?.focus();
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  };

  const confirmSensitiveAction = () => {
    const action = pendingSensitiveAction;
    setPendingSensitiveAction(null);

    if (action === "copyTasks") {
      void copyMessage(tasksMessageResult.message, "tasks");
      return;
    }

    if (action === "copyTimeEntries") {
      void copyMessage(timeEntriesMessageResult.message, "time");
      return;
    }

    if (action === "downloadReport") {
      downloadReportCsv();
      return;
    }

    if (action === "downloadCsvIssues") {
      downloadCsvIssues();
      return;
    }

    if (action === "clearImportedData") {
      clearImportedData();
    }
  };

  return (
    <AppShell logoSrc={logoSrc}>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="min-w-0">
          <UploadPanel
            isLoading={isLoading}
            isDragging={isDragging}
            error={error}
            report={report}
            completeDays={reportStats?.completeDays ?? 0}
            selectedFileName={selectedFileName}
            privacyAcknowledged={privacyAcknowledged}
            onDraggingChange={setIsDragging}
            onDrop={handleDrop}
            onFileUpload={handleFileUpload}
            onPrivacyAcknowledgedChange={setPrivacyAcknowledged}
            onClearImportedData={() => requestSensitiveAction("clearImportedData")}
            onDownloadCsvIssues={() => requestSensitiveAction("downloadCsvIssues")}
          />
        </div>

        <div className="min-w-0">
          {report && reportStats ? (
            <div className="space-y-6">
              <WorkflowStepper
                activeStep={activeWorkflowStep}
                completeDays={reportStats.completeDays}
                businessDayCount={report.businessDayCount}
                taskCount={uniqueTaskTitles.length}
                tasksCopied={tasksCopied}
                mappedTimeEntries={mappedTimeEntriesLength}
                totalTimeEntries={timeEntries.length}
                blockerCount={pendingTimeEntryTitles.length + conflictTaskTitles.length}
                timeEntriesCopied={timeEntriesCopied}
                onStepSelect={handleWorkflowStepSelect}
              />

              <Tabs value={activeResultTab} onValueChange={handleResultTabChange} className="space-y-6">
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
                    onDownloadReportCsv={() => requestSensitiveAction("downloadReport")}
                  />
                </TabsContent>

                <TabsContent value="tasks">
                  <TasksPanel
                    importedMonth={report.importedMonth}
                    uniqueTaskTitles={uniqueTaskTitles}
                    taskDefaults={taskDefaults}
                    taskConfigs={taskConfigs}
                    tasksMessageResult={tasksMessageResult}
                    copied={copiedTarget === "tasks"}
                    onTaskDefaultChange={updateTaskDefault}
                    onTaskConfigChange={updateTaskConfig}
                    onCopyTasks={() => requestSensitiveAction("copyTasks")}
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
                    responseDiagnostics={cecisResponseDiagnostics}
                    timeEntriesMessageResult={timeEntriesMessageResult}
                    copied={copiedTarget === "time"}
                    onCecisResponseChange={setCecisResponseText}
                    onApplyCecisResponse={applyCecisResponse}
                    onCopyTimeEntries={() => requestSensitiveAction("copyTimeEntries")}
                  />
                </TabsContent>

              </Tabs>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
      <SensitiveActionDialog
        action={pendingSensitiveAction}
        open={pendingSensitiveAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSensitiveAction(null);
        }}
        onConfirm={confirmSensitiveAction}
      />
    </AppShell>
  );
}

const sensitiveActionContent: Record<SensitiveActionKind, { title: string; description: string; confirmLabel: string }> = {
  copyTasks: {
    title: "Copiar mensagem de tarefas?",
    description: "Este conteúdo pode conter títulos, datas e IDs derivados do CSV importado. Confirme que o destino é um sistema autorizado para esta finalidade.",
    confirmLabel: "Copiar mensagem",
  },
  copyTimeEntries: {
    title: "Copiar mensagem de lançamentos?",
    description: "Este conteúdo pode conter issue_id, spent_on, horas e atividade. Confirme que a colagem será feita apenas em sistema autorizado.",
    confirmLabel: "Copiar mensagem",
  },
  downloadReport: {
    title: "Baixar relatório CSV?",
    description: "O arquivo baixado pode conter dados pessoais do CSV importado e ficará disponível neste dispositivo. Compartilhe apenas com pessoas e sistemas autorizados.",
    confirmLabel: "Baixar relatório",
  },
  downloadCsvIssues: {
    title: "Baixar inconsistências do CSV?",
    description: "O arquivo pode conter datas, horas e detalhes derivados do CSV importado. Confirme que ele ficará somente em um dispositivo e destino autorizados.",
    confirmLabel: "Baixar inconsistências",
  },
  clearImportedData: {
    title: "Limpar todos os dados importados?",
    description: "O relatório, as configurações de tarefas, os IDs mapeados e a resposta da Cesis serão removidos desta sessão. Esta ação não pode ser desfeita.",
    confirmLabel: "Limpar dados",
  },
};

function SensitiveActionDialog({
  action,
  open,
  onOpenChange,
  onConfirm,
}: {
  action: SensitiveActionKind | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const content = action ? sensitiveActionContent[action] : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{content?.title ?? "Confirmar ação"}</AlertDialogTitle>
          <AlertDialogDescription>
            {content?.description ?? "Confirme que esta ação está autorizada."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{content?.confirmLabel ?? "Confirmar"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
