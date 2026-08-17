import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/use-auth";
import { getMySubscription, createCheckout, listPlans, cancelSubscription } from "@/lib/billing.functions";
import { getBillingHistory } from "@/lib/company.functions";
import { AppShell } from "@/components/app-shell";
import { SubStatusBadge } from "@/components/sub-status-badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPlanCopy } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Assinatura — Assistente IA de Vendas WhatsApp" }] }),
  component: BillingPage,
});

function BillingPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchSub = useServerFn(getMySubscription);
  const fetchPlans = useServerFn(listPlans);
  const checkout = useServerFn(createCheckout);
  const cancel = useServerFn(cancelSubscription);
  const fetchHistory = useServerFn(getBillingHistory);

  const { data: subData } = useQuery({ queryKey: ["my-sub"], queryFn: () => fetchSub(), enabled: !!user });
  const { data: plansData } = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });
  const { data: historyData } = useQuery({ queryKey: ["billing-history"], queryFn: () => fetchHistory(), enabled: !!user });

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const subscribe = async (code: "trial" | "monthly" | "yearly") => {
    try {
      const res = await checkout({ data: { planCode: code } });
      toast.success(res.mock ? t("billing.activatedMock") : t("billing.redirecting"));
      if (res.url.startsWith("http")) window.location.href = res.url;
      else qc.invalidateQueries({ queryKey: ["my-sub"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleCancel = async () => {
    if (!confirm(t("billing.confirmCancel"))) return;
    await cancel();
    toast.success(t("billing.canceled"));
    qc.invalidateQueries({ queryKey: ["my-sub"] });
  };

  const sub = subData?.subscription;
  const currentPlan = sub?.plan ? getPlanCopy(sub.plan).name : "—";

  return (
    <AppShell isAdmin={isAdmin}>
      <h1 className="text-2xl md:text-3xl font-bold">{t("billing.title")}</h1>
      <p className="text-muted-foreground mt-1">{t("billing.subtitle")}</p>

      {subData?.isAdmin && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 text-primary p-4">
          <strong>Acesso administrativo ativo.</strong> Esta conta administra a plataforma e não precisa de uma assinatura de cliente.
        </div>
      )}

      {subData?.mockMode && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 text-warning-foreground p-3 text-sm">
          <strong>{t("billing.mockTitle")}</strong> {t("billing.mockDesc")}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card-glass p-5 md:p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("billing.currentPlan")}</div>
            <div className="mt-1 text-xl font-semibold">{currentPlan}</div>
            <div className="mt-2"><SubStatusBadge status={sub?.status} /></div>
            {sub?.current_period_end && (
              <div className="text-xs text-muted-foreground mt-2">
                {t("billing.renewsAt", { date: new Date(sub.current_period_end).toLocaleString(i18n.language) })}
              </div>
            )}
          </div>
          {!subData?.isAdmin && sub && sub.status !== "canceled" && (
            <Button variant="outline" onClick={handleCancel}>{t("billing.cancelSub")}</Button>
          )}
        </div>
      </div>

      {!subData?.isAdmin && (
      <>
      <h2 className="mt-10 mb-4 text-xl font-semibold">{t("billing.availablePlans")}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(plansData?.plans ?? []).filter((p) => p.code !== "trial" || subData?.trialAvailable).map((p) => {
          const copy = getPlanCopy(p);
          return (
          <div key={p.id} className="rounded-2xl border border-border bg-card-glass p-5 md:p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{copy.interval}</div>
            <h3 className="mt-1 text-lg font-semibold">{copy.name}</h3>
            <div className="mt-3">
              <span className="text-3xl font-bold">${(p.price_usd_cents / 100).toFixed(0)}</span>
              <span className="text-muted-foreground text-sm"> /{copy.interval}</span>
            </div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {copy.features.map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-success mt-0.5 shrink-0" />{f}</li>
              ))}
            </ul>
            <Button onClick={() => subscribe(p.code as "trial" | "monthly" | "yearly")} className="w-full mt-5 bg-gradient-primary shadow-glow">
              {sub?.plan?.id === p.id ? t("billing.renew") : t("billing.choosePlan")}
            </Button>
          </div>
        )})}
      </div>
      </>
      )}

      <h2 className="mt-10 mb-4 text-xl font-semibold">Histórico de cobrança</h2>
      <div className="rounded-2xl border border-border bg-card-glass p-5 md:p-6">
        {(historyData?.events?.length ?? 0) === 0 && (historyData?.logs?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="divide-y divide-border text-sm max-h-96 overflow-auto">
            {(historyData?.events ?? []).map((e) => (
              <div key={`ev-${e.id}`} className="py-2 flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-40 shrink-0">
                  {new Date(e.processed_at).toLocaleString(i18n.language)}
                </span>
                <span className="text-xs uppercase tracking-widest text-primary w-20 shrink-0">{e.provider}</span>
                <span className="flex-1 truncate">{e.event_type}</span>
              </div>
            ))}
            {(historyData?.logs ?? []).map((l) => (
              <div key={`log-${l.id}`} className="py-2 flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-40 shrink-0">
                  {new Date(l.created_at).toLocaleString(i18n.language)}
                </span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground w-20 shrink-0">{l.severity}</span>
                <span className="flex-1 truncate">{l.event}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

