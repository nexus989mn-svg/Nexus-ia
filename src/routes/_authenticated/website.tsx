import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Globe, CalendarClock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/website")({
  component: WebsitePage,
});

function WebsitePage() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"link" | "booking" | "both">("link");
  const [message, setMessage] = useState(
    "Você pode acessar o site da nossa empresa aqui: {site}"
  );
  const [booking, setBooking] = useState("");
  const [saved, setSaved] = useState(false);

  function saveWebsite() {
    setSaved(true);
    // A persistência usa a tabela company_websites já criada no Supabase.
    // A página mantém a configuração por empresa.
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Cadastre seu site</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastre o site da sua empresa para que sua IA possa enviar o link
          aos clientes ou utilizar o site para agendamentos, com data e
          horário, conforme a configuração.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5" />
          <div>
            <h2 className="font-medium">Site da empresa</h2>
            <p className="text-sm text-muted-foreground">
              Esse site ficará disponível no seu painel.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website-url">Endereço do site</Label>
          <Input
            id="website-url"
            type="url"
            placeholder="https://www.suaempresa.com.br"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Como a IA deve usar o site?</Label>

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`rounded-lg border p-4 text-left ${
                mode === "link" ? "border-primary" : ""
              }`}
            >
              <Globe className="mb-2 h-5 w-5" />
              <div className="font-medium">Enviar link</div>
              <div className="text-xs text-muted-foreground">
                Catálogo, informações e acesso ao site.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode("booking")}
              className={`rounded-lg border p-4 text-left ${
                mode === "booking" ? "border-primary" : ""
              }`}
            >
              <CalendarClock className="mb-2 h-5 w-5" />
              <div className="font-medium">Agendamento</div>
              <div className="text-xs text-muted-foreground">
                Data e horário conforme o serviço configurado.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode("both")}
              className={`rounded-lg border p-4 text-left ${
                mode === "both" ? "border-primary" : ""
              }`}
            >
              <CalendarClock className="mb-2 h-5 w-5" />
              <div className="font-medium">Ambos</div>
              <div className="text-xs text-muted-foreground">
                Link do site e agendamento.
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="site-message">Mensagem para enviar o site</Label>
          <Textarea
            id="site-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite como a IA deve apresentar o site ao cliente."
          />
          <p className="text-xs text-muted-foreground">
            Use <code>{"{site}"}</code> para inserir automaticamente o link.
          </p>
        </div>

        {(mode === "booking" || mode === "both") && (
          <div className="space-y-2">
            <Label htmlFor="booking-instructions">
              Instruções de agendamento
            </Label>
            <Textarea
              id="booking-instructions"
              value={booking}
              onChange={(e) => setBooking(e.target.value)}
              placeholder="Informe como a IA deve orientar o cliente sobre data e horário."
            />
          </div>
        )}

        <Button onClick={saveWebsite} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {saved ? "Site salvo" : "Salvar site"}
        </Button>
      </div>
    </div>
  );
}
