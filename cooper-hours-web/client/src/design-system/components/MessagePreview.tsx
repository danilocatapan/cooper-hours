import { AlertCircle, CheckCircle2, Copy, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SectionCard";
import { surfaceClass, textClass } from "../tokens";

interface MessagePreviewValidation {
  tone: "ready" | "warning" | "blocked";
  title: string;
  description: string;
}

interface MessagePreviewProps {
  title: string;
  description: string;
  value: string;
  copied: boolean;
  testId: string;
  onCopy: () => void;
  className?: string;
  validation?: MessagePreviewValidation;
  copyDisabled?: boolean;
  privacyNotice?: string;
  copyLabel?: string;
}

export function MessagePreview({ title, description, value, copied, testId, onCopy, className, validation, copyDisabled, privacyNotice, copyLabel = "Copiar mensagem" }: MessagePreviewProps) {
  const ValidationIcon = validation?.tone === "ready" ? CheckCircle2 : AlertCircle;

  return (
    <SectionCard
      className={className}
      title={(
        <span className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-primary" />
          {title}
        </span>
      )}
      description={description}
      action={(
        <Button type="button" variant="outline" size="sm" onClick={onCopy} disabled={copyDisabled}>
          <Copy className="h-4 w-4" />
          {copied ? "Copiado" : copyLabel}
        </Button>
      )}
      contentClassName="pt-0 sm:pt-0"
    >
      {validation && (
        <div
          className={cn(
            "mb-3 flex items-start gap-3 rounded-lg border p-3 text-sm",
            validation.tone === "ready" && "border-success/30 bg-success/10 text-foreground",
            validation.tone === "warning" && "border-warning/40 bg-warning/10 text-foreground",
            validation.tone === "blocked" && "border-danger/30 bg-danger/10 text-foreground"
          )}
        >
          <ValidationIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{validation.title}</p>
            <p className="mt-1 text-sm leading-6 text-foreground">{validation.description}</p>
          </div>
        </div>
      )}
      <p className="mb-3 rounded-lg border border-selection/30 bg-selection/10 p-3 text-sm leading-6 text-foreground">
        {privacyNotice ?? "Esta mensagem pode conter dados derivados do CSV. Copie apenas para destinos autorizados e de acordo com a finalidade do seu trabalho."}
      </p>
      <pre
        data-testid={testId}
        tabIndex={0}
        aria-label={`${title}: prévia rolável`}
        className={cn("max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border p-4 focus-visible:ring-[3px] focus-visible:ring-ring/45", surfaceClass.code, textClass.mono)}
      >
        {value}
      </pre>
    </SectionCard>
  );
}
