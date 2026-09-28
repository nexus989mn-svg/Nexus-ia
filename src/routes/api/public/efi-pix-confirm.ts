import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { consultarEfiPix } from "@/lib/efi-pix.server";
import { emitOperationalEvent } from "@/lib/ops.server";

export const Route = createFileRoute("/api/public/efi-pix-confirm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.EFI_N8N_CONFIRM_SECRET?.trim();

        if (!secret || request.headers.get("x-efi-n8n-secret") !== secret) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const txid = String(body?.txid || "").trim();

        if (!txid) {
          return Response.json(
            { error: "TXID obrigatório" },
            { status: 400 },
          );
        }

        const pix = await consultarEfiPix(txid);

        if (pix.status !== "CONCLUIDA") {
          return Response.json({
            ok: true,
            confirmado: false,
            status: pix.status,
          });
        }

        return Response.json({
          ok: true,
          confirmado: true,
          txid,
          pix,
        });
      },
    },
  },
});
