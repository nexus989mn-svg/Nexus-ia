import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, MessageCircle, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <LifeBuoy className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Suporte</h1>
            <p className="text-sm text-muted-foreground">
              Tire dúvidas e fale com o suporte da sua conta.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Atendimento</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Envie sua dúvida ou solicitação. A AURI fará o atendimento
            automaticamente e manterá a conversa vinculada à sua conta.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Suporte por e-mail</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            O canal de suporte por e-mail ficará disponível quando a
            configuração do serviço for ativada.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold mb-2">Se precisar de ajuda</h2>
        <p className="text-sm text-muted-foreground">
          Descreva o problema com o máximo de detalhes possível para que a
          AURI consiga orientar você rapidamente.
        </p>
      </div>
    </div>
  );
}
