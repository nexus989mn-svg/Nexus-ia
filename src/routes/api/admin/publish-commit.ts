import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const REPO = "nexus989mn-svg/Nexus-ia";
const API = `https://api.github.com/repos/${REPO}`;

export const Route = createFileRoute("/api/admin/publish-commit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = request.headers
            .get("authorization")
            ?.replace(/^Bearer\s+/i, "");

          if (!token) {
            return Response.json({ error: "Sessão obrigatória." }, { status: 401 });
          }

          const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const key =
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const githubToken = process.env.GITHUB_TOKEN?.trim();

          if (!url || !key || !githubToken) {
            return Response.json({
              error: "Servidor sem configuração Supabase ou GITHUB_TOKEN."
            }, { status: 500 });
          }

          const authClient = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data: claims, error: authError } =
            await authClient.auth.getClaims(token);

          const userId = claims?.claims?.sub as string | undefined;

          if (authError || !userId) {
            return Response.json({ error: "Sessão inválida." }, { status: 401 });
          }

          const { data: role } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();

          if (!role) {
            return Response.json({ error: "Apenas administradores podem publicar." }, { status: 403 });
          }

          const body = await request.json().catch(() => null);
          const sha = typeof body?.commitSha === "string"
            ? body.commitSha.trim()
            : "";

          if (!/^[0-9a-f]{40}$/i.test(sha)) {
            return Response.json({ error: "Selecione um commit válido." }, { status: 400 });
          }

          const gh = async (path: string, init: RequestInit = {}) => {
            const response = await fetch(`${API}${path}`, {
              ...init,
              headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${githubToken}`,
                "X-GitHub-Api-Version": "2022-11-28",
                ...(init.body ? { "Content-Type": "application/json" } : {}),
                ...init.headers,
              },
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(
                typeof data.message === "string"
                  ? data.message
                  : `GitHub respondeu HTTP ${response.status}.`
              );
            }
            return data;
          };

          // Confirma que o commit escolhido pertence ao histórico de develop.
          const inDevelop = await gh(
            `/compare/${sha}...develop`
          );

          if (!["ahead", "identical"].includes(inDevelop.status)) {
            return Response.json({
              error: "O commit selecionado não pertence ao histórico atual de develop."
            }, { status: 409 });
          }

          // Impede regressão ou atualização não linear de main.
          const comparison = await gh(`/compare/main...${sha}`);

          if (comparison.status === "identical") {
            return Response.json({
              ok: true,
              message: "Esse commit já está em produção.",
              commitSha: sha,
              alreadyPublished: true,
            });
          }

          if (comparison.status !== "ahead" || !(comparison.ahead_by > 0)) {
            return Response.json({
              error: "Esse commit não é um avanço linear de main. Nenhuma publicação foi feita."
            }, { status: 409 });
          }

          // Atualiza main sem force push. GitHub rejeita atualizações não fast-forward.
          await gh("/git/refs/heads/main", {
            method: "PATCH",
            body: JSON.stringify({ sha, force: false }),
          });

          return Response.json({
            ok: true,
            message: "Commit promovido para main. A Vercel deverá iniciar o deploy conforme a configuração do projeto.",
            commitSha: sha,
          });
        } catch (error) {
          console.error("[publish-commit]", error);
          return Response.json({
            error: error instanceof Error
              ? error.message
              : "Falha ao publicar o commit."
          }, { status: 502 });
        }
      },
    },
  },
});
