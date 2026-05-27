import { Contrast, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const options = [
  { value: "dark", label: "Escuro", Icon: Moon },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "contrast", label: "Alto contraste", Icon: Contrast },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme, switchable } = useTheme();

  if (!switchable || !setTheme) return null;

  return (
    <div className="inline-flex rounded-lg border border-border bg-background/60 p-1" aria-label="Tema visual">
      {options.map(({ value, label, Icon }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "rounded-md text-muted-foreground hover:text-foreground",
            theme === value && "bg-surface-raised text-foreground shadow-sm"
          )}
          aria-label={`Usar tema ${label}`}
          aria-pressed={theme === value}
          title={label}
          onClick={() => setTheme(value)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}
