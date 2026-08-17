import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, MessageSquare, Send, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listConversations,
  createConversation,
  deleteConversation,
  getConversationMessages,
} from "@/lib/agent.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agent")({
  component: AgentPage,
});

function AgentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
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
  useEffect(() => {
    if (user && !isAdmin) router.navigate({ to: "/dashboard" });
  }, [user, isAdmin, router]);

  const { t } = useTranslation();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moduleCode, setModuleCode] = useState("atendimento");

  const { data: convData } = useQuery({
    queryKey: ["agent", "conversations"],
    queryFn: () => listConversations(),
  });
  const conversations = convData?.conversations ?? [];

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [activeId, conversations]);

  useEffect(() => {
    const handler = (event: Event) => {
      const code = (event as CustomEvent<string>).detail;
      if (["atendimento", "sdr", "audio"].includes(code) || (code === "designer" && isAdmin)) setModuleCode(code);
    };
    window.addEventListener("nexus-agent-module", handler);
    return () => window.removeEventListener("nexus-agent-module", handler);
  }, []);

  const { data: msgData } = useQuery({
    queryKey: ["agent", "messages", activeId],
    queryFn: () => getConversationMessages({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  const initialMessages = useMemo<UIMessage[]>(() => {
    return (msgData?.messages ?? []).map((m: any) => ({
      id: m.id,
      role: m.role as any,
      parts: Array.isArray(m.parts) && m.parts.length
        ? m.parts
        : [{ type: "text", text: m.content ?? "" }],
    }));
  }, [msgData]);

  const handleNew = async () => {
    const { conversation } = await createConversation({ data: {} });
    await qc.invalidateQueries({ queryKey: ["agent", "conversations"] });
    setActiveId(conversation.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("agent.confirmDelete"))) return;
    await deleteConversation({ data: { id } });
    if (activeId === id) setActiveId(null);
    await qc.invalidateQueries({ queryKey: ["agent", "conversations"] });
  };

  if (!isAdmin) return null;

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
        {/* Sidebar conversas */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4 text-primary" />
              {t("agent.conversations")}
            </div>
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-1" /> {t("agent.new")}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground p-3">{t("agent.empty")}</p>
            )}
            {conversations.map((c: any) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-2 px-2 py-2 rounded-lg text-sm cursor-pointer hover:bg-accent/60",
                  activeId === c.id && "bg-accent text-accent-foreground",
                )}
                onClick={() => setActiveId(c.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{c.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  aria-label={t("agent.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Chat */}
        <section className="flex-1 min-w-0 border border-border rounded-xl bg-card overflow-hidden flex flex-col">
          {activeId ? (
            <ChatWindow
              key={activeId}
              conversationId={activeId}
              initialMessages={initialMessages}
              moduleCode={moduleCode}
              isAdmin={isAdmin}
              onTitleChange={() => qc.invalidateQueries({ queryKey: ["agent", "conversations"] })}
            />
          ) : (
            <EmptyState onNew={handleNew} />
          )}
        </section>
      </div>
    </AppShell>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
      <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
        <Bot className="h-7 w-7 text-primary-foreground" />
      </div>
      <h2 className="font-display text-xl font-semibold">{t("agent.welcomeTitle")}</h2>
      <p className="text-sm text-muted-foreground max-w-md">{t("agent.welcomeDesc")}</p>
      <Button onClick={onNew}>
        <Plus className="h-4 w-4 mr-2" />
        {t("agent.startChat")}
      </Button>
    </div>
  );
}

function ChatWindow({
  conversationId,
  initialMessages,
  moduleCode,
  isAdmin,
  onTitleChange,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  moduleCode: string;
  isAdmin: boolean;
  onTitleChange: () => void;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setAuthReady(true);
    });
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: { conversationId, moduleCode },
      }),
    [token, conversationId, moduleCode],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (status === "ready") onTitleChange();
  }, [status, onTitleChange]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId, status]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    setInput("");
    await sendMessage({ text });
  };

  const busy = status === "submitted" || status === "streaming";

  return (
    <>
      <div className="border-b border-border p-3 flex items-center justify-between gap-3 bg-background/50">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Agente</div>
          <div className="text-sm text-foreground">{({atendimento:"IA Atendimento",sdr:"IA SDR",designer:"IA Designer",audio:"IA Áudio"} as Record<string,string>)[moduleCode] ?? "IA Atendimento"}</div>
        </div>
        <select value={moduleCode} onChange={(e) => window.dispatchEvent(new CustomEvent("nexus-agent-module", { detail: e.target.value }))} className="h-9 rounded-md border border-border bg-background px-3 text-sm" aria-label="Selecionar agente">
          <option value="atendimento">IA Atendimento</option>
          <option value="sdr">IA SDR</option>
          {isAdmin && <option value="designer">IA Designer (Admin)</option>}
          <option value="audio">IA Áudio</option>
        </select>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            {t("agent.sendFirst")}
          </p>
        )}
        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? (p as any).text : ""))
            .join("");
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
              {!isUser && (
                <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted/60 text-foreground rounded-bl-md",
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{text}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-pre:my-2">
                    <ReactMarkdown>{text || "…"}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("agent.thinking")}
          </div>
        )}
        {error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">
            {error.message}
          </div>
        )}
      </div>
      <div className="border-t border-border p-3 bg-background/40">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t("agent.placeholder")}
            rows={1}
            className="resize-none min-h-[44px] max-h-40"
            disabled={!authReady}
          />
          <Button onClick={handleSend} disabled={busy || !input.trim() || !authReady} size="icon">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
