import { Copy, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./SectionCard";
import { cn } from "@/lib/utils";
import { surfaceClass, textClass } from "../tokens";

interface JsonPreviewProps {
  title: string;
  description: string;
  value: string;
  copied: boolean;
  testId: string;
  onCopy: () => void;
  className?: string;
}

export function JsonPreview({ title, description, value, copied, testId, onCopy, className }: JsonPreviewProps) {
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
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          {copied ? "Copiado" : "Copiar JSON"}
        </Button>
      )}
      contentClassName="pt-0 sm:pt-0"
    >
      <pre data-testid={testId} className={cn("max-h-[420px] overflow-auto rounded-lg border p-4", surfaceClass.code, textClass.mono)}>
        {value}
      </pre>
    </SectionCard>
  );
}
