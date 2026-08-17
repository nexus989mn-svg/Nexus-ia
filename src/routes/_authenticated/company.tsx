import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { getMyCompany, updateMyCompany } from "@/lib/company.functions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({ meta: [{ title: "Empresa — Assistente IA de Vendas" }] }),
  component: CompanyPage,
});

const timezones = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Recife",
  "America/Fortaleza",
  "America/Cuiaba",
  "America/Porto_Velho",
  "America/Rio_Branco",
  "America/New_York",
  "Europe/Lisbon",
  "UTC",
];

function CompanyPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchCompany = useServerFn(getMyCompany);
  const save = useServerFn(updateMyCompany);

  const { data } = useQuery({
    queryKey: ["my-company"],
    queryFn: () => fetchCompany(),
    enabled: !!user,
  });

  const [form, setForm] = useState({
    name: "",
    document: "",
    phone: "",
    email: "",
    logo_url: "",
    timezone: "America/Sao_Paulo",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = data?.company;
    if (c) {
      setForm({
        name: c.name ?? "",
        document: c.document ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
        logo_url: c.logo_url ?? "",
        timezone: c.timezone ?? "America/Sao_Paulo",
      });
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
    if (!form.name.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          name: form.name.trim(),
          document: form.document.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          logo_url: form.logo_url.trim() || null,
          timezone: form.timezone,
          locale: "pt-BR",
        },
      });
      toast.success("Empresa atualizada");
      qc.invalidateQueries({ queryKey: ["my-company"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell isAdmin={isAdmin}>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
          <Building2 className="h-4 w-4" /> Minha empresa
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">{form.name || "Empresa sem nome"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dados utilizados pelo atendimento, catálogo e cobrança.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card-glass p-5 md:p-6">
          <h2 className="font-semibold text-lg">Dados da empresa</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Nome / Razão social</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="document">CNPJ / CPF</Label>
              <Input id="document" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="tz">Fuso horário</Label>
              <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                <SelectTrigger id="tz" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="logo">URL do logo</Label>
              <Input id="logo" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" className="mt-1" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary shadow-glow">
              {saving ? "Salvando…" : "Salvar empresa"}
            </Button>
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card-glass p-5 md:p-6">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" /> Identidade
          </h2>
          <div className="mt-4 aspect-square rounded-xl border border-dashed border-border bg-background/40 flex items-center justify-center overflow-hidden">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo da empresa" className="w-full h-full object-contain p-4" />
            ) : (
              <div className="text-sm text-muted-foreground">Sem logo</div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Dica: use uma imagem quadrada (512x512) hospedada em CDN pública. Em breve, upload direto.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
