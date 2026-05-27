import { AlertCircle, CheckCircle2, Copy, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./SectionCard";
import { cn } from "@/lib/utils";
import { surfaceClass, textClass } from "../tokens";

interface JsonPreviewValidation {
  tone: "ready" | "warning" | "blocked";
  title: string;
  description: string;
}

interface JsonPreviewProps {
  title: string;
  description: string;
  value: string;
  copied: boolean;
  testId: string;
  onCopy: () => void;
  className?: string;
  validation?: JsonPreviewValidation;
  copyDisabled?: boolean;
  privacyNotice?: string;
}

export function JsonPreview({ title, description, value, copied, testId, onCopy, className, validation, copyDisabled, privacyNotice }: JsonPreviewProps) {
  const ValidationIcon = validation?.tone === "ready" ? CheckCircle2 : AlertCircle;

  return (
    <SectionCard
      className={className}
      title={(
        <span className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-primary" />
          {title}
        </span>
      )}
      description={description}
      action={(
        <Button type="button" variant="outline" size="sm" onClick={onCopy} disabled={copyDisabled}>
          <Copy className="h-4 w-4" />
          {copied ? "Copiado" : "Copiar JSON"}
        </Button>
      )}
      contentClassName="pt-0 sm:pt-0"
    >
      {validation && (
        <div
          className={cn(
            "mb-3 flex items-start gap-3 rounded-lg border p-3 text-sm",
            validation.tone === "ready" && "border-success/30 bg-success/10 text-success",
            validation.tone === "warning" && "border-warning/40 bg-warning/10 text-warning",
            validation.tone === "blocked" && "border-danger/30 bg-danger/10 text-danger"
          )}
        >
          <ValidationIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{validation.title}</p>
            <p className="mt-1 text-xs text-foreground">{validation.description}</p>
          </div>
        </div>
      )}
      <p className="mb-3 rounded-lg border border-selection/30 bg-selection/10 p-3 text-xs leading-5 text-foreground">
        {privacyNotice ?? "Este conteúdo pode conter dados pessoais. Copie apenas para sistemas autorizados e conforme a finalidade informada no Aviso de Privacidade."}
      </p>
      <pre data-testid={testId} className={cn("max-h-[420px] overflow-auto rounded-lg border p-4", surfaceClass.code, textClass.mono)}>
        {value}
      </pre>
    </SectionCard>
  );
}
