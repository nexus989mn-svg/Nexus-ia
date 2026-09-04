import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LifeBuoy,
  MessageCircle,
  Plus,
  Send,
  CheckCircle2,
  Clock3,
  UserRound,
  Bot,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/use-auth";
import { getSupportCopy } from "@/lib/support-i18n";
import {
  closeSupportThread,
  createSupportThread,
  getMySupportMessages,
  listMySupportThreads,
  sendSupportMessage,
} from "@/lib/support.functions";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Suporte — AURI" }] }),
  component: SupportPage,
});

type Thread = {
  id: string;
  subject: string;
  status: string;
  needs_human: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

type SupportMessage = {
  id: string;
  sender_type: "customer" | "ai" | "human" | "system";
  content: string;
  status: string;
  created_at: string;
};

function SupportPage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const copy = useMemo(() => getSupportCopy(i18n.language), [i18n.language]);
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTicket, setNewTicket] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const listFn = useServerFn(listMySupportThreads);
  const messagesFn = useServerFn(getMySupportMessages);
  const createFn = useServerFn(createSupportThread);
  const sendFn = useServerFn(sendSupportMessage);
  const closeFn = useServerFn(closeSupportThread);

  const threadsQuery = useQuery({
    queryKey: ["support-threads", user?.id],
    queryFn: () => listFn(),
    enabled: !!user,
    refetchInterval: 5000,
  });

  const threads = (threadsQuery.data?.threads ?? []) as Thread[];

  useEffect(() => {
    if (!selectedId && threads.length > 0) {
      setSelectedId(threads[0].id);
    } else if (selectedId && !threads.some((thread) => thread.id === selectedId)) {
      setSelectedId(threads[0]?.id ?? null);
    }
  }, [threads, selectedId]);

  const messagesQuery = useQuery({
    queryKey: ["support-messages", selectedId],
    queryFn: () => messagesFn({ data: { threadId: selectedId! } }),
    enabled: !!selectedId,
    refetchInterval: selectedId ? 2500 : false,
  });

  const selectedThread = threads.find((thread) => thread.id === selectedId) ?? messagesQuery.data?.thread;
  const messages = (messagesQuery.data?.messages ?? []) as SupportMessage[];

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: ({ thread }) => {
      setSubject("");
      setMessage("");
      setNewTicket(false);
      setSelectedId(thread.id);
      queryClient.invalidateQueries({ queryKey: ["support-threads", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["support-messages", thread.id] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: sendFn,
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["support-threads", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["support-messages", selectedId] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: closeFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-threads", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["support-messages", selectedId] });
    },
  });

  const formatTime = (value: string) =>
    new Date(value).toLocaleString(i18n.language, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const statusLabel = (status?: string) => {
    switch (status) {
      case "waiting_ai": return copy.waitingAi;
      case "answered": return copy.answered;
      case "human_pending": return copy.humanPending;
      case "closed": return copy.closed;
      default: return copy.open;
    }
  };

  const statusIcon = (status?: string) => {
    if (status === "closed") return <X className="h-3.5 w-3.5" />;
    if (status === "answered") return <CheckCircle2 className="h-3.5 w-3.5" />;
    return <Clock3 className="h-3.5 w-3.5" />;
  };

  const submitNew = (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim() || createMutation.isPending) return;
    createMutation.mutate({
      subject: subject.trim() || copy.newSubject,
      message: message.trim(),
    });
  };

  const submitReply = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !reply.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ threadId: selectedId, message: reply.trim() });
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <LifeBuoy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-display font-bold">{copy.title}</h1>
              <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
            </div>
          </div>
          <Button onClick={() => setNewTicket(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {copy.new}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card-glass p-4 md:p-5">
          <p className="text-sm text-muted-foreground">{copy.supportIntro}</p>
        </div>

        {newTicket ? (
          <form onSubmit={submitNew} className="rounded-2xl border border-border bg-card-glass p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-lg">{copy.start}</h2>
              <button type="button" onClick={() => setNewTicket(false)} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{copy.subject}</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={copy.subjectPlaceholder}
                maxLength={160}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{copy.message}</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={copy.messagePlaceholder}
                rows={5}
                maxLength={10000}
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
            </label>

            {createMutation.isError && (
              <p className="text-sm text-destructive">{createMutation.error instanceof Error ? createMutation.error.message : copy.error}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={!message.trim() || createMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {createMutation.isPending ? copy.sending : copy.send}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] min-w-0">
            <section className="rounded-2xl border border-border bg-card-glass overflow-hidden min-w-0">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="font-semibold">{copy.title}</span>
                <span className="text-xs text-muted-foreground">{threads.length}</span>
              </div>
              <div className="max-h-[52vh] overflow-y-auto">
                {threads.length === 0 ? (
                  <div className="p-5 text-center">
                    <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{copy.noTickets}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setNewTicket(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {copy.start}
                    </Button>
                  </div>
                ) : (
                  threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedId(thread.id)}
                      className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                        selectedId === thread.id ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="font-medium text-sm truncate">{thread.subject}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {statusIcon(thread.status)}
                        <span>{statusLabel(thread.status)}</span>
                        <span className="ml-auto">{formatTime(thread.updated_at)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card-glass min-w-0 overflow-hidden flex flex-col min-h-[55vh]">
              {!selectedThread ? (
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                  <div>
                    <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">{copy.emptyConversation}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-border flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
                      <LifeBuoy className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{selectedThread.subject}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {statusIcon(selectedThread.status)}
                        <span>{statusLabel(selectedThread.status)}</span>
                      </div>
                    </div>
                    {selectedThread.status !== "closed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={closeMutation.isPending}
                        onClick={() => {
                          if (window.confirm(copy.closeConfirm)) closeMutation.mutate({ threadId: selectedThread.id });
                        }}
                      >
                        {copy.close}
                      </Button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((item) => {
                      const mine = item.sender_type === "customer";
                      const isHuman = item.sender_type === "human";
                      return (
                        <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                            mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-background border border-border rounded-bl-md"
                          }`}>
                            <div className={`flex items-center gap-1.5 text-[10px] mb-1 ${
                              mine ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}>
                              {mine ? <UserRound className="h-3 w-3" /> : isHuman ? <UserRound className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                              <span>{mine ? copy.you : isHuman ? copy.humanPending : copy.ai}</span>
                              <span>·</span>
                              <span>{formatTime(item.created_at)}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>
                          </div>
                        </div>
                      );
                    })}

                    {selectedThread.status === "waiting_ai" && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                          {copy.waiting}
                        </div>
                      </div>
                    )}

                    {selectedThread.status === "human_pending" && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
                        {copy.humanNotice}
                      </div>
                    )}

                    {selectedThread.status === "closed" && (
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                        {copy.closedNotice}
                      </div>
                    )}
                  </div>

                  {selectedThread.status !== "closed" && selectedThread.status !== "human_pending" && (
                    <form onSubmit={submitReply} className="p-3 border-t border-border flex gap-2">
                      <textarea
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        placeholder={copy.messagePlaceholder}
                        rows={2}
                        maxLength={10000}
                        className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <Button type="submit" size="icon" disabled={!reply.trim() || sendMutation.isPending} aria-label={copy.send}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  )}

                  {sendMutation.isError && (
                    <p className="px-4 pb-3 text-sm text-destructive">
                      {sendMutation.error instanceof Error ? sendMutation.error.message : copy.error}
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
