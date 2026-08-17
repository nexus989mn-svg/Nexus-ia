import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const langs = [
  { code: "pt-BR", label: "Português (BR)" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const current = langs.find((l) => i18n.language?.startsWith(l.code)) ?? langs[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className="gap-2">
          <Languages className="h-4 w-4" />
          {!compact && <span className="text-xs">{current.code.toUpperCase()}</span>}
          <span className="sr-only">{t("common.language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {langs.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => {
              i18n.changeLanguage("pt-BR");
              try { localStorage.setItem("lang", "pt-BR"); } catch {}
            }}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
