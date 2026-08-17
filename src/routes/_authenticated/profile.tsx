import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { getMyProfile, updateMyProfile } from "@/lib/company.functions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User as UserIcon, KeyRound, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Meu perfil — Assistente IA de Vendas" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = useServerFn(getMyProfile);
  const save = useServerFn(updateMyProfile);

  const { data } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [pwd, setPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setName(data.profile.full_name ?? "");
      setCompany(data.profile.company ?? "");
    }
  }, [data]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({ data: { full_name: name, company: company || null } });
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async () => {
    if (pwd.length < 8) {
      toast.error("Senha precisa de ao menos 8 caracteres");
      return;
    }
    setChangingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setChangingPwd(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Senha alterada");
      setPwd("");
    }
  };

  return (
    <AppShell isAdmin={isAdmin}>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
          <UserIcon className="h-4 w-4" /> Meu perfil
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Dados pessoais</h1>
        <p className="text-sm text-muted-foreground mt-1">Atualize seu nome e senha de acesso.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        <section className="rounded-2xl border border-border bg-card-glass p-5 md:p-6">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" /> Identificação
          </h2>
          <div className="mt-4 space-y-3">
            <div>
              <Label>E-mail</Label>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground rounded-md border border-border bg-background/60 px-3 py-2">
                <Mail className="h-4 w-4" /> {user?.email}
              </div>
            </div>
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="company">Empresa (legado)</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">
                Esses dados serão migrados para a aba <strong>Empresa</strong>.
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Salvando…" : "Salvar perfil"}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card-glass p-5 md:p-6">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Senha
          </h2>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="pwd">Nova senha</Label>
              <Input
                id="pwd"
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="mt-1"
              />
            </div>
            <Button onClick={handlePassword} disabled={changingPwd} className="w-full">
              {changingPwd ? "Alterando…" : "Alterar senha"}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
