import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Brain, Building2, CheckCircle2, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyAgentTraining, saveMyAgentTraining } from "@/lib/agent-training.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/training")({ component: TrainingPage });

const steps = [
  { title: "Conheça a configuração", text: "Você está configurando o conhecimento que o sistema usa para atender sua empresa.", icon: Brain },
  { title: "Informe sua empresa", text: "Diga segmento, produtos, serviços e informações que o sistema precisa conhecer.", icon: Building2 },
  { title: "Defina como sua empresa deve ser atendida", text: "Nome de atendimento, tom, regras, perguntas e informações que não podem ser inventadas.", icon: MessageSquare },
  { title: "Salve e teste", text: "Salve, teste e ajuste. O conteúdo fica isolado na sua empresa.", icon: ShieldCheck },
];

function Illustration({ index }: { index: number }) {
  const Icon = steps[index]?.icon ?? Sparkles;
  return <div className="h-40 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-center"><div className="h-20 w-20 rounded-3xl bg-background border border-border shadow-lg flex items-center justify-center"><Icon className="h-10 w-10 text-primary" /></div></div>;
}

function TrainingPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
    const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [behavior, setBehavior] = useState("");
  const [rules, setRules] = useState("");
  const [saving, setSaving] = useState(false);
  const get = useServerFn(getMyAgentTraining);
  const save = useServerFn(saveMyAgentTraining);
  const { data } = useQuery({ queryKey: ["training"], queryFn: () => get() });

  useEffect(() => { if (!user) return; supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => setIsAdmin(!!data)); }, [user]);
  useEffect(() => {
    const c = data?.config;
    setName(c?.display_name ?? "");
    setBehavior(c?.behavior_prompt ?? "");
    const ctx = (c?.company_context ?? {}) as any;
    setCompany(ctx.summary ?? "");
    setRules(((c?.rules ?? {}) as any).text ?? "");
  }, [data]);

  const onSave = async () => {
    setSaving(true);
    try {
      await save({ data: { displayName: name || null, behaviorPrompt: behavior, companyContext: { summary: company }, rules: { text: rules } } });
      toast.success("Informações salvas somente para sua empresa");
      await qc.invalidateQueries({ queryKey: ["training"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  return <AppShell isAdmin={isAdmin}>
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-2xl md:text-3xl font-bold">Treine sua IA</h1><p className="text-muted-foreground mt-1">Configure como sua empresa deve ser atendida sem alterar outros clientes ou a estrutura da plataforma.</p></div>
      <Card className="p-5 md:p-6"><div className="flex items-center gap-2 mb-4"><Sparkles className="h-5 w-5 text-primary" /><h2 className="font-semibold">Tutorial rápido</h2></div><Illustration index={step}/><div className="mt-4"><div className="text-xs text-muted-foreground">Passo {step + 1} de {steps.length}</div><h3 className="font-semibold mt-1">{steps[step].title}</h3><p className="text-sm text-muted-foreground mt-1">{steps[step].text}</p></div><div className="flex justify-between mt-5"><Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}>Anterior</Button><Button onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}>{step === steps.length - 1 ? "Concluído" : "Próximo"}</Button></div></Card>
      <Card className="p-5 md:p-6 space-y-5"><div><Label>Nome de atendimento</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Ana" /></div><div><Label>Sobre minha empresa</Label><Textarea value={company} onChange={e => setCompany(e.target.value)} placeholder="Segmento, produtos, serviços, horários, localização, diferenciais..." rows={5}/></div><div><Label>Como quero que o atendimento responda</Label><Textarea value={behavior} onChange={e => setBehavior(e.target.value)} placeholder="Tom de voz, forma de responder, como abordar clientes, informações que deve coletar..." rows={7}/></div><div><Label>Regras específicas</Label><Textarea value={rules} onChange={e => setRules(e.target.value)} placeholder="Nunca inventar preço; não oferecer desconto; sempre perguntar X..." rows={5}/></div><div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm flex gap-2"><ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5"/><span>Estas informações ficam vinculadas somente à sua empresa. Elas não concedem acesso administrativo, não alteram outros clientes e não substituem as regras de segurança do sistema.</span></div><Button className="w-full" onClick={onSave} disabled={saving}>{saving ? "Salvando…" : "Salvar informações"}</Button></Card>
      <div className="text-xs text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5"/> Configuração por empresa, versão controlada e isolada.</div>
    </div>
  </AppShell>;
}
