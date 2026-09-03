import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/use-auth";
import { getMySubscription } from "@/lib/billing.functions";
import { getMyWhatsapp } from "@/lib/whatsapp.functions";
import { listCatalog } from "@/lib/catalog.functions";
import { getDashboardStats } from "@/lib/agent.functions";
import { AppShell } from "@/components/app-shell";
import { SubStatusBadge } from "@/components/sub-status-badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  MessageCircle,
  Users,
  TrendingUp,
  Phone,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Package,
  Sparkles,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { getPlanCopy } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Assistente IA de Vendas WhatsApp" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchSub = useServerFn(getMySubscription);
  const fetchWa = useServerFn(getMyWhatsapp);
  const fetchCatalog = useServerFn(listCatalog);
  const fetchStats = useServerFn(getDashboardStats);

  const { data } = useQuery({ queryKey: ["my-sub"], queryFn: () => fetchSub(), enabled: !!user });
  const { data: waData } = useQuery({ queryKey: ["whatsapp"], queryFn: () => fetchWa(), enabled: !!user });
  const { data: catalogData } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchCatalog(),
    enabled: !!user,
  });
  const { data: statsData } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => fetchStats(), enabled: !!user });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const sub = data?.subscription;
  const blocked = data && !data.hasAccess && !data.isAdmin;
  const daysLeft = sub?.current_period_end
    ? Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000))
    : 0;
  const renewDate = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(i18n.language)
    : null;
  const statusLabel = sub?.status ? t(`status.${sub.status}`, { defaultValue: sub.status }) : t("status.unknown");
  const planName = data?.isAdmin ? "Acesso administrativo" : sub?.plan ? getPlanCopy(sub.plan).name : "—";

  const wa = waData?.connection;
  const waConnected = wa?.status === "connected";
  const waPending = wa?.status === "pending";

  const productsCount = catalogData?.products?.length ?? 0;
  const hasCatalog = productsCount > 0;

  const steps = [
    {
      title: data?.isAdmin ? "Acesso administrativo" : "Ative seu plano",
      desc: data?.isAdmin
        ? "Conta administrativa ativa. O acesso não depende de assinatura de cliente."
        : blocked
          ? "Sua assinatura está pausada. Reative para liberar a IA."
          : "Confirme seu plano e ciclo de cobrança.",
      to: data?.isAdmin ? "/admin" : "/billing",
      cta: data?.isAdmin ? "Abrir administração" : blocked ? "Reativar" : "Ver assinatura",
      icon: CreditCard,
      done: data?.isAdmin ? true : !!sub && !blocked,
    },
    {
      title: "Conecte seu WhatsApp",
      desc: waConnected
        ? `Número ${wa?.phone_e164} ativo.`
        : waPending
          ? "Escaneie o QR para finalizar a conexão."
          : "Cadastre o número que receberá as conversas.",
      to: "/whatsapp",
      cta: waConnected ? "Gerenciar" : waPending ? "Finalizar conexão" : "Conectar agora",
      icon: Phone,
      done: waConnected,
    },
    ...(isAdmin
      ? [{
          title: "Cadastre seu catálogo",
          desc: hasCatalog
            ? `${productsCount} produto${productsCount > 1 ? "s" : ""} cadastrado${productsCount > 1 ? "s" : ""}.`
            : "Adicione produtos para a IA responder com preços reais.",
          to: "/catalog",
          cta: hasCatalog ? "Abrir catálogo" : "Cadastrar produtos",
          icon: Package,
          done: hasCatalog,
        }]
      : []),
    {
      title: "Treine sua IA",
      desc: "Aprenda como configurar o comportamento da IA da sua empresa, passo a passo.",
      to: "/training",
      cta: "Treinar IA",
      icon: Sparkles,
      done: (statsData?.enabledAgents ?? 0) > 0,
      disabled: false,
    },
    {
      title: t("landing.websiteTitle"),
      desc: t("landing.websiteDesc"),
      to: "/website",
      cta: t("landing.websiteCta", { defaultValue: "Cadastrar site" }),
      icon: Globe,
      done: false,
      disabled: false,
    },
  ];

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="mb-6 md:mb-8">
        <div className="text-sm text-muted-foreground">{t("dashboard.welcome")}</div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1 break-all">{user?.email}</h1>
      </div>

      {blocked && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3 flex-wrap">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="flex-1 min-w-[200px]">
            <div className="font-semibold">{t("dashboard.subscriptionPaused", { status: statusLabel })}</div>
            <div className="text-sm text-muted-foreground">{sub?.blocked_reason ?? t("dashboard.defaultBlockedReason")}</div>
          </div>
          <Link to="/billing">
            <Button variant="destructive">{t("dashboard.reactivate")}</Button>
          </Link>
        </div>
      )}

      {!waConnected && !blocked && (
        <div className="mb-6 rounded-xl border border-primary/40 bg-primary/10 p-4 flex items-start gap-3 flex-wrap">
          <Phone className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1 min-w-[200px]">
            <div className="font-semibold">
              {waPending ? "Conexão pendente" : "Conecte seu WhatsApp para começar"}
            </div>
            <div className="text-sm text-muted-foreground">
              {waPending
                ? "Escaneie o QR code para finalizar a ativação."
                : "Sem WhatsApp conectado a IA não consegue atender seus clientes."}
            </div>
          </div>
          <Link to="/whatsapp">
            <Button>{waPending ? "Finalizar" : "Conectar agora"}</Button>
          </Link>
        </div>
      )}

      {isAdmin && (
        <div className="mb-6 rounded-xl border border-border bg-card-glass p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">A</span>
            </div>
            <div>
              <div className="font-semibold">{t("dashboard.adminEnabled")}</div>
              <div className="text-xs text-muted-foreground">{t("dashboard.adminEnabledDesc")}</div>
            </div>
          </div>
          <Link to="/admin">
            <Button variant="secondary">{t("dashboard.openAdmin")}</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <Card title={t("dashboard.cards.subscription")} value={<SubStatusBadge status={sub?.status} />} hint={planName} />
        <Card
          title={t("dashboard.cards.daysRemaining")}
          value={String(daysLeft)}
          hint={renewDate ? t("dashboard.renews", { date: renewDate }) : "—"}
        />
        <Card
          title="WhatsApp"
          value={waConnected ? "Conectado" : waPending ? "Pendente" : "Não conectado"}
          hint={wa?.phone_e164 ?? "Clique em WhatsApp"}
          icon={Phone}
        />
        {isAdmin && (
          <Card
            title="Catálogo"
            value={String(productsCount)}
            hint={hasCatalog ? "produtos" : "Sem produtos"}
            icon={Package}
          />
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card-glass p-5 md:p-6">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t("dashboard.nextSteps")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.nextStepsDescription")}
        </p>
        <ol className="mt-4 space-y-3">
          {steps.map((step, idx) => (
            <li
              key={step.title}
              className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-4"
            >
              <div
                className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step.done
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">
                  <step.icon className="h-4 w-4 text-muted-foreground" />
                  {step.title}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">{step.desc}</div>
              </div>
              {step.disabled ? (
                <Button variant="ghost" size="sm" disabled>
                  {step.cta}
                </Button>
              ) : (
                <Link to={step.to}>
                  <Button variant={step.done ? "outline" : "default"} size="sm">
                    {step.cta} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-6">
        <Card title={t("dashboard.cards.conversations")} value={String(statsData?.conversations ?? 0)} hint="Conversas da empresa" icon={MessageCircle} />
        <Card title={t("dashboard.cards.leads")} value={String(statsData?.briefings ?? 0)} hint="Briefings / leads registrados" icon={Users} />
        <Card title="MRR estimado" value={`$${(statsData?.revenueUsd ?? 0).toFixed(2)}`} hint="Baseado no plano ativo" icon={TrendingUp} />
      </div>
    </AppShell>
  );
}

function Card({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  hint?: string;
  icon?: typeof MessageCircle;
}) {
  return (
    <div className="rounded-xl border border-border bg-card-glass p-4 md:p-5">
      <div className="flex items-center justify-between text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
        <span className="truncate">{title}</span>
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
      </div>
      <div className="mt-2 text-xl md:text-2xl font-bold">{value}</div>
      {hint && <div className="text-[11px] md:text-xs text-muted-foreground mt-1 truncate">{hint}</div>}

</div>
  );
}
