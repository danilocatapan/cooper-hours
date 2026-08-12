import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LGPD_NOTICE } from "../lgpd";

const treatmentItems = [
  {
    title: "Finalidade",
    body: "Conferir lançamentos de horas, identificar pendências e gerar relatórios ou JSONs para uso manual.",
  },
  {
    title: "Tratamento local",
    body: "O CSV completo é processado somente no navegador. Nenhum dado é enviado para servidor, banco de dados ou serviço externo.",
  },
  {
    title: "Compartilhamento",
    body: "O fluxo é exclusivamente manual. O compartilhamento só acontece quando você copia um JSON ou baixa um relatório e decide utilizá-lo.",
  },
  {
    title: "Retenção",
    body: "O CSV fica apenas no estado da página e é removido ao recarregar ou fechar a aba. Somente a preferência de tema pode ficar salva no navegador.",
  },
];

export function PrivacyNoticeDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-selection">
          <ShieldCheck className="h-3.5 w-3.5" />
          Aviso de Privacidade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto border-border bg-card p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12 text-left sm:px-6 sm:pr-14">
          <DialogTitle>Aviso de Privacidade LGPD</DialogTitle>
          <DialogDescription>
            Informações essenciais sobre o tratamento local dos dados no fluxo manual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 pb-5 text-sm sm:px-6 sm:pb-6">
          <section className="rounded-lg border border-selection/30 bg-selection/10 p-4">
            <p className="font-semibold text-foreground">Controlador</p>
            <p className="mt-2 text-muted-foreground">
              {LGPD_NOTICE.controllerName}. Canal de atendimento: {LGPD_NOTICE.contactChannel}. Encarregado/DPO: {LGPD_NOTICE.dpoContact}.
            </p>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            {treatmentItems.map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-surface-subtle p-4">
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 leading-6 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-border bg-surface-subtle p-4">
            <p className="font-semibold text-foreground">Categorias de dados pessoais</p>
            <p className="mt-2 leading-6 text-muted-foreground">
              {LGPD_NOTICE.dataCategories.join(", ")}.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-surface-subtle p-4">
            <p className="font-semibold text-foreground">Direitos do titular</p>
            <p className="mt-2 leading-6 text-muted-foreground">
              Você pode solicitar confirmação de tratamento, acesso, correção, anonimização,
              bloqueio, eliminação, portabilidade, informações sobre compartilhamento e revogação
              de consentimento, quando aplicável, pelo canal {LGPD_NOTICE.contactChannel}.
            </p>
          </section>

          <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-foreground">
            Este texto usa placeholders e deve ser revisado por [PLACEHOLDER_RESPONSAVEL_JURIDICO]
            antes de uso institucional.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
