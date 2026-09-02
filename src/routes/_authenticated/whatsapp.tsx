import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Phone,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Power,
  RefreshCw,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";

import { getMySubscription } from "@/lib/billing.functions";

import {
  getMyWhatsapp,
  requestWhatsappConnection,
  refreshWhatsappConnection,
  confirmWhatsappConnected,
  disconnectWhatsapp,
  cancelWhatsappConnection,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — Conectar número" }] }),
  component: WhatsappPage,
});

function WhatsappPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingSeconds, setPendingSeconds] = useState<number | null>(null);
  const fetchSub = useServerFn(getMySubscription);
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["my-sub"],
    queryFn: () => fetchSub(),
    enabled: !!user,
  });

  const fetchConn = useServerFn(getMyWhatsapp);
  const requestConn = useServerFn(requestWhatsappConnection);
  const refreshConn = useServerFn(refreshWhatsappConnection);
  const confirmConn = useServerFn(confirmWhatsappConnected);
  const disconnectConn = useServerFn(disconnectWhatsapp);
  const cancelConn = useServerFn(cancelWhatsappConnection);

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ["whatsapp"],
    queryFn: () => fetchConn(),
    enabled: !!user,
  });

  const conn = data?.connection;
  const status = conn?.status ?? "disconnected";

  const statusLabel =
    status === "connected"
      ? "Conectado"
      : status === "pending"
        ? "Aguardando QR"
        : "Desconectado";

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
    if (!conn) return;

    setPhone(conn.phone_e164 ?? "");
    setName(conn.display_name ?? "");
  }, [conn]);

  /*
   * Enquanto estiver aguardando o QR,
   * consulta a Evolution automaticamente.
   *
   * Assim o usuário não precisa clicar
   * em "Já escaneei" para o sistema descobrir
   * que o WhatsApp conectou.
   */
  useEffect(() => {
    if (status !== "pending") {
      setPendingSeconds(null);
      return;
    }
    const started = conn?.metadata?.pending_started_at;
    if (!started) {
      setPendingSeconds(120);
      return;
    }
    const update = () => {
      const left = Math.max(0, 120 - Math.floor((Date.now() - new Date(started).getTime()) / 1000));
      setPendingSeconds(left);
      if (left === 0) void handleCancel();
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [status, conn?.metadata?.pending_started_at]);

  useEffect(() => {
    if (status !== "pending" || !conn?.instance_name) return;

    const timer = window.setInterval(async () => {
      try {
        const result = await refreshConn();

        if (
          result?.evolution_status === "open" ||
          result?.evolution_status === "connected"
        ) {
          toast.success("WhatsApp conectado!");

          await qc.invalidateQueries({
            queryKey: ["whatsapp"],
          });
        } else {
          /*
           * Atualiza o QR caso a Evolution tenha
           * gerado um novo código.
           */
          await qc.invalidateQueries({
            queryKey: ["whatsapp"],
          });
        }
      } catch {
        // Não interrompe o polling por erro temporário.
      }
    }, 4000);

    return () => window.clearInterval(timer);
  }, [status, conn?.instance_name, refreshConn, qc]);

  if (user && !subLoading && !isAdmin && !subData?.hasAccess) {
    return (
      <AppShell isAdmin={isAdmin}>
        <div className="max-w-2xl mx-auto mt-10 rounded-3xl border border-border bg-card-glass p-6 md:p-8 text-center">
          <Phone className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-2xl font-bold mt-4">WhatsApp bloqueado</h1>
          <p className="text-muted-foreground mt-2">Ative o Trial ou um plano pago para liberar a conexão do WhatsApp.</p>
          <Link to="/billing"><Button className="mt-5 bg-gradient-primary">Ver planos</Button></Link>
        </div>
      </AppShell>
    );
  }

  const handleRequest = async () => {
    if (!phone.trim() || !name.trim()) {
      toast.error("Preencha nome e número");
      return;
    }

    setBusy(true);

    try {
      const result = await requestConn({
        data: {
          phone_e164: phone.trim(),
          display_name: name.trim(),
        },
      });

      if (
        result?.evolution_status === "open" ||
        result?.evolution_status === "connected"
      ) {
        toast.success("WhatsApp conectado!");
      } else if (result?.qr_code) {
        toast.success("QR gerado. Escaneie pelo WhatsApp.");
      } else {
        toast.success("Conexão iniciada. Aguarde o QR.");
      }

      await qc.invalidateQueries({
        queryKey: ["whatsapp"],
      });
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Erro ao iniciar conexão",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBusy(true);

    try {
      await refreshConn();

      await qc.invalidateQueries({
        queryKey: ["whatsapp"],
      });
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Erro ao atualizar conexão",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setBusy(true);

    try {
      await confirmConn();

      toast.success("WhatsApp conectado!");

      await qc.invalidateQueries({
        queryKey: ["whatsapp"],
      });
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "O WhatsApp ainda não está conectado",
      );
    } finally {
      setBusy(false);
    }
  };

  async function handleCancel() {
    if (busy) return;
    setBusy(true);
    try {
      await cancelConn();
      await qc.invalidateQueries({ queryKey: ["whatsapp"] });
      toast.success("Tentativa de conexão cancelada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cancelar a conexão");
    } finally {
      setBusy(false);
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm("Desconectar este WhatsApp?")) return;

    setBusy(true);

    try {
      await disconnectConn();

      toast.success("WhatsApp desconectado.");

      await qc.invalidateQueries({
        queryKey: ["whatsapp"],
      });
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Erro ao desconectar",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="mb-6">
        <div className="text-sm text-muted-foreground">
          <Link
            to="/dashboard"
            className="hover:text-foreground"
          >
            Painel
          </Link>{" "}
          / WhatsApp
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-3">
          <Phone className="h-7 w-7 text-primary" />
          Conectar WhatsApp
        </h1>

        <p className="text-muted-foreground mt-2 max-w-2xl">
          Conecte o número que será utilizado pela sua IA.
          A conexão é feita diretamente pelo aplicativo.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">

        {/* STATUS */}
        <div className="lg:col-span-1 rounded-2xl border border-border bg-card-glass p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Status
          </div>

          <div className="mt-3 flex items-center gap-2">
            {status === "connected" ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : status === "pending" ? (
              <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            )}

            <span className="font-semibold">
              {statusLabel}
            </span>
          </div>

          {conn?.phone_e164 && (
            <div className="mt-4 text-sm">
              <div className="text-muted-foreground">
                Número
              </div>

              <div className="font-mono">
                {conn.phone_e164}
              </div>
            </div>
          )}

          {conn?.display_name && (
            <div className="mt-3 text-sm">
              <div className="text-muted-foreground">
                Nome de exibição
              </div>

              <div>{conn.display_name}</div>
            </div>
          )}

          {conn?.instance_name && (
            <div className="mt-3 text-sm">
              <div className="text-muted-foreground">
                Instância
              </div>

              <div className="font-mono text-xs break-all">
                {conn.instance_name}
              </div>
            </div>
          )}

          {conn?.connected_at && (
            <div className="mt-3 text-sm">
              <div className="text-muted-foreground">
                Conectado em
              </div>

              <div>
                {new Date(
                  conn.connected_at,
                ).toLocaleString("pt-BR")}
              </div>
            </div>
          )}

          {status === "connected" && (
            <Button
              variant="destructive"
              className="w-full mt-5"
              onClick={handleDisconnect}
              disabled={busy}
            >
              <Power className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          )}
        </div>

        {/* CONTEÚDO */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          {status !== "connected" && (
            <div className="rounded-2xl border border-border bg-card-glass p-5 md:p-6">
              <h2 className="font-semibold text-lg">
                1. Dados do número
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                Informe o número que será conectado ao
                Assistente IA.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">

                <div className="space-y-2">
                  <Label htmlFor="wa-name">
                    Nome de exibição
                  </Label>

                  <Input
                    id="wa-name"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Loja do João"
                    disabled={busy || isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wa-phone">
                    Número do WhatsApp
                  </Label>

                  <Input
                    id="wa-phone"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    placeholder="+55 11 91234-5678"
                    disabled={busy || isLoading}
                  />
                </div>

              </div>

              <Button
                onClick={handleRequest}
                className="mt-4"
                disabled={busy || isLoading}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : status === "pending" ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar QR
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            </div>
          )}

          {/* QR REAL */}
          {status === "pending" && conn?.qr_code && (
            <div className="rounded-2xl border border-border bg-card-glass p-5 md:p-6">

              <h2 className="font-semibold text-lg">
                2. Escaneie o QR no WhatsApp
              </h2>

              <ol className="text-sm text-muted-foreground mt-2 list-decimal pl-5 space-y-1">
                <li>
                  Abra o WhatsApp no celular.
                </li>

                <li>
                  Toque em{" "}
                  <strong>Menu</strong> →{" "}
                  <strong>Aparelhos conectados</strong> →{" "}
                  <strong>Conectar um aparelho</strong>.
                </li>

                <li>
                  Aponte a câmera para o QR abaixo.
                </li>
              </ol>

              <div className="mt-5 flex flex-col items-center">

                <div className="auri-qr rounded-xl border border-border bg-white p-2 sm:p-3">
                  <img
                    src={conn.qr_code}
                    alt="QR code real de conexão do WhatsApp"
                    className="block w-full h-full object-contain"
                  />
                </div>

                <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={busy}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar QR
                  </Button>

                  <Button
                    onClick={handleConfirm}
                    disabled={busy}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verificar conexão
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={busy}
                  >
                    Cancelar / trocar número
                  </Button>
                </div>

              </div>

              <div className="mt-4 text-center text-xs text-muted-foreground">
                {pendingSeconds !== null
                  ? `Esta tentativa expira automaticamente em ${Math.floor(pendingSeconds / 60)}:${String(pendingSeconds % 60).padStart(2, "0")}.`
                  : "A tentativa será encerrada automaticamente se não houver conexão."}
              </div>

              <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                Depois de escanear, o sistema verifica
                automaticamente a conexão.
              </div>

            </div>
          )}

          {/* AGUARDANDO QR */}
          {status === "pending" && !conn?.qr_code && (
            <div className="rounded-2xl border border-border bg-card-glass p-6 text-center">

              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />

              <h2 className="font-semibold text-lg mt-3">
                Gerando QR de conexão...
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                A Evolution está preparando o QR.
              </p>

              <div className="mt-4 flex justify-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={busy}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                <Button variant="ghost" onClick={handleCancel} disabled={busy}>
                  Cancelar / trocar número
                </Button>
              </div>

            </div>
          )}

          {/* CONECTADO */}
          {status === "connected" && (
            <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 md:p-6">

              <div className="flex items-start gap-3">

                <CheckCircle2 className="h-6 w-6 text-primary mt-0.5" />

                <div>
                  <h2 className="font-semibold text-lg">
                    WhatsApp ativo
                  </h2>

                  <p className="text-sm text-muted-foreground mt-1">
                    Seu número está conectado e pronto
                    para receber e responder mensagens
                    com a IA.
                  </p>

                  <div className="flex gap-2 mt-4 flex-wrap">

                    <Link to="/catalog">
                      <Button variant="secondary">
                        Abrir catálogo
                      </Button>
                    </Link>

                    <Link to="/dashboard">
                      <Button variant="outline">
                        Voltar ao painel
                      </Button>
                    </Link>

                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
