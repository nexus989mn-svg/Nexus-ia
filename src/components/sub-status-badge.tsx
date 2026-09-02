import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  trial: "bg-warning/15 text-warning border-warning/30",
  active: "bg-success/15 text-success border-success/30",
  expired: "bg-destructive/15 text-destructive border-destructive/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
  canceled: "bg-muted text-muted-foreground border-border",
};

export function SubStatusBadge({ status }: { status: string | null | undefined }) {
  const { t } = useTranslation();
  const key = status ?? "none";
  const cls = styles[key] ?? "bg-muted text-muted-foreground border-border";
  const label = status ? t(`status.${key}`, { defaultValue: status }) : "Sem assinatura";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}>
      {label}
    </span>
  );
}
