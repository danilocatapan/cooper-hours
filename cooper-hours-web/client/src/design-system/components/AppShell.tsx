import type { ReactNode } from "react";
import { textClass } from "../tokens";

interface AppShellProps {
  logoSrc: string;
  children: ReactNode;
}

export function AppShell({ logoSrc, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-lg">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Coopersystem" className="h-12" />
            <div>
              <h1 className={textClass.pageTitle}>Validação diária de 8h</h1>
              <p className="text-sm text-muted-foreground">BusinessMap → Coopersystem</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">{children}</main>

      <footer className="mt-12 border-t border-border bg-card">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          <p>Validação diária de 8h BusinessMap → Coopersystem v1.0</p>
        </div>
      </footer>
    </div>
  );
}
