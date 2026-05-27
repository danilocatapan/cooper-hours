import { Home } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/design-system/components/AppShell";
import { SectionCard } from "@/design-system/components/SectionCard";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const logoSrc = `${import.meta.env.BASE_URL}assets/coopersystem-logo.svg`;

  const handleGoHome = () => {
    setLocation(import.meta.env.BASE_URL || "/");
  };

  return (
    <AppShell logoSrc={logoSrc}>
      <div className="mx-auto max-w-2xl">
        <SectionCard
          title="Página não encontrada"
          description="O endereço acessado não existe ou foi movido."
          contentClassName="space-y-5"
        >
          <h2 className="text-4xl font-bold text-foreground">404</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            O validador continua disponível na tela inicial.
          </p>
          <Button type="button" onClick={handleGoHome}>
            <Home className="h-4 w-4" />
            Voltar para o início
          </Button>
        </SectionCard>
      </div>
    </AppShell>
  );
}
