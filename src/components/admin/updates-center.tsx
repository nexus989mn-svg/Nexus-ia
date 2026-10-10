import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";
type Commit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: { date?: string };
  };
};

type Plan = {
  version: string;
  commitSha: string;
  date: string;
  time: string;
  message: string;
  status: "draft" | "scheduled" | "published" | "cancelled";
  noticeSent: boolean;
  updatedAt: string;
};

const REPOSITORY = "nexus989mn-svg/Nexus-ia";
const KEY = "updates_center";

const emptyPlan: Plan = {
  version: "",
  commitSha: "",
  date: "",
  time: "",
  message: "",
  status: "draft",
  noticeSent: false,
  updatedAt: "",
};

function shortSha(sha: string) {
  return sha.slice(0, 7);
}

function formatDate(date?: string) {
  if (!date) return "Data indisponível";
  return new Date(date).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function UpdatesCenter() {
  const [main, setMain] = useState<Commit | null>(null);
  const [develop, setDevelop] = useState<Commit | null>(null);
  const [history, setHistory] = useState<Commit[]>([]);
  const [plan, setPlan] = useState<Plan>(emptyPlan);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settings, ...responses] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", KEY).maybeSingle(),
        fetch(`https://api.github.com/repos/${REPOSITORY}/commits/main`, {
          headers: { Accept: "application/vnd.github+json" },
        }),
        fetch(`https://api.github.com/repos/${REPOSITORY}/commits/develop`, {
          headers: { Accept: "application/vnd.github+json" },
        }),
        fetch(`https://api.github.com/repos/${REPOSITORY}/commits?sha=develop&per_page=20`, {
          headers: { Accept: "application/vnd.github+json" },
        }),
      ]);

      if (settings.error) throw new Error(`Erro ao carregar configurações: ${settings.error.message}`);
      const stored = settings.data?.value as Plan | undefined;
      if (stored) setPlan({ ...emptyPlan, ...stored });

      if (responses.some((r) => !r.ok)) {
        throw new Error("Não foi possível consultar o GitHub.");
      }

      const [m, d, h] = await Promise.all(responses.map((r) => r.json()));
      setMain(m as Commit);
      setDevelop(d as Commit);
      setHistory(h as Commit[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function persist(next: Plan, message: string) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const value = { ...next, updatedAt: new Date().toISOString() };
      const { error: saveError } = await supabase
        .from("platform_settings")
        .upsert({ key: KEY, value, updated_at: value.updatedAt });

      if (saveError) throw new Error(`Erro ao salvar configurações: ${saveError.message}`);
      setPlan(value);
      setSuccess(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  function schedule() {
    if (!develop?.sha || !plan.date || !plan.time) {
      setError("Commit de desenvolvimento indisponível. Atualize as informações do GitHub.");
      return;
    }
    if (new Date(`${plan.date}T${plan.time}`).getTime() <= Date.now()) {
      setError("Escolha uma data e um horário futuros.");
      return;
    }
    void persist({ ...plan, commitSha: plan.commitSha || develop.sha, status: "scheduled", noticeSent: false }, `Agendamento salvo para o commit ${shortSha(plan.commitSha || develop.sha)}. Nenhum aviso foi enviado e nenhuma publicação foi feita.`);
  }

  function sendNotice() {
    if (!plan.commitSha || !plan.date || !plan.time) {
      setError("Prepare e salve o agendamento com um commit antes de enviar um aviso.");
      return;
    }
    if (!window.confirm("Confirmar o envio do aviso aos clientes?")) return;
    setError("");
    setSuccess("");
    // O envio real requer integração com um canal de notificações.
    setError("Envio não realizado: ainda falta conectar um canal de notificação aos clientes. Nenhuma mensagem foi enviada.");
  }

  async function publish() {
    const sha = plan.commitSha || develop?.sha;
    if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) {
      setError("Selecione um commit válido antes de publicar.");
      return;
    }

    if (!window.confirm(`Autorizar a publicação do commit ${shortSha(sha)} em main?`)) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sua sessão expirou. Entre novamente.");

      const response = await fetch("/api/admin/publish-commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ commitSha: sha }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível publicar o commit.");

      const nextPlan = {
        ...plan,
        commitSha: sha,
        status: "published" as const,
        updatedAt: new Date().toISOString(),
      };

      await persist(nextPlan, result.message || `Commit ${shortSha(sha)} promovido para main.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao publicar.");
    } finally {
      setSaving(false);
    }
  }

  const comparisonUrl = `https://github.com/${REPOSITORY}/compare/main...develop`;

  return (
    <section className="space-y-6 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Centro de Atualizações</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Você controla os avisos e autoriza cada publicação.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading || saving}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
          {loading ? "Carregando..." : "Atualizar informações"}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{success}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { name: "Produção — main", commit: main },
          { name: "Desenvolvimento — develop", commit: develop },
        ].map(({ name, commit }) => (
          <article key={name} className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5">
            <p className="text-sm text-muted-foreground">{name}</p>
            {commit ? <>
              <p className="mt-3 font-mono text-lg">{shortSha(commit.sha)}</p>
              <p className="mt-2 break-words text-sm text-card-foreground">{commit.commit.message.split("\n")[0]}</p>
              <p className="mt-3 text-xs text-muted-foreground">{formatDate(commit.commit.author?.date)}</p>
              <a href={commit.html_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-primary hover:underline">Ver commit no GitHub</a>
            </> : <p className="mt-3 text-sm text-muted-foreground">{loading ? "Carregando..." : "Informação indisponível."}</p>}
          </article>
        ))}
      </div>

      <article className="space-y-4 rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5">
        <div>
          <h3 className="font-semibold">Preparar e agendar atualização</h3>
          <p className="mt-1 text-sm text-muted-foreground">Salvar o agendamento não envia avisos nem publica o sistema.</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3 space-y-3">
          <label className="block text-sm">
            Commit que será publicado — develop
            <select
              value={plan.commitSha || develop?.sha || ""}
              onChange={(e) => setPlan({ ...plan, commitSha: e.target.value, status: "draft" })}
              className="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-3"
            >
              {history.map((commit) => (
                <option key={commit.sha} value={commit.sha}>
                  {shortSha(commit.sha)} — {commit.commit.message.split("\\n")[0]}
                </option>
              ))}
            </select>
          </label>
          {history.find((commit) => commit.sha === (plan.commitSha || develop?.sha)) && (
            <div>
              <p className="break-all font-mono text-sm">{plan.commitSha || develop?.sha}</p>
              <a
                href={history.find((commit) => commit.sha === (plan.commitSha || develop?.sha))!.html_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >Ver commit no GitHub</a>
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">Data
            <input type="date" value={plan.date} onChange={(e) => setPlan({ ...plan, date: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <label className="block text-sm">Horário
            <input type="time" value={plan.time} onChange={(e) => setPlan({ ...plan, time: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
        </div>
        <label className="block text-sm">Mensagem para os clientes
          <textarea value={plan.message} onChange={(e) => setPlan({ ...plan, message: e.target.value })}
            rows={3} placeholder="Descreva as mudanças e o impacto previsto."
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <p className="text-sm text-muted-foreground">Commit agendado: <strong className="font-mono">{plan.commitSha ? shortSha(plan.commitSha) : "Nenhum"}</strong> · Status: <strong>{plan.status}</strong> · Aviso enviado: <strong>{plan.noticeSent ? "Sim" : "Não"}</strong></p>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={saving} onClick={schedule}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Salvando..." : "Salvar agendamento"}
          </button>
          <button type="button" disabled={saving} onClick={() => void persist({ ...plan, status: "cancelled" }, "Agendamento cancelado. Nenhuma publicação foi realizada.")}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
            Cancelar agendamento
          </button>
          <button type="button" disabled={saving} onClick={sendNotice}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
            Enviar aviso aos clientes
          </button>
          <button type="button" disabled={saving} onClick={publish}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50">
            Autorizar publicação agora
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Avisos e deploy ainda precisam de integrações reais. Os botões informam quando a ação não está conectada; não simulam sucesso.</p>
      </article>

      <article className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5">
        <h3 className="font-semibold">Comparação de versões</h3>
        <p className="mt-2 text-sm text-muted-foreground">Compare as alterações antes de decidir publicar.</p>
        <a href={comparisonUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Comparar main e develop</a>
      </article>

      <article className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5">
        <h3 className="font-semibold">Histórico de produção</h3>
        {history.length === 0 && !loading ? <p className="mt-3 text-sm text-muted-foreground">Nenhum commit disponível.</p> : (
          <div className="mt-4 divide-y divide-slate-800">
            {history.map((commit) => <a key={commit.sha} href={commit.html_url} target="_blank" rel="noreferrer"
              className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0 flex-1 break-words text-sm text-card-foreground">{commit.commit.message.split("\n")[0]}</span>
              <span className="font-mono text-xs text-primary">{shortSha(commit.sha)}</span>
            </a>)}
          </div>
        )}
      </article>
    </section>
  );
}
