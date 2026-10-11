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

          const vercelToken = process.env.VERCEL_TOKEN?.trim();

          if (!supabaseUrl || !supabaseKey || !vercelToken) {
            return Response.json(
              {
                error:
                  "Configuração ausente: confira as variáveis Supabase e VERCEL_TOKEN no ambiente Preview.",
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

          // Cria um Preview diretamente na Vercel.
          // Não modifica main nem qualquer referência do GitHub.
          const deployResponse = await fetch(
            `https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: "auri-ia-vercel-fix-real",
                project: PROJECT_ID,
                target: "preview",
                gitSource: {
                  type: "github",
                  org: "nexus989mn-svg",
                  repo: "Nexus-ia",
                  ref: "develop",
                  sha,
                },
              }),
            },
          );

          const deployment = await deployResponse
            .json()
            .catch(() => ({}));

          if (!deployResponse.ok) {
            console.error("[publish-commit] Vercel API:", {
              status: deployResponse.status,
              error: deployment.error?.message,
            });

            throw new Error(
              deployment.error?.message ||
                `A Vercel recusou o deployment (HTTP ${deployResponse.status}).`,
            );
          }

          return Response.json({
            ok: true,
            message: "Deployment de Preview solicitado à Vercel.",
            commitSha: sha,
            deploymentId: deployment.id,
            deploymentUrl: deployment.url
              ? `https://${deployment.url}`
              : undefined,
            deploymentState: deployment.readyState || deployment.status,
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
