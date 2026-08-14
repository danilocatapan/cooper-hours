import { AppShell } from "@/design-system/components/AppShell";
import { SectionCard } from "@/design-system/components/SectionCard";
import { appVersionNumber } from "@/lib/appVersion";

export default function Features() {
  const logoSrc = `${import.meta.env.BASE_URL}assets/coopersystem-logo.svg`;

  return (
    <AppShell logoSrc={logoSrc}>
      <div className="mx-auto max-w-4xl space-y-6">
        <SectionCard title="Sobre / Features" description={`Versão ${appVersionNumber}`}>
          <div className="space-y-4 text-sm leading-6 text-foreground">
            <p>
              Esta ferramenta confere localmente arquivos CSV do BusinessMap e prepara mensagens para o fluxo manual da Cesis. Ela não cria tarefas nem registra horas automaticamente.
            </p>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Changelog 1.0.0</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Validação local de CSV com análise de lançamento por dia e métricas de conferência.",
                  "Grade mensal com 7 colunas, seleção por teclado, estados visuais e foco acessível.",
                  "Upload por dropzone com botão interno contido, suporte a teclado e nomes longos.",
                  "Modal de formato CSV ampliado em desktop, responsivo e sem overflow horizontal.",
                  "Preparação de mensagens operacionais para tarefas e lançamentos autorizados na Cesis.",
                  "Testes Playwright para proporção de cards, upload, modal, rota Sobre e versão.",
                ].map((feature) => (
                  <div key={feature} className="rounded-lg border border-border bg-surface-subtle p-3 text-muted-foreground">
                    {feature}
                  </div>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                A rota <strong className="text-foreground">/features</strong> fica disponível pelo rodapé. A versão é lida de <code>VITE_APP_VERSION</code> e usa <code>1.0.0</code> como fallback local.
              </p>
            </div>
            <p>
              O objetivo desta página é fornecer uma visão objetiva do status atual da aplicação, com foco em transparência e regressões antes da publicação.
            </p>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
