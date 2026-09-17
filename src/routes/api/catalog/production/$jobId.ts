import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/catalog/production/$jobId")({
  server: {
    middleware: [requireSupabaseAuth],
    handlers: {
      GET: async ({ params, context }) => {
        const jobId = z.string().uuid().parse(params.jobId);
        const { userId } = context;

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
