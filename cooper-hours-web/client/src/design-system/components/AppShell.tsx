import type { ReactNode } from "react";
import { appVersionLabel } from "@/lib/appVersion";
import { textClass } from "../tokens";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface AppShellProps {
  logoSrc: string;
  children: ReactNode;
}

export function AppShell({ logoSrc, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Ir para o conteúdo principal
      </a>
      <header className="border-b border-border bg-card shadow-lg">
        <div className="container py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img src={logoSrc} alt="Coopersystem" className="h-12" />
              <div>
                <h1 className={textClass.pageTitle}>Validação diária de 8h</h1>
                <p className="text-sm text-muted-foreground">BusinessMap - Coopersystem</p>
              </div>
            </div>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main id="main-content" className="container py-8">{children}</main>

      <footer className="mt-12 border-t border-border bg-card">
        <div className="container py-6 text-center text-sm text-muted-foreground space-y-2">
          <p>
            Validação diária de 8h BusinessMap - Coopersystem
            <span className="font-semibold"> {appVersionLabel}</span>
          </p>
          <p className="mx-auto max-w-xl">
            Acessibilidade-alvo: WCAG 2.2 AA, com processamento local dos dados.
          </p>
          <p>
            <a
              href={`${import.meta.env.BASE_URL || "/"}features`}
              className="text-selection underline-offset-4 hover:underline"
            >
              Sobre
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
