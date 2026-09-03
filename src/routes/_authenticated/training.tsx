import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain, Building2, CheckCircle2, MessageSquare, ShieldCheck, Sparkles, Volume2, Play, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyAgentTraining, saveMyAgentTraining, previewAgentVoice } from "@/lib/agent-training.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/training")({ component: TrainingPage });

const steps = [
  { title: "Conheça a configuração", text: "Você está configurando o conhecimento e as preferências que a Auri usa para atender sua empresa.", icon: Brain },
  { title: "Informe sua empresa", text: "Diga segmento, produtos, serviços e informações que a atendente precisa conhecer.", icon: Building2 },
  { title: "Defina o jeito de atender", text: "Escolha nome, tom e orientações. As regras centrais de qualidade, segurança e continuidade permanecem protegidas.", icon: MessageSquare },
  { title: "Personalize a voz", text: "Ative o áudio somente se quiser e escolha a voz que será usada quando a atendente decidir que falar é melhor.", icon: Volume2 },
];

function Illustration({ index }: { index: number }) {
  const Icon = steps[index]?.icon ?? Sparkles;
  return <div className="h-40 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-center"><div className="h-20 w-20 rounded-3xl bg-background border border-border shadow-lg flex items-center justify-center"><Icon className="h-10 w-10 text-primary" /></div></div>;
}

function TrainingPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [behavior, setBehavior] = useState("");
  const [rules, setRules] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [voiceId, setVoiceId] = useState<string>("");
  const [voiceName, setVoiceName] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(false);

  const get = useServerFn(getMyAgentTraining);
  const save = useServerFn(saveMyAgentTraining);
  const preview = useServerFn(previewAgentVoice);
  const selectedLanguage = i18n.language === "en" ? "en" : i18n.language === "es" ? "es" : "pt-BR";
  const { data } = useQuery({ queryKey: ["training"], queryFn: () => get(), enabled: !!user });
  const { data: voices = [] } = useQuery({
    queryKey: ["agent-voice-catalog"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("agent_voice_catalog")
        .select("voice_id,name,language")
        .eq("is_active", true)
        .eq("language", selectedLanguage)
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ voice_id: string; name: string; language: string }>;
    },
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    const c = data?.config as any;
    if (!c) return;
    setName(c.display_name ?? "");
    setBehavior(c.behavior_prompt ?? "");
    const ctx = (c.company_context ?? {}) as Record<string, any>;
    setCompany(ctx.summary ?? "");
    setRules(((c.rules ?? {}) as any).text ?? "");
    setAudioEnabled(Boolean(c.audio_enabled));
    setVoiceId(c.voice_id ?? "");
    setVoiceName(c.voice_name ?? "");
  }, [data]);

  const onVoiceChange = (id: string) => {
    setVoiceId(id);
    setVoiceName(voices.find((v) => v.voice_id === id)?.name ?? "");
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await save({ data: { displayName: name || null, behaviorPrompt: behavior, companyContext: { summary: company }, rules: { text: rules }, audioEnabled, voiceId: voiceId || null, voiceName: voiceName || null } });
      toast.success("Configuração da Auri salva");
      await qc.invalidateQueries({ queryKey: ["training"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  return <AppShell isAdmin={isAdmin}>
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-2xl md:text-3xl font-bold">{t("Treine sua IA")}</h1><p className="text-muted-foreground mt-1">{t("Personalize a Auri com o conhecimento e o jeito da sua empresa. A camada central de qualidade e segurança não pode ser desativada pelo treinamento.")}</p></div>
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4"><Sparkles className="h-5 w-5 text-primary" /><h2 className="font-semibold">{t("Tutorial rápido")}</h2></div>
        <Illustration index={step}/>
        <div className="mt-4"><div className="text-xs text-muted-foreground">Passo {step + 1} de {steps.length}</div><h3 className="font-semibold mt-1">{steps[step].title}</h3><p className="text-sm text-muted-foreground mt-1">{steps[step].text}</p></div>
        <div className="flex justify-between mt-5"><Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>{t("Anterior")}</Button><Button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>{step === steps.length - 1 ? "Concluído" : "Próximo"}</Button></div>
      </Card>

      <Card className="p-5 md:p-6 space-y-5">
        <div><Label>{t("Nome de atendimento")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex.: Auri" /></div>
        <div><Label>{t("Sobre minha empresa")}</Label><Textarea value={company} onChange={(e) => setCompany(e.target.value)} maxLength={12000} placeholder={t("Segmento, produtos, serviços, horários, localização, diferenciais...")} rows={6}/></div>
        <div><Label>{t("Como quero que o atendimento responda")}</Label><Textarea value={behavior} onChange={(e) => setBehavior(e.target.value)} maxLength={12000} placeholder={t("Tom de voz, forma de responder, como abordar clientes, como apresentar os serviços...")} rows={7}/></div>
        <div><Label>{t("Orientações específicas da empresa")}</Label><Textarea value={rules} onChange={(e) => setRules(e.target.value)} maxLength={12000} placeholder={t("Ex.: não oferecer desconto; sempre confirmar o endereço antes de finalizar...")} rows={5}/></div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3"><Volume2 className="h-5 w-5 text-primary mt-0.5"/><div><Label className="text-base">{t("Usar respostas em áudio")}</Label><p className="text-sm text-muted-foreground mt-1">{t("Quando ativado, a Auri pode decidir que uma resposta longa ou explicativa fica melhor em áudio. Ela não transforma toda mensagem em voz.")}</p></div></div>
            <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled}/>
          </div>
          <div className="space-y-2">
            <Label>{t("Voz da Auri")}</Label>
            <Select value={voiceId} onValueChange={onVoiceChange} disabled={!audioEnabled}>
              <SelectTrigger><SelectValue placeholder={audioEnabled ? "Escolha uma voz" : "Ative o áudio primeiro"}/></SelectTrigger>
              <SelectContent>{voices.map((voice) => <SelectItem key={voice.voice_id} value={voice.voice_id}>{voice.name} · {voice.language}</SelectItem>)}</SelectContent>
            </Select>
            {audioEnabled && !voices.length && <p className="text-xs text-amber-500">{t("Nenhuma voz está disponível no catálogo do Nexus ainda.")}</p>}
            {audioEnabled && voiceId && <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={previewingVoice}
                onClick={async () => {
                  setPreviewingVoice(true);
                  try {
                    const result = await preview({ data: { voiceId, language: selectedLanguage } });
                    const audio = new Audio(result.url);
                    await audio.play();
                    toast.success(`Prévia da voz ${result.voiceName} reproduzida`);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Não foi possível reproduzir a voz");
                  } finally {
                    setPreviewingVoice(false);
                  }
                }}
              >
                {previewingVoice ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Ouvir voz
              </Button>
              {voiceName && <span className="text-xs text-muted-foreground">Prévia da voz selecionada: <span className="text-foreground font-medium">{voiceName}</span></span>}
            </div>}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm flex gap-2"><ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5"/><span>{t("Suas informações são usadas somente pela sua empresa. Elas personalizam conhecimento e estilo, mas não podem desligar memória, veracidade, segurança, permissões, handoff humano, proteção de credenciais ou outras regras centrais da Auri.")}</span></div>
        <Button className="w-full" onClick={onSave} disabled={saving}>{saving ? "Salvando…" : "Salvar configuração"}</Button>
      </Card>
      <div className="text-xs text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5"/> {t("Configuração por empresa, versão controlada e isolada.")}</div>
    </div>
  </AppShell>;
}
