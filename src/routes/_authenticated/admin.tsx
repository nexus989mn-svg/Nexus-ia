import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListCustomers,
  adminListLogs,
  adminSetSubscriptionStatus,
  adminExpireOverdue,
  adminExecutiveStats,
  adminListPlans,
  adminUpdatePlan,
  adminListBillingEvents,
  adminListCompanies,
} from "@/lib/admin.functions";
import {
  adminListIntegrations,
  adminSaveIntegration,
  adminTestIntegration,
  adminListAIModules,
  adminSaveAIModule,
  adminListBriefings,
  adminSaveBriefing,
  adminDeleteBriefing,
  adminGetSettings,
  adminSaveSetting,
  adminQueueStats,
} from "@/lib/admin-config.functions";
import { AppShell } from "@/components/app-shell";
import { SubStatusBadge } from "@/components/sub-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Shield, RefreshCw, Users, FileText, DollarSign, Bot, ListOrdered,
  ScrollText, Plug, Settings as SettingsIcon, Lock, TrendingUp, Search,
  CheckCircle2, XCircle, Plus, Trash2, Pencil, Loader2, Building2,
} from "lucide-react";
import { getPlanCopy } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel administrativo — TW Design Studio" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();
    const ownerEmail = session.user.email?.trim().toLowerCase() === "nexus989mn@gmail.com";
    if (!data && !ownerEmail) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

function AdminPage() {
  return (
    <AppShell isAdmin>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
          <Shield className="h-4 w-4" /> Painel administrativo · TW Design Studio
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">Centro operacional</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Painel de controle completo — restrito a <span className="text-foreground">nexus989mn@gmail.com</span>.
        </p>
      </header>

      <Tabs defaultValue="executive" className="w-full">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-card-glass p-1">
          <TabsTrigger value="executive"><TrendingUp className="h-3.5 w-3.5 mr-1" />Executivo</TabsTrigger>
          <TabsTrigger value="customers"><Users className="h-3.5 w-3.5 mr-1" />Clientes</TabsTrigger>
          <TabsTrigger value="companies"><Building2 className="h-3.5 w-3.5 mr-1" />Empresas</TabsTrigger>
          <TabsTrigger value="briefings"><FileText className="h-3.5 w-3.5 mr-1" />Briefings</TabsTrigger>
          <TabsTrigger value="finance"><DollarSign className="h-3.5 w-3.5 mr-1" />Financeiro</TabsTrigger>
          <TabsTrigger value="ai"><Bot className="h-3.5 w-3.5 mr-1" />Módulos de IA</TabsTrigger>
          <TabsTrigger value="queues"><ListOrdered className="h-3.5 w-3.5 mr-1" />Filas</TabsTrigger>
          <TabsTrigger value="logs"><ScrollText className="h-3.5 w-3.5 mr-1" />Logs</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="h-3.5 w-3.5 mr-1" />Integrações</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="h-3.5 w-3.5 mr-1" />Configurações</TabsTrigger>
          <TabsTrigger value="security"><Lock className="h-3.5 w-3.5 mr-1" />Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="mt-6"><ExecutivePanel /></TabsContent>
        <TabsContent value="customers" className="mt-6"><CustomersPanel /></TabsContent>
        <TabsContent value="companies" className="mt-6"><CompaniesPanel /></TabsContent>
        <TabsContent value="briefings" className="mt-6"><BriefingsPanel /></TabsContent>
        <TabsContent value="finance" className="mt-6"><FinancePanel /></TabsContent>
        <TabsContent value="ai" className="mt-6"><AIPanel /></TabsContent>
        <TabsContent value="queues" className="mt-6"><QueuesPanel /></TabsContent>
        <TabsContent value="logs" className="mt-6"><LogsPanel /></TabsContent>
        <TabsContent value="integrations" className="mt-6"><IntegrationsPanel /></TabsContent>
        <TabsContent value="settings" className="mt-6"><SettingsPanel /></TabsContent>
        <TabsContent value="security" className="mt-6"><SecurityPanel /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ---------- shared atoms ---------- */
function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card-glass p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card-glass p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ---------- EXECUTIVE ---------- */
function ExecutivePanel() {
  const fetchStats = useServerFn(adminExecutiveStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });
  const max = Math.max(1, ...(data?.signupSeries ?? []).map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total de clientes" value={isLoading ? "…" : data?.customers ?? 0} />
        <Stat label="Assinaturas ativas" value={data?.activeSubs ?? 0} hint="Pagantes" />
        <Stat label="Teste" value={data?.trialSubs ?? 0} hint="Em teste de 7 dias" />
        <Stat label="Bloqueadas / expiradas" value={data?.blockedSubs ?? 0} />
        <Stat label="MRR" value={`$${(data?.mrrUsd ?? 0).toFixed(2)}`} hint="Receita recorrente mensal" />
        <Stat label="ARR" value={`$${(data?.arrUsd ?? 0).toFixed(2)}`} hint="Receita recorrente anual" />
        <Stat label="Canceladas" value={data?.canceledSubs ?? 0} />
        <Stat label="Sistema" value={<span className="text-emerald-400">Operacional</span>} hint="Serviços saudáveis" />
      </div>

      <Section title="Cadastros — últimos 14 dias">
        <div className="flex items-end gap-1 h-32">
          {(data?.signupSeries ?? []).map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-gradient-primary rounded-t"
                style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }}
                title={`${d.date}: ${d.count}`}
              />
              <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ---------- CUSTOMERS ---------- */
function CustomersPanel() {
  const qc = useQueryClient();
  const fetchCustomers = useServerFn(adminListCustomers);
  const setStatus = useServerFn(adminSetSubscriptionStatus);
  const expire = useServerFn(adminExpireOverdue);
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["admin-customers"], queryFn: () => fetchCustomers() });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return data?.customers ?? [];
    return (data?.customers ?? []).filter(
      (c) =>
        c.email?.toLowerCase().includes(t) ||
        c.full_name?.toLowerCase().includes(t) ||
        c.company?.toLowerCase().includes(t),
    );
  }, [q, data]);

  const change = async (userId: string, status: "active" | "blocked" | "expired") => {
    await setStatus({ data: { targetUserId: userId, status } });
    toast.success(`Status atualizado para ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-customers"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };
  const runExpire = async () => {
    const res = await expire();
    toast.success(`${res.expired} assinatura(s) vencida(s) expirada(s)`);
    qc.invalidateQueries();
  };

  return (
    <Section
      title={`Central de Clientes (${filtered.length})`}
      action={
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar e-mail, nome, empresa"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-7 h-9 w-56"
            />
          </div>
          <Button onClick={runExpire} variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Verificar vencidas
          </Button>
        </div>
      }
    >
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left p-2">Cliente</th>
              <th className="text-left p-2">Plano</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Expira em</th>
              <th className="text-right p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const s = c.subscription as { status?: string; current_period_end?: string | null; plan?: { name?: string } | null } | null;
              return (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="p-2">
                    <div className="font-medium">{c.email}</div>
                    <div className="text-xs text-muted-foreground">{c.full_name ?? "—"}{c.company ? ` · ${c.company}` : ""}</div>
                  </td>
                  <td className="p-2">{s?.plan ? getPlanCopy(s.plan).name : "—"}</td>
                  <td className="p-2"><SubStatusBadge status={s?.status as any} /></td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {s?.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-2 text-right space-x-2 whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => change(c.user_id, "active")}>Ativar</Button>
                    <Button size="sm" variant="outline" onClick={() => change(c.user_id, "blocked")}>Bloquear</Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">Nenhum cliente.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ---------- COMPANIES ---------- */
function CompaniesPanel() {
  const fetchCompanies = useServerFn(adminListCompanies);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["admin-companies"], queryFn: () => fetchCompanies() });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const rows = data?.companies ?? [];
    if (!t) return rows;
    return rows.filter((c: any) =>
      [c.name, c.document, c.email, c.phone, c.owner?.email, c.owner?.full_name]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(t)),
    );
  }, [q, data]);

  return (
    <Section
      title={`Empresas cadastradas (${filtered.length})`}
      action={
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, CNPJ, e-mail…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-7 h-9 w-64"
          />
        </div>
      }
    >
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left p-2">Empresa</th>
              <th className="text-left p-2">Dono</th>
              <th className="text-left p-2">Plano</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Criada em</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any) => (
              <tr key={c.id} className="border-b border-border/50">
                <td className="p-2">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[c.document, c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                  </div>
                </td>
                <td className="p-2">
                  <div>{c.owner?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{c.owner?.email ?? "—"}</div>
                </td>
                <td className="p-2">{c.subscription?.plan ? getPlanCopy(c.subscription.plan).name : "—"}</td>
                <td className="p-2"><SubStatusBadge status={c.subscription?.status as any} /></td>
                <td className="p-2 text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">Nenhuma empresa.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ---------- BRIEFINGS ---------- */
function BriefingsPanel() {
  const qc = useQueryClient();
  const fetchBriefings = useServerFn(adminListBriefings);
  const saveBrief = useServerFn(adminSaveBriefing);
  const delBrief = useServerFn(adminDeleteBriefing);
  const { data } = useQuery({ queryKey: ["admin-briefings"], queryFn: () => fetchBriefings() });
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, in_progress: 0, approved: 0, completed: 0 };
    for (const b of data?.briefings ?? []) c[b.status] = (c[b.status] ?? 0) + 1;
    return c;
  }, [data]);

  const openNew = () => { setEditing({ customer_name: "", contact: "", channel: "whatsapp", status: "pending", summary: "" }); setOpen(true); };
  const openEdit = (b: any) => { setEditing({ ...b }); setOpen(true); };
  const onSave = async () => {
    try {
      await saveBrief({ data: editing });
      toast.success("Briefing salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-briefings"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro ao salvar"); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Excluir briefing?")) return;
    await delBrief({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-briefings"] });
  };

  const labels: Record<string, string> = { pending: "Pendentes", in_progress: "Em andamento", approved: "Aprovados", completed: "Finalizados" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(labels).map(([k, v]) => <Stat key={k} label={v} value={counts[k] ?? 0} />)}
      </div>
      <Section title={`Central de briefings (${data?.briefings.length ?? 0})`} action={
        <Button size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5 mr-1" />Novo briefing</Button>
      }>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left p-2">Cliente</th>
                <th className="text-left p-2">Canal</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Criado</th>
                <th className="text-right p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(data?.briefings ?? []).map((b) => (
                <tr key={b.id} className="border-b border-border/50">
                  <td className="p-2">
                    <div className="font-medium">{b.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{b.contact ?? "—"}</div>
                  </td>
                  <td className="p-2 text-xs">{b.channel}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{labels[b.status] ?? b.status}</Badge></td>
                  <td className="p-2 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {(data?.briefings ?? []).length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">Nenhum briefing ainda. Crie o primeiro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar briefing" : "Novo briefing"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Cliente</Label><Input value={editing.customer_name} onChange={(e) => setEditing({ ...editing, customer_name: e.target.value })} /></div>
              <div><Label>Contato</Label><Input value={editing.contact ?? ""} onChange={(e) => setEditing({ ...editing, contact: e.target.value })} placeholder="WhatsApp, e-mail…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Canal</Label>
                  <Select value={editing.channel} onValueChange={(v) => setEditing({ ...editing, channel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="site">Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="completed">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Resumo</Label><Textarea rows={4} value={editing.summary ?? ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={onSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- FINANCE ---------- */
function FinancePanel() {
  const fetchStats = useServerFn(adminExecutiveStats);
  const fetchPlans = useServerFn(adminListPlans);
  const updatePlan = useServerFn(adminUpdatePlan);
  const fetchEvents = useServerFn(adminListBillingEvents);
  const qc = useQueryClient();
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });
  const { data: plansData } = useQuery({ queryKey: ["admin-plans"], queryFn: () => fetchPlans() });
  const { data: events } = useQuery({ queryKey: ["admin-events"], queryFn: () => fetchEvents() });

  const savePrice = async (id: string, dollars: string) => {
    const cents = Math.round(parseFloat(dollars) * 100);
    if (!Number.isFinite(cents) || cents < 0) return toast.error("Preço inválido");
    await updatePlan({ data: { id, price_usd_cents: cents } });
    toast.success("Plano atualizado");
    qc.invalidateQueries({ queryKey: ["admin-plans"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };
  const toggleActive = async (id: string, is_active: boolean) => {
    await updatePlan({ data: { id, is_active } });
    qc.invalidateQueries({ queryKey: ["admin-plans"] });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="MRR" value={`$${(stats?.mrrUsd ?? 0).toFixed(2)}`} />
        <Stat label="ARR" value={`$${(stats?.arrUsd ?? 0).toFixed(2)}`} />
        <Stat label="Assinaturas ativas" value={stats?.activeSubs ?? 0} />
        <Stat label="Canceladas" value={stats?.canceledSubs ?? 0} />
      </div>

      <Section title="Planos e preços">
        <div className="space-y-2">
          {(plansData?.plans ?? []).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 border border-border rounded-lg">
              <div className="flex-1 min-w-[140px]">
                <div className="font-medium">{getPlanCopy(p).name}</div>
                <div className="text-xs text-muted-foreground">{p.code} · {getPlanCopy(p).interval}</div>
              </div>
              <Input
                type="number"
                step="0.01"
                defaultValue={(p.price_usd_cents / 100).toFixed(2)}
                onBlur={(e) => savePrice(p.id, e.target.value)}
                className="w-28"
              />
              <Button size="sm" variant={p.is_active ? "default" : "outline"} onClick={() => toggleActive(p.id, !p.is_active)}>
                {p.is_active ? "Ativo" : "Desativado"}
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Eventos de cobrança (webhooks Stripe)">
        <div className="text-sm divide-y divide-border max-h-72 overflow-auto">
          {(events?.events ?? []).map((e) => (
            <div key={e.id} className="py-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-40 shrink-0">
                {new Date(e.processed_at).toLocaleString()}
              </span>
              <span className="text-xs uppercase tracking-widest text-primary w-20 shrink-0">{e.provider}</span>
              <span className="flex-1 truncate">{e.event_type}</span>
            </div>
          ))}
          {(events?.events ?? []).length === 0 && (
            <div className="py-6 text-center text-muted-foreground text-sm">
              Nenhum evento ainda (Stripe está em modo simulado).
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

/* ---------- AI MODULES ---------- */
const AI_MODELS = ["nexus-auto"];

function AIPanel() {
  const qc = useQueryClient();
  const fetchMods = useServerFn(adminListAIModules);
  const saveMod = useServerFn(adminSaveAIModule);
  const { data } = useQuery({ queryKey: ["admin-ai-modules"], queryFn: () => fetchMods() });
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data?.modules) {
      const map: Record<string, any> = {};
      for (const m of data.modules) map[m.id] = { ...m };
      setDrafts(map);
    }
  }, [data]);

  const onChange = (id: string, patch: any) => setDrafts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  const onSave = async (id: string) => {
    const d = drafts[id];
    try {
      await saveMod({ data: {
        id, is_enabled: d.is_enabled, model: d.model,
        system_prompt: d.system_prompt ?? "", temperature: Number(d.temperature),
        max_tokens: Number(d.max_tokens),
      }});
      toast.success("Módulo salvo");
      qc.invalidateQueries({ queryKey: ["admin-ai-modules"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {(data?.modules ?? []).map((m) => {
        const d = drafts[m.id] ?? m;
        return (
          <div key={m.id} className="rounded-2xl border border-border bg-card-glass p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={d.is_enabled ? "text-emerald-400 border-emerald-400/40" : "text-muted-foreground"}>
                  {d.is_enabled ? "ativo" : "inativo"}
                </Badge>
                <Switch checked={!!d.is_enabled} onCheckedChange={(v) => onChange(m.id, { is_enabled: v })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-border p-2">
                <div className="text-muted-foreground">Última execução</div>
                <div>{m.last_run_at ? new Date(m.last_run_at).toLocaleString() : "—"}</div>
              </div>
              <div className="rounded border border-border p-2">
                <div className="text-muted-foreground">Execuções</div>
                <div>{m.execution_count}</div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Modelo (Nexus IA)</Label>
              <Select value={d.model} onValueChange={(v) => onChange(m.id, { model: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((mm) => <SelectItem key={mm} value={mm}>{mm}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prompt do sistema</Label>
              <Textarea rows={4} value={d.system_prompt ?? ""} onChange={(e) => onChange(m.id, { system_prompt: e.target.value })} placeholder="Prompt específico do agente…" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Temperatura ({d.temperature})</Label>
                <Input type="number" step="0.1" min="0" max="2" value={d.temperature} onChange={(e) => onChange(m.id, { temperature: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Máx. tokens</Label>
                <Input type="number" min="64" max="32000" value={d.max_tokens} onChange={(e) => onChange(m.id, { max_tokens: e.target.value })} />
              </div>
            </div>
            <Button size="sm" onClick={() => onSave(m.id)} className="w-full">Salvar configuração</Button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- QUEUES ---------- */
function QueuesPanel() {
  const fetchStats = useServerFn(adminQueueStats);
  const { data, refetch, isFetching } = useQuery({ queryKey: ["admin-queue-stats"], queryFn: () => fetchStats() });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Briefings pendentes" value={data?.pending ?? 0} />
        <Stat label="Em andamento" value={data?.in_progress ?? 0} />
        <Stat label="Aprovados" value={data?.approved ?? 0} />
        <Stat label="Finalizados" value={data?.completed ?? 0} />
        <Stat label="WhatsApp conectados" value={data?.whatsapp_connected ?? 0} hint={`de ${data?.whatsapp_total ?? 0} usuários`} />
      </div>
      <Section title="Controle de fila" action={
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
          Atualizar
        </Button>
      }>
        <p className="text-sm text-muted-foreground">
          Estatísticas em tempo real da fila de atendimento, baseadas nos briefings e conexões WhatsApp ativas.
          Use a aba <strong>Briefings</strong> para gerenciar individualmente.
        </p>
      </Section>
    </div>
  );
}

/* ---------- LOGS ---------- */
function LogsPanel() {
  const fetchLogs = useServerFn(adminListLogs);
  const { data } = useQuery({ queryKey: ["admin-logs"], queryFn: () => fetchLogs() });
  const [q, setQ] = useState("");
  const [src, setSrc] = useState<string>("all");

  const filtered = useMemo(() => {
    return (data?.logs ?? []).filter((l) => {
      if (src !== "all" && l.source !== src) return false;
      if (q && !`${l.event} ${l.source}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, src]);

  const sources = ["all", "ai_admin", "admin", "stripe", "system"];

  return (
    <Section
      title="Central de Logs"
      action={
        <div className="flex gap-2 flex-wrap">
          {sources.map((s) => (
            <Button key={s} size="sm" variant={src === s ? "default" : "outline"} onClick={() => setSrc(s)}>
              {s}
            </Button>
          ))}
          <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-40" />
        </div>
      }
    >
      <div className="divide-y divide-border max-h-[500px] overflow-auto">
        {filtered.map((l) => (
          <div key={l.id} className="p-3 text-sm flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-40 shrink-0">{new Date(l.created_at).toLocaleString()}</span>
            <span className="text-xs uppercase tracking-widest text-primary w-20 shrink-0">{l.source}</span>
            <span className="flex-1 truncate">{l.event}</span>
            <Badge variant="outline" className="text-[10px]">{l.severity}</Badge>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-muted-foreground text-sm">Nenhum log encontrado.</div>
        )}
      </div>
    </Section>
  );
}

/* ---------- INTEGRATIONS ---------- */
function IntegrationsPanel() {
  const qc = useQueryClient();
  const fetchInts = useServerFn(adminListIntegrations);
  const saveInt = useServerFn(adminSaveIntegration);
  const testInt = useServerFn(adminTestIntegration);
  const { data, error, isLoading } = useQuery({ queryKey: ["admin-integrations"], queryFn: () => fetchInts() });
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (data?.integrations) {
      const map: Record<string, any> = {};
      for (const i of data.integrations) map[i.provider] = { ...i };
      setDrafts(map);
    }
  }, [data]);

  const onChange = (p: string, patch: any) => setDrafts((s) => ({ ...s, [p]: { ...s[p], ...patch } }));

  const onSave = async (provider: string) => {
    const d = drafts[provider];
    try {
      await saveInt({ data: {
        provider, label: d.label, api_key: d.api_key || null,
        base_url: d.base_url || null, is_enabled: !!d.is_enabled, config: d.config ?? {},
      }});
      toast.success("Integração salva");
      qc.invalidateQueries({ queryKey: ["admin-integrations"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  const onTest = async (provider: string) => {
    setTesting(provider);
    try {
      const res = await testInt({ data: { provider } });
      if (res.ok) toast.success(res.message); else toast.error(res.message);
      qc.invalidateQueries({ queryKey: ["admin-integrations"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setTesting(null); }
  };

  const helpText: Record<string, string> = {
    stripe: "Chave secreta (sk_live_… ou sk_test_…). Obtenha em dashboard.stripe.com → Developers → API keys.",
    whatsapp: "URL base do seu UAZAPI/Evolution (ex.: https://api.seudominio.com) e token de instância.",
    n8n: "URL base do n8n (ex.: https://n8n.seudominio.com) e API key.",
    openrouter: "Chave OpenRouter (sk-or-…). Obtenha em openrouter.ai/keys.",
    openai: "Chave OpenAI (sk-…). Obtenha em platform.openai.com/api-keys.",
    nexus: "API Key do Nexus IA e URL compatível com OpenAI.",
  };

  const fallbackIntegrations = [
    { provider: "stripe", label: "Stripe (pagamentos)", base_url: null, config: {}, is_enabled: false, last_test_status: null, last_test_message: null, api_key_configured: false },
    { provider: "whatsapp", label: "WhatsApp (UAZAPI / Evolution)", base_url: null, config: {}, is_enabled: false, last_test_status: null, last_test_message: null, api_key_configured: false },
    { provider: "n8n", label: "n8n (automações)", base_url: null, config: {}, is_enabled: false, last_test_status: null, last_test_message: null, api_key_configured: false },
    { provider: "openrouter", label: "OpenRouter", base_url: null, config: {}, is_enabled: false, last_test_status: null, last_test_message: null, api_key_configured: false },
    { provider: "openai", label: "OpenAI", base_url: null, config: {}, is_enabled: false, last_test_status: null, last_test_message: null, api_key_configured: false },
    { provider: "nexus", label: "Nexus IA", base_url: "https://intelligent-ai-router.lovable.app/api/public/v1", config: { model: "nexus-auto" }, is_enabled: false, last_test_status: null, last_test_message: null, api_key_configured: false },
  ];
  const integrations = data?.integrations ?? fallbackIntegrations;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="font-semibold">Não foi possível carregar as integrações.</div>
          <div className="text-muted-foreground mt-1">{error instanceof Error ? error.message : "Erro ao consultar as integrações."}</div>
          <div className="text-xs text-muted-foreground mt-2">As definições abaixo são apenas o fallback visual; salve/teste após a conexão do backend.</div>
        </div>
      )}
      {isLoading && <div className="p-4 text-sm text-muted-foreground">Carregando integrações…</div>}
      {integrations.map((i) => {
        const d = drafts[i.provider] ?? i;
        const needsUrl = i.provider === "whatsapp" || i.provider === "n8n" || i.provider === "nexus";
        return (
          <div key={i.provider} className="rounded-2xl border border-border bg-card-glass p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="font-semibold">{i.label}</div>
                {i.last_test_status === "ok" && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40"><CheckCircle2 className="h-3 w-3 mr-1" />Conectado</Badge>}
                {i.last_test_status === "fail" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falha</Badge>}
                {!i.last_test_status && <Badge variant="outline">Não testado</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Ativo</Label>
                <Switch checked={!!d.is_enabled} onCheckedChange={(v) => onChange(i.provider, { is_enabled: v })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{helpText[i.provider]}</p>
            {needsUrl && (
              <div>
                <Label className="text-xs">URL base</Label>
                <Input value={d.base_url ?? ""} onChange={(e) => onChange(i.provider, { base_url: e.target.value })} placeholder="https://…" />
              </div>
            )}
            <div>
              <Label className="text-xs">Chave de API / token</Label>
              <Input type="password" value={d.api_key ?? ""} onChange={(e) => onChange(i.provider, { api_key: e.target.value })} placeholder={i.api_key_configured ? "Chave configurada — digite apenas para substituir" : "Informe a chave"} autoComplete="new-password" />
            </div>
            {i.last_test_message && <p className="text-xs text-muted-foreground">Último teste: {i.last_test_message} · {i.last_test_at ? new Date(i.last_test_at).toLocaleString() : ""}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onSave(i.provider)}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => onTest(i.provider)} disabled={testing === i.provider}>
                {testing === i.provider ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plug className="h-3.5 w-3.5 mr-1" />}
                Testar conexão
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- SETTINGS ---------- */
function SettingsPanel() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(adminGetSettings);
  const saveSetting = useServerFn(adminSaveSetting);
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: () => fetchSettings() });
  const [draft, setDraft] = useState<any>({
    general: { brand_name: "TW Design Studio", support_email: "" },
    operations: { response_timeout_seconds: 30, retry_attempts: 3, default_currency: "BRL" },
    webhooks: { internal_webhook_url: "" },
  });

  useEffect(() => {
    if (data?.settings) {
      setDraft((d: any) => ({
        general: { ...d.general, ...(data.settings.general ?? {}) },
        operations: { ...d.operations, ...(data.settings.operations ?? {}) },
        webhooks: { ...d.webhooks, ...(data.settings.webhooks ?? {}) },
      }));
    }
  }, [data]);

  const save = async (key: string) => {
    try {
      await saveSetting({ data: { key, value: draft[key] } });
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <div className="space-y-4">
      <Section title="Geral" action={<Button size="sm" onClick={() => save("general")}>Salvar</Button>}>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Nome da marca</Label><Input value={draft.general.brand_name} onChange={(e) => setDraft({ ...draft, general: { ...draft.general, brand_name: e.target.value } })} /></div>
          <div><Label>E-mail de suporte</Label><Input type="email" value={draft.general.support_email} onChange={(e) => setDraft({ ...draft, general: { ...draft.general, support_email: e.target.value } })} placeholder="suporte@…" /></div>
        </div>
      </Section>
      <Section title="Operacional" action={<Button size="sm" onClick={() => save("operations")}>Salvar</Button>}>
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>Timeout resposta (s)</Label><Input type="number" min="5" max="300" value={draft.operations.response_timeout_seconds} onChange={(e) => setDraft({ ...draft, operations: { ...draft.operations, response_timeout_seconds: Number(e.target.value) } })} /></div>
          <div><Label>Tentativas de retry</Label><Input type="number" min="0" max="10" value={draft.operations.retry_attempts} onChange={(e) => setDraft({ ...draft, operations: { ...draft.operations, retry_attempts: Number(e.target.value) } })} /></div>
          <div>
            <Label>Moeda padrão</Label>
            <Select value={draft.operations.default_currency} onValueChange={(v) => setDraft({ ...draft, operations: { ...draft.operations, default_currency: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL — Real</SelectItem>
                <SelectItem value="USD">USD — Dólar</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>
      <Section title="Webhooks" action={<Button size="sm" onClick={() => save("webhooks")}>Salvar</Button>}>
        <div><Label>URL do webhook interno (n8n / automações)</Label><Input value={draft.webhooks.internal_webhook_url} onChange={(e) => setDraft({ ...draft, webhooks: { ...draft.webhooks, internal_webhook_url: e.target.value } })} placeholder="https://n8n…/webhook/…" /></div>
      </Section>
    </div>
  );
}

/* ---------- SECURITY ---------- */
function SecurityPanel() {
  const fetchLogs = useServerFn(adminListLogs);
  const { data } = useQuery({ queryKey: ["admin-logs"], queryFn: () => fetchLogs() });
  const auth = (data?.logs ?? []).filter((l) => l.event?.startsWith("user.") || l.event?.includes("auth"));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Sessões" value="—" hint="Tempo real na v2" />
        <Stat label="Tentativas negadas" value="0" />
        <Stat label="Entradas de auditoria" value={data?.logs.length ?? 0} />
        <Stat label="E-mail admin" value="✓" hint="nexus989mn@gmail.com" />
      </div>
      <Section title="Auditoria de autenticação">
        <div className="divide-y divide-border max-h-72 overflow-auto text-sm">
          {auth.map((l) => (
            <div key={l.id} className="py-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-40 shrink-0">{new Date(l.created_at).toLocaleString()}</span>
              <span className="flex-1">{l.event}</span>
            </div>
          ))}
          {auth.length === 0 && <div className="py-6 text-center text-muted-foreground">Nenhuma entrada.</div>}
        </div>
      </Section>
    </div>
  );
}
