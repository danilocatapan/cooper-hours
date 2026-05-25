import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, AlertCircle, CheckCircle2, TrendingUp, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Activity {
  title: string;
  hours: number;
}

interface DailySummary {
  date: string;
  activities: Activity[];
  totalHours: number;
  isBusinessDay: boolean;
  isMissing: boolean;
}

interface TimesheetReport {
  dailySummaries: DailySummary[];
  overallTotalHours: number;
  ignoredLineCount: number;
  duplicateLineCount: number;
  rawLineCount: number;
  validLineCount: number;
  importedDayCount: number;
  importedMonth: string;
  userName: string | null;
  businessDayCount: number;
  missingBusinessDays: string[];
  weekendOrExtraDays: string[];
}

type DailyStatus = "complete" | "pending" | "over";

const DAILY_TARGET_HOURS = 8;
const HOUR_TOLERANCE = 0.01;

export default function Home() {
  const [report, setReport] = useState<TimesheetReport | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const parseNumber = (numberStr: string): number => {
    if (!numberStr || numberStr.trim() === "") return 0.0;

    let s = numberStr.trim();
    s = s.replace(/"/g, "");

    if (s.includes(".") && s.includes(",")) {
      s = s.replace(/,/g, "");
    } else if (s.includes(",")) {
      s = s.replace(/,/g, ".");
    }

    s = s.replace(/\s+/g, "");

    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0.0;
  };

  const detectSeparator = (headerLine: string): string => {
    if (headerLine.includes("\t")) return "\t";
    if (headerLine.includes(";")) return ";";
    if (headerLine.includes(",")) return ",";
    if (headerLine.includes("  ")) return " ";
    return ",";
  };

  const splitLine = (line: string, separator: string): string[] => {
    if (separator === " ") return line.split(/\s{2,}/);

    const cols: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === "\"" && nextChar === "\"") {
        current += "\"";
        i++;
      } else if (char === "\"") {
        insideQuotes = !insideQuotes;
      } else if (char === separator && !insideQuotes) {
        cols.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    cols.push(current);
    return cols;
  };

  const findHeaderIndex = (headers: string[], ...possibleNames: string[]): number => {
    for (const name of possibleNames) {
      for (let i = 0; i < headers.length; i++) {
        if (headers[i].toLowerCase() === name.toLowerCase()) {
          return i;
        }
      }
    }
    return -1;
  };

  const getDailyStatus = (totalHours: number): DailyStatus => {
    const difference = totalHours - DAILY_TARGET_HOURS;
    if (Math.abs(difference) < HOUR_TOLERANCE) return "complete";
    return difference < 0 ? "pending" : "over";
  };

  const isBusinessDay = (date: string) => {
    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  };

  const getBusinessDaysForMonth = (month: string) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const businessDays: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${month}-${String(day).padStart(2, "0")}`;
      if (isBusinessDay(date)) businessDays.push(date);
    }

    return businessDays;
  };

  const getCalendarCellsForMonth = (month: string) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const firstDay = new Date(`${month}-01T00:00:00`).getDay();
    const leadingEmptyCells = (firstDay + 6) % 7;
    const cells: Array<string | null> = Array.from({ length: leadingEmptyCells }, () => null);

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(`${month}-${String(day).padStart(2, "0")}`);
    }

    return cells;
  };

  const processCsv = (csvText: string): TimesheetReport => {
    const lines = csvText.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length === 0) throw new Error("CSV vazio");

    const headerLine = lines[0];
    const separator = detectSeparator(headerLine);
    const headers = splitLine(headerLine, separator).map((h) => h.trim().replace(/"/g, ""));

    const titleIdx = findHeaderIndex(headers, "Título", "Titulo");
    const dataIdx = findHeaderIndex(headers, "Data");
    const tempoIdx = findHeaderIndex(headers, "Tempo registrado soma", "Tempo");
    const userIdx = findHeaderIndex(headers, "Usuário", "Usuario");
    const cardIdx = findHeaderIndex(headers, "ID do cartão", "ID do cartao", "ID", "Cartão", "Cartao");

    if (titleIdx === -1 || dataIdx === -1 || tempoIdx === -1) {
      throw new Error("Colunas obrigatórias não encontradas (Título, Data, Tempo registrado soma)");
    }

    const dailySummaries: Map<string, DailySummary> = new Map();
    const importedMonths: Set<string> = new Set();
    const importedUsers: Set<string> = new Set();
    const duplicateKeys: Set<string> = new Set();
    let overallTotalHours = 0;
    let ignoredLineCount = 0;
    let duplicateLineCount = 0;
    let validLineCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const cols = splitLine(line, separator).map((c) => c.trim().replace(/"/g, ""));

      if (cols.length <= Math.max(titleIdx, dataIdx, tempoIdx)) {
        ignoredLineCount++;
        continue;
      }

      try {
        const date = cols[dataIdx]?.trim();
        const title = cols[titleIdx]?.trim();
        const hours = parseNumber(cols[tempoIdx]);
        const user = userIdx >= 0 ? cols[userIdx]?.trim() : "";
        const cardId = cardIdx >= 0 ? cols[cardIdx]?.trim() : "";

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          ignoredLineCount++;
          continue;
        }

        if (!title || hours === 0) {
          ignoredLineCount++;
          continue;
        }

        importedMonths.add(date.slice(0, 7));
        if (user) importedUsers.add(user);

        const duplicateKey = [date, cardId, title, hours.toFixed(3)].join("|").toLowerCase();
        if (duplicateKeys.has(duplicateKey)) {
          duplicateLineCount++;
          continue;
        }
        duplicateKeys.add(duplicateKey);

        if (!dailySummaries.has(date)) {
          dailySummaries.set(date, {
            date,
            activities: [],
            totalHours: 0,
            isBusinessDay: isBusinessDay(date),
            isMissing: false,
          });
        }

        const summary = dailySummaries.get(date)!;
        summary.activities.push({ title, hours });
        summary.totalHours += hours;
        overallTotalHours += hours;
        validLineCount++;
      } catch (e) {
        console.error(`Erro ao processar linha: ${line}`, e);
        ignoredLineCount++;
      }
    }

    if (importedMonths.size > 1) {
      throw new Error("O arquivo contém registros de mais de um mês. Envie um CSV com apenas um mês por importação.");
    }

    if (importedUsers.size > 1) {
      throw new Error("O arquivo contém registros de mais de um usuário. Envie um CSV individual por importação.");
    }

    if (dailySummaries.size === 0) {
      throw new Error("Nenhum registro válido encontrado no arquivo");
    }

    const importedMonth = Array.from(importedMonths)[0];
    const businessDays = getBusinessDaysForMonth(importedMonth);
    const missingBusinessDays = businessDays.filter((date) => !dailySummaries.has(date));
    const weekendOrExtraDays = Array.from(dailySummaries.values())
      .filter((summary) => !summary.isBusinessDay)
      .map((summary) => summary.date);

    missingBusinessDays.forEach((date) => {
      dailySummaries.set(date, {
        date,
        activities: [],
        totalHours: 0,
        isBusinessDay: true,
        isMissing: true,
      });
    });

    const sortedSummaries = Array.from(dailySummaries.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((summary) => {
        summary.activities.sort((a, b) => a.title.localeCompare(b.title));
        return summary;
      });

    return {
      dailySummaries: sortedSummaries,
      overallTotalHours,
      ignoredLineCount,
      duplicateLineCount,
      rawLineCount: lines.length - 1,
      validLineCount,
      importedDayCount: dailySummaries.size - missingBusinessDays.length,
      importedMonth,
      userName: importedUsers.size === 1 ? Array.from(importedUsers)[0] : null,
      businessDayCount: businessDays.length,
      missingBusinessDays,
      weekendOrExtraDays,
    };
  };

  const processFile = (file: File) => {
    setIsLoading(true);
    setError(null);
    setIsDragging(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const processedReport = processCsv(csvText);
        setReport(processedReport);
        setSelectedDate(
          processedReport.dailySummaries.find((summary) => !summary.isMissing)?.date
          ?? processedReport.dailySummaries[0]?.date
          ?? null
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
        setReport(null);
        setSelectedDate(null);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Não foi possível ler o arquivo selecionado");
      setIsLoading(false);
      setReport(null);
      setSelectedDate(null);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLoading) return;

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      setIsDragging(false);
      return;
    }

    processFile(file);
  };

  const getStatusIcon = (status: DailyStatus) => {
    if (status === "complete") return <CheckCircle2 className="w-5 h-5 text-[#00D084]" />;
    if (status === "pending") return <AlertCircle className="w-5 h-5 text-[#FF6B5B]" />;
    return <TrendingUp className="w-5 h-5 text-[#FFB020]" />;
  };

  const getStatusLabel = (summary: DailySummary) => {
    const status = getDailyStatus(summary.totalHours);
    const difference = Math.abs(summary.totalHours - DAILY_TARGET_HOURS);

    if (status === "complete") return "8h completas";
    if (status === "pending") return `Pendente: faltam ${difference.toFixed(1)}h`;
    return `Acima da meta: +${difference.toFixed(1)}h`;
  };

  const getStatusClass = (status: DailyStatus) => {
    if (status === "complete") return "bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084]";
    if (status === "pending") return "bg-[#FF6B5B]/10 border-[#FF6B5B]/30 text-[#FF6B5B]";
    return "bg-[#FFB020]/10 border-[#FFB020]/40 text-[#FFB020]";
  };

  const formatLocalDate = (date: string, options?: Intl.DateTimeFormatOptions) => {
    return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", options);
  };

  const downloadReportCsv = () => {
    if (!report) return;

    const rows = [
      ["Data", "Dia util", "Total lancado", "Status", "Atividades"],
      ...report.dailySummaries
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((summary) => [
          summary.date,
          summary.isBusinessDay ? "sim" : "nao",
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

  const logoSrc = `${import.meta.env.BASE_URL}assets/coopersystem-logo.svg`;

  const reportStats = useMemo(() => {
    if (!report) return null;

    const expectedSummaries = report.dailySummaries.filter((summary) => summary.isBusinessDay);
    const completeDays = expectedSummaries.filter((summary) => getDailyStatus(summary.totalHours) === "complete").length;
    const pendingDays = expectedSummaries.filter((summary) => getDailyStatus(summary.totalHours) === "pending").length;
    const overDays = expectedSummaries.filter((summary) => getDailyStatus(summary.totalHours) === "over").length;
    const expectedTotalHours = report.businessDayCount * DAILY_TARGET_HOURS;

    return {
      completeDays,
      pendingDays,
      overDays,
      expectedTotalHours,
      expectedSummaries,
    };
  }, [report]);

  const selectedSummary = report?.dailySummaries.find((summary) => summary.date === selectedDate) ?? report?.dailySummaries[0];
  const summaryByDate = useMemo(() => {
    return new Map(report?.dailySummaries.map((summary) => [summary.date, summary]) ?? []);
  }, [report]);
  const calendarCells = useMemo(() => {
    return report ? getCalendarCellsForMonth(report.importedMonth) : [];
  }, [report]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-lg">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="Coopersystem"
              className="h-12"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Validação diária de 8h</h1>
              <p className="text-sm text-muted-foreground">BusinessMap → Coopersystem</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="sticky top-8 border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Validar lançamento diário de 8h</CardTitle>
                <CardDescription>Envie o CSV do BusinessMap para conferir dias completos, pendentes e acima da meta.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div
                    onDragEnter={(event) => {
                      event.preventDefault();
                      if (!isLoading) setIsDragging(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!isLoading) setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragging
                        ? "border-primary bg-[#00D084]/10"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleFileUpload}
                      disabled={isLoading}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">Clique para selecionar</p>
                      <p className="text-xs text-muted-foreground mt-1">ou arraste um arquivo CSV aqui</p>
                    </label>
                  </div>

                  {isLoading && (
                    <div className="flex items-center justify-center py-4" role="status" aria-label="Processando arquivo">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {report && reportStats && (
                    <div className="bg-[#00D084]/10 border border-[#00D084]/30 rounded-lg p-4">
                      <p className="text-sm font-medium text-[#00D084]">Arquivo analisado com sucesso</p>
                      <p className="text-xs text-[#00D084]/80 mt-1">
                        {reportStats.completeDays} de {report.businessDayCount} dias úteis com 8h completas
                      </p>
                    </div>
                  )}

                  {report && report.ignoredLineCount > 0 && (
                    <Alert className="border-[#FFB020]/40 bg-[#FFB020]/10 text-[#FFB020]">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {report.ignoredLineCount} linha(s) foram ignoradas por data inválida, horas zeradas ou campos obrigatórios ausentes.
                      </AlertDescription>
                    </Alert>
                  )}

                  {report && report.duplicateLineCount > 0 && (
                    <Alert className="border-[#FFB020]/40 bg-[#FFB020]/10 text-[#FFB020]">
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
                          <p className="text-sm font-semibold text-foreground mb-3">Campos obrigatórios:</p>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><strong className="text-foreground">Título</strong> - descrição da tarefa</li>
                            <li><strong className="text-foreground">Data</strong> - formato YYYY-MM-DD</li>
                            <li><strong className="text-foreground">Tempo registrado soma</strong> - horas trabalhadas, exemplo 5.000</li>
                          </ul>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-foreground mb-3">Exemplo de CSV:</p>
                          <div className="bg-[#1a2332] rounded p-3 text-xs font-mono text-muted-foreground overflow-x-auto">
                            <div className="whitespace-pre-wrap break-words">
{`Usuário	ID do cartão	Título	Etiquetas	Data	Tempo registrado soma
Danilo	893566	[Back] [Arquitetural] Replicação dos endpoints	"QualityBot,#inic0004688"	2026-04-01	5.000
Danilo	987589	[313-Maestro] Ritos (Daily, Planning)	"#inic0004688,#bbseg"	2026-04-01	1.000
Danilo	987605	[313-Maestro] Refinamento	"#inic0004688,#bbseg"	2026-04-01	2.000`}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            O arquivo pode ser separado por vírgula, ponto-e-vírgula ou tabulação.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {report && reportStats ? (
              <div className="space-y-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">Conferência do período</CardTitle>
                    <CardDescription>
                      {reportStats.completeDays}/{report.businessDayCount} dias úteis fechados com 8h.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div className="bg-[#00D084]/10 rounded-lg p-4 border border-[#00D084]/30">
                        <p className="text-sm text-muted-foreground">8h completas</p>
                        <p className="text-3xl font-bold text-[#00D084] mt-2">{reportStats.completeDays}</p>
                      </div>
                      <div className="bg-[#FF6B5B]/10 rounded-lg p-4 border border-[#FF6B5B]/30">
                        <p className="text-sm text-muted-foreground">Dias pendentes</p>
                        <p className="text-3xl font-bold text-[#FF6B5B] mt-2">{reportStats.pendingDays}</p>
                      </div>
                      <div className="bg-[#FFB020]/10 rounded-lg p-4 border border-[#FFB020]/40">
                        <p className="text-sm text-muted-foreground">Acima da meta</p>
                        <p className="text-3xl font-bold text-[#FFB020] mt-2">{reportStats.overDays}</p>
                      </div>
                      <div className="bg-[#3a4a5f]/50 rounded-lg p-4 border border-border">
                        <p className="text-sm text-muted-foreground">Lançado / esperado</p>
                        <p className="text-2xl font-bold text-foreground mt-2">
                          {report.overallTotalHours.toFixed(1)}h / {reportStats.expectedTotalHours.toFixed(1)}h
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-border bg-[#1a2332]/50 p-3">
                        <p className="text-muted-foreground">Resumo da importação</p>
                        <p className="mt-1 text-foreground">
                          {report.validLineCount} de {report.rawLineCount} linhas válidas
                          {report.userName ? ` para ${report.userName}` : ""} em {report.importedMonth}.
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-[#1a2332]/50 p-3">
                        <p className="text-muted-foreground">Dias úteis ausentes</p>
                        <p className="mt-1 text-foreground">
                          {report.missingBusinessDays.length === 0
                            ? "Nenhum dia útil ausente no mês."
                            : `${report.missingBusinessDays.length} dia(s) sem lançamento.`}
                        </p>
                      </div>
                    </div>

                    {report.missingBusinessDays.length > 0 && (
                      <Alert className="mt-4 border-[#FF6B5B]/30 bg-[#FF6B5B]/10 text-[#FF6B5B]">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {report.missingBusinessDays.length} dia(s) úteis estão sem lançamento. Eles aparecem em vermelho na grade mensal abaixo.
                        </AlertDescription>
                      </Alert>
                    )}

                    {report.weekendOrExtraDays.length > 0 && (
                      <Alert className="mt-4 border-[#FFB020]/40 bg-[#FFB020]/10 text-[#FFB020]">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {report.weekendOrExtraDays.length} sábado/domingo foram importados e exibidos como hora extra, mas não entram na meta obrigatória de dias úteis.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full sm:w-auto"
                      onClick={downloadReportCsv}
                    >
                      Baixar relatório CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">Conferência diária</CardTitle>
                    <CardDescription>Selecione qualquer dia para revisar total e atividades.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div aria-label="Calendário do mês importado">
                        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
                          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((weekday) => (
                            <span key={weekday}>{weekday}</span>
                          ))}
                        </div>
                        <div className="mt-2 grid grid-cols-7 gap-2">
                          {calendarCells.map((date, idx) => {
                            if (!date) return <div key={`empty-${idx}`} className="min-h-16" />;

                            const summary = summaryByDate.get(date);
                            const dayNumber = Number(date.slice(-2));
                            const isWeekend = !isBusinessDay(date);
                            const isSelected = selectedSummary?.date === date;

                            if (!summary) {
                              return (
                                <div
                                  key={date}
                                  className="min-h-16 rounded-lg border border-border/60 bg-[#1a2332]/30 p-2 text-left opacity-60"
                                >
                                  <p className="text-sm font-semibold text-muted-foreground">{dayNumber}</p>
                                  {isWeekend && <p className="mt-1 text-[11px] text-muted-foreground">opcional</p>}
                                </div>
                              );
                            }

                            const status = getDailyStatus(summary.totalHours);

                            return (
                              <button
                                key={date}
                                type="button"
                                onClick={() => setSelectedDate(date)}
                                aria-label={`${formatLocalDate(date)} ${summary.totalHours.toFixed(1)}h ${summary.isMissing ? "ausente" : summary.isBusinessDay ? "dia útil" : "hora extra"}`}
                                className={`min-h-16 rounded-lg border p-2 text-left transition-colors ${
                                  isSelected
                                    ? "border-primary bg-[#00D084]/10"
                                    : summary.isMissing
                                      ? "border-[#FF6B5B]/30 bg-[#FF6B5B]/10 hover:bg-[#FF6B5B]/15"
                                      : !summary.isBusinessDay
                                        ? "border-[#FFB020]/40 bg-[#FFB020]/10 hover:bg-[#FFB020]/15"
                                        : "border-border bg-[#1a2332]/50 hover:bg-[#3a4a5f]/50"
                                }`}
                                aria-pressed={isSelected}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-sm font-semibold text-foreground">{dayNumber}</span>
                                  {getStatusIcon(status)}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{summary.totalHours.toFixed(1)}h</p>
                                <p className={`mt-1 w-fit rounded-full border px-1.5 py-0.5 text-[11px] font-medium ${getStatusClass(status)}`}>
                                  {summary.isMissing ? "ausente" : summary.isBusinessDay ? "dia útil" : "extra"}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {selectedSummary && (
                        <div className={`rounded-lg border-2 p-4 ${getStatusClass(getDailyStatus(selectedSummary.totalHours))}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h2 className="text-lg font-semibold text-foreground">
                                {formatLocalDate(selectedSummary.date, {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </h2>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {selectedSummary.totalHours.toFixed(1)}h lançadas de {DAILY_TARGET_HOURS.toFixed(1)}h esperadas.
                              </p>
                              {selectedSummary.isMissing && (
                                <p className="mt-1 text-sm text-[#FF6B5B]">Sem registro no CSV.</p>
                              )}
                              {!selectedSummary.isBusinessDay && (
                                <p className="mt-1 text-sm text-[#FFB020]">Hora extra, não obrigatória.</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              {getStatusIcon(getDailyStatus(selectedSummary.totalHours))}
                              <span>{getStatusLabel(selectedSummary)}</span>
                            </div>
                          </div>

                          {getDailyStatus(selectedSummary.totalHours) !== "complete" && (
                            <p className="mt-4 rounded-lg bg-[#1a2332]/60 p-3 text-sm text-muted-foreground">
                              {selectedSummary.isMissing
                                ? "Inclua este dia no BusinessMap e exporte novamente o CSV após corrigir o lançamento."
                                : "Revise este dia no BusinessMap e exporte novamente o CSV após corrigir o lançamento."}
                            </p>
                          )}

                          <div className="mt-4 space-y-3">
                            {selectedSummary.activities.length > 0 ? (
                              selectedSummary.activities.map((activity, actIdx) => (
                                <div key={actIdx} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-[#2a3a4f] p-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-[#00D084]/20 text-[#00D084]">
                                      {activity.hours.toFixed(1)}h
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-lg border border-border bg-[#2a3a4f] p-3 text-sm text-muted-foreground">
                                Nenhuma atividade encontrada para este dia.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="border-primary/30 bg-[#00D084]/10">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <CardTitle className="text-lg text-foreground">Como a validação funciona</CardTitle>
                        <CardDescription className="text-muted-foreground mt-1">
                          O sistema soma as atividades por data e compara cada dia com a meta de 8h.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-lg border border-[#00D084]/30 bg-card p-3">
                        <p className="font-semibold text-[#00D084]">8h completas</p>
                        <p className="text-muted-foreground mt-1">Dia pronto para conferência final.</p>
                      </div>
                      <div className="rounded-lg border border-[#FF6B5B]/30 bg-card p-3">
                        <p className="font-semibold text-[#FF6B5B]">Pendente</p>
                        <p className="text-muted-foreground mt-1">Faltam horas para fechar a meta.</p>
                      </div>
                      <div className="rounded-lg border border-[#FFB020]/40 bg-card p-3">
                        <p className="font-semibold text-[#FFB020]">Acima da meta</p>
                        <p className="text-muted-foreground mt-1">Há horas a revisar acima de 8h.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed border-border bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      Envie o CSV para começar a conferência dos lançamentos diários.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          <p>Validação diária de 8h BusinessMap → Coopersystem v1.0</p>
        </div>
      </footer>
    </div>
  );
}
