import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, AlertCircle, CheckCircle2, TrendingUp, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Activity {
  title: string;
  hours: number;
}

interface DailySummary {
  date: string;
  activities: Activity[];
  totalHours: number;
  status: string;
}

interface TimesheetReport {
  dailySummaries: DailySummary[];
  overallTotalHours: number;
}

export default function Home() {
  const [report, setReport] = useState<TimesheetReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const parseNumber = (numberStr: string): number => {
    if (!numberStr || numberStr.trim() === "") return 0.0;

    let cleaned = numberStr.trim();
    cleaned = cleaned.replace(",", "");

    try {
      return parseFloat(cleaned);
    } catch {
      return 0.0;
    }
  };

  const detectSeparator = (headerLine: string): string => {
    if (headerLine.includes("\t")) return "\t";
    if (headerLine.includes(";")) return ";";
    if (headerLine.includes(",")) return ",";
    // Se não encontrar nenhum separador comum, tenta detectar por espaços múltiplos
    if (headerLine.includes("  ")) return " ";
    return ",";
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

  const processCsv = (csvText: string): TimesheetReport => {
    // Limpar linhas vazias e espaços em branco extras
    let lines = csvText.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) throw new Error("CSV vazio");

    const headerLine = lines[0];
    const separator = detectSeparator(headerLine);
    const headers = headerLine.split(separator).map((h) => h.trim().replace(/"/g, ""));

    const titleIdx = findHeaderIndex(headers, "Título", "Titulo");
    const dataIdx = findHeaderIndex(headers, "Data");
    const tempoIdx = findHeaderIndex(headers, "Tempo registrado soma", "Tempo");

    if (titleIdx === -1 || dataIdx === -1 || tempoIdx === -1) {
      throw new Error("Colunas obrigatórias não encontradas (Título, Data, Tempo registrado soma)");
    }

    const dailySummaries: Map<string, DailySummary> = new Map();
    let overallTotalHours = 0;
    let invalidLines = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const cols = line.split(separator).map((c) => c.trim().replace(/"/g, ""));

      if (cols.length <= Math.max(titleIdx, dataIdx, tempoIdx)) {
        invalidLines++;
        continue;
      }

      try {
        const date = cols[dataIdx]?.trim();
        const title = cols[titleIdx]?.trim();
        const hours = parseNumber(cols[tempoIdx]);

        // Validar formato da data (YYYY-MM-DD)
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          invalidLines++;
          continue;
        }

        if (!title || hours === 0) continue;

        if (!dailySummaries.has(date)) {
          dailySummaries.set(date, {
            date,
            activities: [],
            totalHours: 0,
            status: "",
          });
        }

        const summary = dailySummaries.get(date)!;
        summary.activities.push({ title, hours });
        summary.totalHours += hours;
        overallTotalHours += hours;
      } catch (e) {
        console.error(`Erro ao processar linha: ${line}`, e);
        invalidLines++;
      }
    }

    if (invalidLines > 0) {
      console.warn(`${invalidLines} linhas foram ignoradas por formato inválido`);
    }

    // Sort dates in descending order and calculate status
    // IMPORTANTE: Usar comparação de strings (YYYY-MM-DD) em vez de new Date() para evitar bug de timezone
    // new Date("2026-04-01") interpreta como UTC meia-noite, causando deslocamento de -1 dia em UTC-3
    const sortedSummaries = Array.from(dailySummaries.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((summary) => {
        if (summary.totalHours < 8) {
          summary.status = "Menos de 8 horas";
        } else if (summary.totalHours > 8) {
          summary.status = "Mais de 8 horas";
        } else {
          summary.status = "No horário";
        }
        // Sort activities by title
        summary.activities.sort((a, b) => a.title.localeCompare(b.title));
        return summary;
      });

    return {
      dailySummaries: sortedSummaries,
      overallTotalHours,
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const processedReport = processCsv(csvText);
        setReport(processedReport);
        setShowInstructions(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
        setReport(null);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const getStatusIcon = (status: string) => {
    if (status === "No horário") return <CheckCircle2 className="w-5 h-5 text-[#00D084]" />;
    if (status.includes("Menos")) return <AlertCircle className="w-5 h-5 text-[#FF6B5B]" />;
    return <TrendingUp className="w-5 h-5 text-[#00D084]" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "No horário") return "bg-[#00D084]/10 border-[#00D084]/30";
    if (status.includes("Menos")) return "bg-[#FF6B5B]/10 border-[#FF6B5B]/30";
    return "bg-[#00D084]/10 border-[#00D084]/30";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-lg">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663028934737/9Hdyhw3fLUo6PcvkDd26df/coopersystem-logo-transparent-3hSGAGxxh9ppEmWCRyZub6.webp" 
              alt="Coopersystem" 
              className="h-12"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Lançamento de horas</h1>
              <p className="text-sm text-muted-foreground">BusinessMap → Coopersystem</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Upload CSV</CardTitle>
                <CardDescription>Selecione seu arquivo de timesheet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
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
                      <p className="text-xs text-muted-foreground mt-1">ou arraste um arquivo</p>
                    </label>
                  </div>

                  {isLoading && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {report && (
                    <div className="bg-[#00D084]/10 border border-[#00D084]/30 rounded-lg p-4">
                      <p className="text-sm font-medium text-[#00D084]">✓ Arquivo processado com sucesso!</p>
                      <p className="text-xs text-[#00D084]/70 mt-1">{report.dailySummaries.length} dias carregados</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {report ? (
              <div className="space-y-6">
                {/* Summary Card */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">Resumo Geral</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#00D084]/10 rounded-lg p-4 border border-[#00D084]/30">
                        <p className="text-sm text-muted-foreground">Total de Horas</p>
                        <p className="text-3xl font-bold text-[#00D084] mt-2">{report.overallTotalHours.toFixed(1)}h</p>
                      </div>
                      <div className="bg-[#FF6B5B]/10 rounded-lg p-4 border border-[#FF6B5B]/30">
                        <p className="text-sm text-muted-foreground">Dias Registrados</p>
                        <p className="text-3xl font-bold text-[#FF6B5B] mt-2">{report.dailySummaries.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Details */}
                <Tabs defaultValue="0" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 bg-card border border-border">
                    {report.dailySummaries.slice(0, 5).map((summary, idx) => (
                      <TabsTrigger key={idx} value={idx.toString()} className="text-xs">
                        {new Date(summary.date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {report.dailySummaries.map((summary, idx) => (
                    <TabsContent key={idx} value={idx.toString()}>
                      <Card className={`border-2 ${getStatusColor(summary.status)} bg-card`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg text-foreground">
                                {new Date(summary.date).toLocaleDateString("pt-BR", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </CardTitle>
                              <CardDescription className="mt-2">
                                <span className="font-semibold text-foreground">{summary.totalHours.toFixed(1)}h</span> de trabalho
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(summary.status)}
                              <span className="text-sm font-medium text-foreground">{summary.status}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {summary.activities.map((activity, actIdx) => (
                              <div key={actIdx} className="flex items-start justify-between p-3 bg-[#2a3a4f] rounded-lg border border-border">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground line-clamp-2">{activity.title}</p>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-[#00D084]/20 text-[#00D084]">
                                    {activity.hours.toFixed(1)}h
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>

                {/* All Days View */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">Todos os Dias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {report.dailySummaries.map((summary, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-[#3a4a5f]/50 rounded-lg transition-colors">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {new Date(summary.date).toLocaleDateString("pt-BR")}
                            </p>
                            <p className="text-xs text-muted-foreground">{summary.activities.length} atividades</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-foreground">{summary.totalHours.toFixed(1)}h</span>
                            {getStatusIcon(summary.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Instructions Card */}
                {showInstructions && (
                  <Card className="border-primary/30 bg-[#00D084]/10">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                        <div>
                          <CardTitle className="text-lg text-foreground">Como usar</CardTitle>
                          <CardDescription className="text-muted-foreground mt-1">
                            Seu arquivo CSV deve conter os seguintes campos obrigatórios:
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-card rounded-lg p-4 border border-border">
                        <p className="text-sm font-semibold text-foreground mb-3">Campos obrigatórios:</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            <strong className="text-foreground">Usuário</strong> - Nome do colaborador
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            <strong className="text-foreground">ID do cartão</strong> - Identificador do cartão
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            <strong className="text-foreground">Título</strong> - Descrição da tarefa
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            <strong className="text-foreground">Etiquetas</strong> - Tags/categorias (opcional)
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            <strong className="text-foreground">Data</strong> - Data do registro (formato: YYYY-MM-DD)
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            <strong className="text-foreground">Tempo registrado soma</strong> - Horas trabalhadas (formato: 5.000)
                          </li>
                        </ul>
                      </div>

                      <div className="bg-card rounded-lg p-4 border border-border">
                        <p className="text-sm font-semibold text-foreground mb-3">Exemplo de arquivo CSV:</p>
                        <div className="bg-[#1a2332] rounded p-3 text-xs font-mono text-muted-foreground overflow-x-auto">
                          <div className="whitespace-pre-wrap break-words">
{`Usuário	ID do cartão	Título	Etiquetas	Data	Tempo registrado soma
Danilo	893566	[Back] [Arquitetural] Replicação dos endpoints	"QualityBot,#inic0004688"	2026-04-01	5.000
Danilo	987589	[313-Maestro] Ritos (Daily, Planning)	"#inic0004688,#bbseg"	2026-04-01	1.000
Danilo	987605	[313-Maestro] Refinamento	"#inic0004688,#bbseg"	2026-04-01	2.000`}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          💡 Dica: O arquivo pode ser separado por vírgula, ponto-e-vírgula ou tabulação
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowInstructions(false)}
                        className="w-full"
                      >
                        Entendi, esconder instruções
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Empty State */}
                <Card className="border-2 border-dashed border-border bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      Faça upload de um arquivo CSV para começar a processar seus registros de timesheet
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          <p>Lançamento de horas BusinessMap → Coopersystem v1.0</p>
        </div>
      </footer>
    </div>
  );
}
