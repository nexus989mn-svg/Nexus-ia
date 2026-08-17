import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/language-switcher";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Assistente IA de Vendas WhatsApp" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    router.navigate({ to: "/dashboard" });
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/dashboard",
      },
    });

    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
      <div className="w-full max-w-md bg-card-glass border border-border rounded-2xl p-6 md:p-8 shadow-elegant">
        <Link to="/" className="flex items-center gap-2 font-display font-bold mb-6">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <MessageCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          {t("nav.brand")}
        </Link>
        <h1 className="text-2xl font-bold">{t("auth.welcomeBack")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("auth.signInDesc")}</p>

        <Button onClick={google} variant="outline" className="w-full mt-6 h-11">{t("common.continueWithGoogle")}</Button>
        <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground"><div className="flex-1 h-px bg-border" />{t("common.or")}<div className="flex-1 h-px bg-border" /></div>

        <form onSubmit={submit} className="space-y-3">
          <div><Label>{t("common.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" /></div>
          <div><Label>{t("common.password")}</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" /></div>
          <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-primary shadow-glow">{loading ? t("auth.signingIn") : t("common.signIn")}</Button>
        </form>
        <p className="mt-4 text-sm text-center text-muted-foreground">
          {t("auth.noAccount")} <Link to="/signup" className="text-primary hover:underline">{t("auth.createOne")}</Link>
        </p>
      </div>
    </div>
  );
}
