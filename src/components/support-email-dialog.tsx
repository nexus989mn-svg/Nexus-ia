import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupportCopy } from "@/lib/support-i18n";
import { createSupportEmailRequest } from "@/lib/support-email.functions";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function SupportEmailDialog({ open, onOpenChange }: Props) {
  const { i18n } = useTranslation();
  const copy = useMemo(() => getSupportCopy(i18n.language), [i18n.language]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const sendFn = useServerFn(createSupportEmailRequest);

  const mutation = useMutation({
    mutationFn: sendFn,
    onSuccess: () => {
      setSubject("");
      setMessage("");
      onOpenChange(false);
      window.alert(copy.emailSent);
    },
  });

  if (!open) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim() || mutation.isPending) return;
    mutation.mutate({ subject: subject.trim(), message: message.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onMouseDown={() => onOpenChange(false)}
    >
      <form
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold truncate">{copy.email}</h2>
              <p className="text-xs text-muted-foreground">{copy.emailIntro}</p>
            </div>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{copy.subject}</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={160}
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{copy.message}</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            maxLength={10000}
            placeholder={copy.messagePlaceholder}
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            autoFocus
          />
        </label>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : copy.emailError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {copy.close}
          </Button>
          <Button type="submit" disabled={!subject.trim() || !message.trim() || mutation.isPending}>
            <Send className="h-4 w-4 mr-2" />
            {mutation.isPending ? copy.sending : copy.emailStart}
          </Button>
        </div>
      </form>
    </div>
  );
}
