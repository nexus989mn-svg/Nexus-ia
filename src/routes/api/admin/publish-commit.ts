import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const REPO = "nexus989mn-svg/Nexus-ia";
const PROJECT_ID = "prj_2dwX4rxmIrdhsSSioKQMOCzeasva";
const TEAM_ID = "team_AcHFtDvzKW6iDwwt9zEyhLCh";

export const Route = createFileRoute("/api/admin/publish-commit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const sessionToken = request.headers
            .get("authorization")
            ?.replace(/^Bearer\s+/i, "");

          if (!sessionToken) {
            return Response.json(
              { error: "Sessão obrigatória." },
              { status: 401 },
            );
          }

          const supabaseUrl =
            process.env.SUPABASE_URL ||
            process.env.VITE_SUPABASE_URL;

          const supabaseKey =
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          const githubToken = process.env.GITHUB_TOKEN?.trim();

          if (!supabaseUrl || !supabaseKey || !githubToken) {
            return Response.json(
              {
                error:
                  "Configuração ausente: confira as variáveis Supabase e GITHUB_TOKEN no ambiente Preview.",
              },
              { status: 500 },
            );
          }

          const authClient = createClient(supabaseUrl, supabaseKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });

          const { data, error: authError } =
            await authClient.auth.getClaims(sessionToken);

          const userId = data?.claims?.sub as string | undefined;

          if (authError || !userId) {
            return Response.json(
              { error: "Sessão inválida." },
              { status: 401 },
            );
          }

          const { data: role, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();

          if (roleError) {
            throw new Error("Não foi possível verificar a permissão de administrador.");
          }

          if (!role) {
            return Response.json(
              { error: "Apenas administradores podem publicar." },
              { status: 403 },
            );
          }

          const body = await request.json().catch(() => null);
          const sha =
            typeof body?.commitSha === "string"
              ? body.commitSha.trim()
              : "";

          if (!/^[0-9a-f]{40}$/i.test(sha)) {
            return Response.json(
              { error: "Selecione um commit válido." },
              { status: 400 },
            );
          }

          // Confirma que o commit pertence ao histórico de develop.
          const compareResponse = await fetch(
            `https://api.github.com/repos/${REPO}/compare/${sha}...develop`,
            {
              headers: {
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
              },
            },
          );

          const comparison = await compareResponse.json().catch(() => ({}));

          if (!compareResponse.ok) {
            throw new Error(
              `Não foi possível validar o commit no GitHub (HTTP ${compareResponse.status}).`,
            );
          }

          if (!["ahead", "identical"].includes(comparison.status)) {
            return Response.json(
              {
                error:
                  "O commit selecionado não pertence ao histórico atual de develop.",
              },
              { status: 409 },
            );
          }

          // Promove o commit aprovado de develop para main.
          // A Vercel fará o deploy de produção automaticamente.
          const mergeResponse = await fetch(
            `https://api.github.com/repos/${REPO}/merges`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
              },
              body: JSON.stringify({
                base: "main",
                head: sha,
                commit_message: "chore: promote approved develop commit to production",
              }),
            },
          );

          const merge = await mergeResponse.json().catch(() => ({}));

          if (mergeResponse.status === 409) {
            return Response.json(
              { error: "Conflito ao mesclar o commit na main." },
              { status: 409 },
            );
          }

          if (!mergeResponse.ok) {
            const detail =
              typeof merge.message === "string"
                ? merge.message
                : "sem mensagem";
            console.error("[publish-commit] GitHub merge recusado:", {
              status: mergeResponse.status,
              message: detail,
              documentation_url: merge.documentation_url,
            });
            throw new Error(
              `GitHub recusou a mesclagem (HTTP ${mergeResponse.status}): ${detail}`,
            );
          }

          return Response.json({
            ok: true,
            message: "Commit mesclado na main; a Vercel fará o deploy de produção.",
            commitSha: sha,
            mergeCommitSha: merge.sha ?? null,
            productionUrl: "https://www.tmwstudio.com.br",
          });
        } catch (error) {
          console.error("[publish-commit]", error);

          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Falha ao solicitar deployment à Vercel.",
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
