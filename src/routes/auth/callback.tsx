import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: CallbackPage,

  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;

    const code = new URLSearchParams(location.search).get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[OAuth Callback]", error);
        throw redirect({ to: "/login" });
      }
    }

    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      throw redirect({ to: "/login" });
    }

    throw redirect({ to: "/dashboard" });
  },
});

function CallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Conectando sua conta...</p>
    </div>
  );
}
