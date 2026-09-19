import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";


export const Route = createFileRoute("/api/catalog/production/$jobId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const request = getRequest();
        const authHeader = request?.headers.get("authorization");

        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(
            JSON.stringify({ ok: false, error: "Não autenticado." }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const token = authHeader.slice(7);
        const supabaseUrl =
          process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey =
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "Configuração do Supabase ausente.",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const authClient = createClient(supabaseUrl, supabaseKey);

        const {
          data: { user },
          error: authError,
        } = await authClient.auth.getUser(token);

        if (authError || !user) {
          return new Response(
            JSON.stringify({ ok: false, error: "Não autenticado." }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const jobId = z.string().uuid().parse(params.jobId);
        const userId = user.id;

        const { data: company, error: companyError } =
          await supabaseAdmin
            .from("companies")
            .select("id")
            .eq("owner_user_id", userId)
            .maybeSingle();

        if (companyError || !company) {
          return new Response(
            JSON.stringify({ ok: false, error: "Empresa não encontrada." }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const { data: job, error } = await supabaseAdmin
          .from("agent_execution_jobs")
          .select(
            "id, company_id, job_type, status, payload, result, error_message, created_at, started_at, completed_at, updated_at",
          )
          .eq("id", jobId)
          .eq("company_id", company.id)
          .maybeSingle();

        if (error) {
          return new Response(
            JSON.stringify({ ok: false, error: "Não foi possível consultar a produção." }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (!job) {
          return new Response(
            JSON.stringify({ ok: false, error: "Produção não encontrada." }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            job,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        );
      },
    },
  },
});
