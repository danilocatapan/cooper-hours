import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";
import { LGPD_NOTICE } from "@/features/privacy/lgpd";

const isDev = import.meta.env.DEV;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="flex w-full max-w-2xl flex-col items-center p-8">
            <AlertTriangle
              size={48}
              className="mb-6 flex-shrink-0 text-destructive"
            />

            <h2 className="mb-4 text-xl">Ocorreu um erro inesperado.</h2>

            <div className="mb-6 w-full overflow-auto rounded bg-muted p-4">
              <pre className="whitespace-break-spaces text-sm text-muted-foreground">
                {isDev
                  ? this.state.error?.stack
                  : `Erro inesperado. Recarregue a página ou contate ${LGPD_NOTICE.contactChannel}.`}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2",
                "bg-primary text-primary-foreground",
                "cursor-pointer hover:opacity-90"
              )}
            >
              <RotateCcw size={16} />
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
