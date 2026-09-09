import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Check, MessageCircle, Sparkles, Zap, Bot, Shield, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { listPlans } from "@/lib/billing.functions";
import { getPlanCopy } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Assistente IA de Vendas WhatsApp — Automatize vendas com IA" },
      { name: "description", content: "Conecte o WhatsApp, ative agentes de IA e converta leads 24/7." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  const fetchPlans = useServerFn(listPlans);
  const { data } = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });

  const features = [
    { icon: Bot, k: "aiAgent" },
    { icon: Zap, k: "leadCapture" },
    { icon: BarChart3, k: "analytics" },
    { icon: Shield, k: "autoBlock" },
    { icon: MessageCircle, k: "multi" },
    { icon: Sparkles, k: "sdr" },
  ] as const;

  return (
    <div className="min-h-screen bg-hero">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <MessageCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">{t("nav.brand")}</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <ThemeCustomizer />
            <LanguageSwitcher />
            <Link to="/login"><Button variant="ghost" size="sm">{t("common.signIn")}</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-gradient-primary shadow-glow">{t("common.getStarted")}</Button></Link>
          </nav>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 pt-16 md:pt-20 pb-16 md:pb-24 text-center overflow-hidden">
        <h1 className="whitespace-nowrap text-[clamp(14px,4.15vw,60px)] md:text-6xl font-bold tracking-tight leading-tight">
          <span className="text-white">{t("landing.heroPre")}</span>{" "}
          <span className="text-primary">{t("landing.heroAccent")}</span>
        </h1>
        <p className="mt-4 text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("landing.heroDesc")}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link to="/signup"><Button size="lg" className="bg-gradient-primary shadow-glow">{t("landing.startTrial")}</Button></Link>
          <a href="#pricing"><Button size="lg" variant="outline">{t("landing.viewPricing")}</Button></a>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16 md:pb-24 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <div key={f.k} className="bg-card-glass border border-border rounded-2xl p-6 shadow-elegant">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{t(`landing.features.${f.k}.t`)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t(`landing.features.${f.k}.d`)}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-4 pb-16 md:pb-24">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">{t("landing.pricingTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("landing.pricingDesc")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.plans ?? []).map((plan) => {
            const copy = getPlanCopy(plan);
            const featured = plan.code === "monthly";
            const perLabel =
              plan.interval === "yearly" ? t("landing.perYear")
              : plan.interval === "monthly" ? t("landing.perMonth")
              : t("landing.perTrial");
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 border ${featured ? "border-primary shadow-glow bg-gradient-card" : "border-border bg-card-glass"}`}
              >
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{copy.interval}</div>
                <h3 className="mt-2 text-2xl font-bold">{copy.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${(plan.price_usd_cents / 100).toFixed(0)}</span>
                  <span className="text-muted-foreground"> {perLabel}</span>
                </div>
                {plan.interval === "trial" && (
                  <p className="mt-4 text-sm text-muted-foreground">7 dias de teste</p>
                )}
                <Link to="/signup" className="block mt-6">
                  <Button className={`w-full ${featured ? "bg-gradient-primary shadow-glow" : ""}`} variant={featured ? "default" : "outline"}>
                    {plan.interval === "trial" ? t("landing.startPlanTrial") : t("landing.subscribe")}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {t("landing.footer")}
      </footer>
    </div>
  );
}
