import { AppShell } from "@/design-system/components/AppShell";
import { SectionCard } from "@/design-system/components/SectionCard";

const appVersion = import.meta.env.VITE_APP_VERSION ?? "1.0.0";

export default function Features() {
  const logoSrc = `${import.meta.env.BASE_URL}assets/coopersystem-logo.svg`;

  return (
    <AppShell logoSrc={logoSrc}>
      <div className="mx-auto max-w-4xl space-y-6">
        <SectionCard title="Sobre / Features" description={`Versão ${appVersion}`}>
          <div className="space-y-4 text-sm leading-6 text-foreground">
            <p>
              Esta ferramenta foi construída para validar localmente arquivos CSV do BusinessMap, conferindo dias úteis, horas lançadas e formatos de importação antes do envio para sistemas autorizados.
            </p>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Changelog 1.0.0</p>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>Validação local de CSV com análise de lançamento por dia e geração de métricas de conferência.</li>
                <li>Grade mensal com 7 colunas de dias, seleção por teclado, estados visuais e foco acessível.</li>
                <li>Upload via dropzone com botão interno compacto, suporte a teclado e arquivos longos.</li>
                <li>Modal de formato CSV ampliado em desktop, com layout responsivo e sem overflow horizontal.</li>
                <li>Rota dedicada <strong>/features</strong> e link no rodapé como "Sobre".</li>
                <li>Versão exibida no app lida de <code>VITE_APP_VERSION</code> e, por fallback, `1.0.0`.</li>
                <li>Testes Playwright reforçados para proporção de cards, foco/hover do upload, modal e rota Sobre.</li>
              </ul>
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
