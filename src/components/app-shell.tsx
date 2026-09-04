import { Link, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, CreditCard, Shield, LogOut, MessageCircle, Sparkles, Menu, X, Phone, User as UserIcon, Building2, LifeBuoy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { supportNavLabel } from "@/lib/support-i18n";
import { cn } from "@/lib/utils";

type NavKey = "dashboard" | "agent" | "training" | "whatsapp" | "billing" | "catalog" | "company" | "profile" | "admin" | "support";
type Item = { to: string; key: NavKey; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };

const items: Item[] = [
  { to: "/dashboard", key: "dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/agent", key: "agent", label: "Central interna", icon: Sparkles, adminOnly: true },
  { to: "/training", key: "training", label: "Treine sua IA", icon: Sparkles },
  { to: "/whatsapp", key: "whatsapp", label: "WhatsApp", icon: Phone },
  { to: "/company", key: "company", label: "Empresa", icon: Building2 },
  { to: "/profile", key: "profile", label: "Perfil", icon: UserIcon },
  { to: "/support", key: "support", label: "Suporte", icon: LifeBuoy },
  { to: "/billing", key: "billing", label: "Assinatura", icon: CreditCard },
  { to: "/admin", key: "admin", label: "Administração", icon: Shield, adminOnly: true },
];

export function AppShell({ children, isAdmin = false }: { children: ReactNode; isAdmin?: boolean }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const visible = items.filter((i) => !i.adminOnly || isAdmin);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  const labelFor = (item: Item) =>
    item.key === "support"
      ? supportNavLabel(i18n.language)
      : t(`nav.${item.key}`, { defaultValue: item.label });

  return (
    <div className="min-h-screen bg-background flex">
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b border-border bg-sidebar/95 backdrop-blur">
        <Link to="/dashboard" className="flex items-center gap-2 font-display font-bold">
          <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span>{t("nav.brand")}</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeCustomizer compact />
          <LanguageSwitcher compact />
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-2 -mr-2 text-muted-foreground"
            aria-label={t("nav.menu")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-30 h-screen w-72 lg:w-64 bg-sidebar border-r border-sidebar-border flex-col transition-transform",
          "lg:flex lg:translate-x-0",
          open ? "flex translate-x-0" : "hidden lg:flex -translate-x-full lg:translate-x-0",
        )}
      >
        <div className="hidden lg:flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <MessageCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="font-display font-bold leading-tight">
            <div className="text-sm">{t("nav.brand")}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
              {t("nav.tagline")}
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 mt-14 lg:mt-0">
          {visible.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="flex items-center gap-3 rounded-lg px-3 py-3 lg:py-2.5 text-sm text-sidebar-foreground hover:bg-accent/60 transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {labelFor(item)}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border flex items-center justify-between gap-2">
          <Button variant="ghost" className="justify-start flex-1" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {t("nav.signOut")}
          </Button>
          <div className="hidden lg:block">
            <ThemeCustomizer compact />
            <LanguageSwitcher compact />
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-background/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
