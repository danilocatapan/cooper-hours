import { Info, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionCard } from "./SectionCard";
import { StatusBadge } from "./StatusBadge";

export function EmptyState() {
  return (
    <div className="space-y-6">
      <SectionCard
        className="border-primary/30 bg-primary/10"
        title={(
          <span className="flex items-center gap-3">
            <Info className="h-5 w-5 flex-shrink-0 text-primary" />
            Como a validação funciona
          </span>
        )}
        description="O sistema soma as atividades por data e compara cada dia com a meta de 8h."
      >
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-success/30 bg-card p-3">
            <StatusBadge status="complete">8h completas</StatusBadge>
            <p className="mt-2 text-muted-foreground">Dia pronto para conferência final.</p>
          </div>
          <div className="rounded-lg border border-danger/30 bg-card p-3">
            <StatusBadge status="underTarget">Pendente</StatusBadge>
            <p className="mt-2 text-muted-foreground">Faltam horas para fechar a meta.</p>
          </div>
          <div className="rounded-lg border border-warning/40 bg-card p-3">
            <StatusBadge status="overTarget">Acima da meta</StatusBadge>
            <p className="mt-2 text-muted-foreground">Há horas a revisar acima de 8h.</p>
          </div>
        </div>
      </SectionCard>

      <Card className="border-2 border-dashed border-border bg-card">
        <CardHeader className="sr-only">
          <CardTitle>Envio pendente</CardTitle>
          <CardDescription>Envie um CSV para iniciar.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-center text-muted-foreground">
            Envie o CSV para começar a conferência dos lançamentos diários.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
