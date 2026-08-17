import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, FolderTree, Search, Sparkles, Send, Image as ImageIcon, Wand2, Upload, CheckCircle2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listCatalog,
  saveCategory,
  deleteCategory,
  saveProduct,
  deleteProduct,
  toggleProductActive,
} from "@/lib/catalog.functions";
import { catalogAgentChat } from "@/lib/catalog-agent.functions";
import { createCatalogDesignJob, createCatalogProductImageJob } from "@/lib/catalog-design.functions";
import { getMySubscription } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/catalog")({
  head: () => ({ meta: [{ title: "Catálogo — Assistente de Vendas WhatsApp" }] }),
  component: CatalogPage,
});

type Category = { id: string; name: string; description: string | null; sort_order: number; is_active: boolean };
type Product = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  stock: number | null;
  is_active: boolean;
};

function formatBRL(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function CatalogPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const qc = useQueryClient();
  const fetchSub = useServerFn(getMySubscription);
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["my-sub"],
    queryFn: () => fetchSub(),
    enabled: !!user,
  });

  const fetchCatalog = useServerFn(listCatalog);
  const { data, isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchCatalog(),
    enabled: !!user,
  });

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

  const categories: Category[] = data?.categories ?? [];
  const products: Product[] = data?.products ?? [];
  const hasAccess = !!subData?.hasAccess;
  const refresh = () => qc.invalidateQueries({ queryKey: ["catalog"] });
  const createDesignJob = useServerFn(createCatalogDesignJob);
  const [designOpen, setDesignOpen] = useState(false);
  const [designBrief, setDesignBrief] = useState("");
  const [designRefs, setDesignRefs] = useState("");
  const [designing, setDesigning] = useState(false);

  if (user && !subLoading && !isAdmin && !hasAccess) {
    return (
      <AppShell isAdmin={isAdmin}>
        <div className="max-w-2xl mx-auto mt-10 rounded-3xl border border-border bg-card-glass p-6 md:p-8 text-center">
          <Package className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-2xl font-bold mt-4">Catálogo bloqueado</h1>
          <p className="text-muted-foreground mt-2">Ative o Trial ou um plano pago para liberar o catálogo e o assistente de criação de produtos.</p>
          <Link to="/billing"><Button className="mt-5 bg-gradient-primary">Ver planos</Button></Link>
        </div>
      </AppShell>
    );
  }


  return (
    <AppShell isAdmin={isAdmin}>
      <div className="mb-6 rounded-3xl border border-border bg-card-glass p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Catálogo</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie categorias e produtos. O atendimento usa este catálogo para responder seus clientes.
          </p>
        </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={() => setDesignOpen(true)} disabled={!products.length}>
              <Sparkles className="h-4 w-4 mr-2" /> Criar catálogo profissional
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-full border border-border px-3 py-1.5 bg-background/40">
              <Package className="h-4 w-4" /> {products.length} produtos · {categories.length} categorias
            </div>
          </div>
        </div>
      </div>

      <CatalogAIAgent categories={categories} products={products} onSaved={refresh} />

      <Dialog open={designOpen} onOpenChange={setDesignOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar catálogo profissional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Como você quer o catálogo?</Label>
              <Textarea
                value={designBrief}
                onChange={(e) => setDesignBrief(e.target.value)}
                rows={6}
                placeholder="Ex.: catálogo premium para WhatsApp, preto e dourado, 10 páginas, capa, categorias, produtos, combos e contato."
              />
            </div>
            <div>
              <Label>Referências (opcional)</Label>
              <Textarea
                value={designRefs}
                onChange={(e) => setDesignRefs(e.target.value)}
                rows={4}
                placeholder="Cole uma URL por linha de sites, imagens ou referências visuais."
              />
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              O pedido usa os produtos e categorias já cadastrados. A criação visual será processada internamente e entregue pelo fluxo de catálogo/Canva.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesignOpen(false)}>Cancelar</Button>
            <Button disabled={designing} onClick={async () => {
              setDesigning(true);
              try {
                const references = designRefs.split(/\n+/).map((v) => v.trim()).filter(Boolean).filter((v) => /^https?:\/\//i.test(v));
                const result = await createDesignJob({ data: { brief: designBrief, references } });
                toast.success(`Pedido de catálogo criado (${result.job.id.slice(0, 8)})`);
                setDesignOpen(false);
                setDesignBrief("");
                setDesignRefs("");
              } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível iniciar o catálogo"); }
              finally { setDesigning(false); }
            }}>{designing ? "Preparando…" : "Criar catálogo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="products"><Package className="h-4 w-4 mr-2" />Produtos</TabsTrigger>
          <TabsTrigger value="categories"><FolderTree className="h-4 w-4 mr-2" />Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <ProductsTab products={products} categories={categories} isLoading={isLoading} onChange={refresh} />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <CategoriesTab categories={categories} onChange={refresh} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ---------------- AI Catalog Agent ---------------- */
function CatalogAIAgent({ categories, products, onSaved }: { categories: Category[]; products: Product[]; onSaved: () => void }) {
  const { user } = useAuth();
  const runAgent = useServerFn(catalogAgentChat);
  const createImageJob = useServerFn(createCatalogProductImageJob);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Vamos criar seu produto. Me diga o nome e o que você quer cadastrar. Depois eu vou perguntar só o que estiver faltando." },
  ]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageMode, setImageMode] = useState<"original" | "reference" | "generate">("original");

  const uploadImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("catalog-assets").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("catalog-assets").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Imagem adicionada ao produto");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha no upload"); }
    finally { setUploading(false); }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const result = await runAgent({ data: { messages: next, imageUrl } });
      setMessages((m) => [...m, { role: "assistant", content: result.reply }]);
      if (result.draft) setDraft(result.draft);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha no Agente de Catálogo";
      setMessages((m) => [...m, { role: "assistant", content: `Não consegui processar agora: ${message}` }]);
      toast.error(message);
    }
    finally { setSending(false); }
  };

  const saveDraft = async () => {
    if (!draft?.name) return;
    try {
      const categoryName = String(draft.category || "").trim().toLowerCase();
      const category = categories.find((c) => c.name.toLowerCase() === categoryName);
      let categoryId = category?.id ?? null;
      if (!categoryId && draft.category) {
        await saveCategory({ data: { name: String(draft.category), description: null, sort_order: categories.length, is_active: true } });
        const { data: createdCategory } = await supabase.from("catalog_categories").select("id").eq("name", String(draft.category)).maybeSingle();
        categoryId = createdCategory?.id ?? null;
        onSaved();
      }
      const price = Number(draft.price_cents ?? 0);
      await saveProduct({ data: { name: String(draft.name), description: draft.description || null, sku: draft.sku || null, category_id: categoryId, price_cents: Number.isFinite(price) ? Math.max(0, Math.round(price)) : 0, currency: "BRL", image_url: imageUrl || draft.image_url || null, stock: draft.stock == null ? null : Number(draft.stock), is_active: true } });
      toast.success("Produto criado no catálogo");
      setDraft(null);
      setMessages((m) => [...m, { role: "assistant", content: "Pronto. O produto foi salvo no catálogo. Se quiser, podemos criar o próximo." }]);
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao salvar produto"); }
  };

  return (
    <section className="mb-5 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card-glass to-background overflow-hidden shadow-sm">
      <div className="p-5 md:p-6 flex items-start justify-between gap-4">
        <div className="flex gap-3 min-w-0">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div>
          <div><div className="text-xs uppercase tracking-widest text-primary font-semibold">Assistente de catálogo</div><h2 className="text-lg md:text-xl font-bold mt-1">Crie produtos conversando com o assistente</h2><p className="text-sm text-muted-foreground mt-1">Converse, envie sua própria foto ou peça uma nova. A IA Designer trabalha internamente quando você escolher gerar.</p></div>
        </div>
        <Button onClick={() => setOpen((v) => !v)} className="shrink-0 bg-gradient-primary"><Wand2 className="h-4 w-4 mr-2" />{open ? "Fechar" : "Criar com IA"}</Button>
      </div>
      {open && (
        <div className="border-t border-primary/15 p-4 md:p-6 grid lg:grid-cols-[1fr_300px] gap-4">
          <div className="rounded-2xl border border-border bg-background/45 overflow-hidden">
            <div className="h-[330px] md:h-[390px] overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>{m.content}</div></div>)}
              {sending && <div className="text-xs text-muted-foreground">Preparando…</div>}
            </div>
            <div className="p-3 border-t border-border space-y-2">
              <div className="flex items-center gap-2">
                <label className="h-9 px-3 rounded-lg border border-border inline-flex items-center gap-2 text-xs cursor-pointer hover:bg-accent"><Upload className="h-4 w-4" />{uploading ? "Enviando…" : "Foto"}<input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} /></label>
                {imageUrl && <span className="text-xs text-primary flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Imagem anexada</span>}
              </div>
              <div className="flex gap-2"><Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ex.: quero cadastrar um X-Burger por R$ 29,90…" /><Button size="icon" onClick={send} disabled={!input.trim() || sending}><Send className="h-4 w-4" /></Button></div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background/45 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold"><ImageIcon className="h-4 w-4 text-primary" /> Imagem do produto</div>
            <p className="text-xs text-muted-foreground">Envie uma foto e escolha na conversa se quer usar a original, usar como referência ou gerar uma nova imagem.</p>
            {imageUrl ? (
              <div className="space-y-2">
                <img src={imageUrl} alt="Foto do produto" className="w-full aspect-square object-cover rounded-xl border border-border" />
                <label className="w-full h-10 rounded-xl border border-border inline-flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-accent">
                  <Upload className="h-4 w-4" /> Trocar foto
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} />
                </label>
              </div>
            ) : (
              <label className="aspect-square rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center text-center text-sm text-muted-foreground cursor-pointer hover:bg-primary/10 transition-colors">
                <Upload className="h-9 w-9 mb-2 text-primary" />
                <span className="font-medium text-foreground">Adicionar foto do produto</span>
                <span className="text-xs mt-1">Toque aqui para escolher da galeria ou câmera</span>
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} />
              </label>
            )}
            <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imagem deste produto</div>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" size="sm" variant={imageMode === "original" ? "default" : "outline"} onClick={() => setImageMode("original")}>Usar foto</Button>
                <Button type="button" size="sm" variant={imageMode === "reference" ? "default" : "outline"} onClick={() => setImageMode("reference")} disabled={!imageUrl}>Referência</Button>
                <Button type="button" size="sm" variant={imageMode === "generate" ? "default" : "outline"} onClick={() => setImageMode("generate")} disabled={!draft?.name}>Gerar nova</Button>
              </div>
              {imageMode === "generate" && (
                <Button type="button" className="w-full" disabled={imageGenerating || !draft?.name} onClick={async () => {
                  setImageGenerating(true);
                  try {
                    const result = await createImageJob({ data: { productName: String(draft.name), productDescription: String(draft.description || ""), styleBrief: "Imagem profissional de produto para catálogo comercial, fundo limpo, iluminação de estúdio, aparência realista e apresentação premium.", referenceImageUrl: imageUrl, referenceUrls: [] } });
                    toast.success(`Imagem enviada para a IA Designer (${result.job.id.slice(0, 8)})`);
                    setMessages((m) => [...m, { role: "assistant", content: "Enviei a imagem para a IA Designer interna. Ela vai produzir a imagem e devolver o resultado para este produto." }]);
                  } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível enviar para a IA Designer"); }
                  finally { setImageGenerating(false); }
                }}>
                  <Wand2 className="h-4 w-4 mr-2" />{imageGenerating ? "Enviando para Designer…" : "Gerar imagem com IA Designer"}
                </Button>
              )}
            </div>
            {draft && <div className="rounded-xl border border-primary/20 bg-primary/5 p-3"><div className="text-xs uppercase tracking-widest text-primary">Prévia pronta</div><div className="font-semibold mt-1">{draft.name}</div><div className="text-sm text-primary mt-1">R$ {(Number(draft.price_cents || 0) / 100).toFixed(2).replace(".", ",")}</div><p className="text-xs text-muted-foreground mt-1 line-clamp-3">{draft.description}</p><Button className="w-full mt-3" onClick={saveDraft}>Salvar produto</Button></div>}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- Categories ---------------- */

function CategoriesTab({ categories, onChange }: { categories: Category[]; onChange: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card-glass p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Categorias</h2>
        <CategoryDialog onSaved={onChange} />
      </div>

      {categories.length === 0 ? (
        <EmptyState text="Nenhuma categoria criada ainda." />
      ) : (
        <div className="space-y-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{c.name}</div>
                {c.description && <div className="text-xs text-muted-foreground truncate">{c.description}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    c.is_active
                      ? "bg-success/15 text-success border-success/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {c.is_active ? "Ativa" : "Inativa"}
                </span>
                <CategoryDialog category={c} onSaved={onChange} />
                <DeleteButton
                  label="Remover categoria"
                  onConfirm={async () => {
                    await deleteCategory({ data: { id: c.id } });
                    toast.success("Categoria removida");
                    onChange();
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryDialog({ category, onSaved }: { category?: Category; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: category?.name ?? "",
    description: category?.description ?? "",
    sort_order: category?.sort_order ?? 0,
    is_active: category?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await saveCategory({
        data: {
          id: category?.id,
          name: form.name,
          description: form.description || null,
          sort_order: Number(form.sort_order) || 0,
          is_active: form.is_active,
        },
      });
      toast.success(category ? "Categoria atualizada" : "Categoria criada");
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button variant="ghost" size="icon" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm" className="bg-gradient-primary"><Plus className="h-4 w-4" />Nova categoria</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                id="cat-active"
              />
              <Label htmlFor="cat-active">Ativa</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !form.name.trim()} className="bg-gradient-primary">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Products ---------------- */

function ProductsTab({
  products,
  categories,
  isLoading,
  onChange,
}: {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  onChange: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = products.filter((p) => {
    const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.sku ?? "").includes(query);
    const matchC = filter === "all" || p.category_id === filter;
    return matchQ && matchC;
  });

  return (
    <div className="rounded-2xl border border-border bg-card-glass p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ProductDialog categories={categories} onSaved={onChange} />
      </div>

      {isLoading ? (
        <EmptyState text="Carregando…" />
      ) : filtered.length === 0 ? (
        <EmptyState text="Nenhum produto encontrado." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              categoryName={categories.find((c) => c.id === p.category_id)?.name}
              categories={categories}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  categoryName,
  categories,
  onChange,
}: {
  product: Product;
  categoryName?: string;
  categories: Category[];
  onChange: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4 flex flex-col hover:border-primary/30 hover:bg-background/70 transition-all shadow-sm">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-32 object-cover rounded-lg mb-3 bg-muted"
        />
      ) : (
        <div className="w-full h-32 rounded-lg mb-3 bg-muted flex items-center justify-center">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold truncate">{product.name}</h3>
          <Switch
            checked={product.is_active}
            onCheckedChange={async (v) => {
              await toggleProductActive({ data: { id: product.id, is_active: v } });
              onChange();
            }}
          />
        </div>
        {categoryName && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{categoryName}</div>}
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <div className="text-lg font-bold text-primary">{formatBRL(product.price_cents, product.currency)}</div>
          {product.stock != null && (
            <div className="text-[11px] text-muted-foreground">Estoque: {product.stock}</div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-2">
        <ProductDialog product={product} categories={categories} onSaved={onChange} />
        <DeleteButton
          label="Remover produto"
          onConfirm={async () => {
            await deleteProduct({ data: { id: product.id } });
            toast.success("Produto removido");
            onChange();
          }}
        />
      </div>
    </div>
  );
}

function ProductDialog({
  product,
  categories,
  onSaved,
}: {
  product?: Product;
  categories: Category[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    sku: product?.sku ?? "",
    category_id: product?.category_id ?? "",
    price: ((product?.price_cents ?? 0) / 100).toString(),
    currency: product?.currency ?? "BRL",
    image_url: product?.image_url ?? "",
    stock: product?.stock?.toString() ?? "",
    is_active: product?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const priceCents = Math.round(parseFloat(form.price.replace(",", ".")) * 100);
      await saveProduct({
        data: {
          id: product?.id,
          name: form.name,
          description: form.description || null,
          sku: form.sku || null,
          category_id: form.category_id || null,
          price_cents: isFinite(priceCents) ? priceCents : 0,
          currency: form.currency || "BRL",
          image_url: form.image_url || null,
          stock: form.stock === "" ? null : Number(form.stock),
          is_active: form.is_active,
        },
      });
      toast.success(product ? "Produto atualizado" : "Produto criado");
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button variant="ghost" size="icon" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button className="bg-gradient-primary"><Plus className="h-4 w-4" />Novo produto</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço</Label>
              <Input
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Moeda</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL — Real</SelectItem>
                  <SelectItem value="USD">USD — Dólar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>SKU</Label>
              <Input value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Estoque</Label>
              <Input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="Ilimitado"
              />
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category_id || "__none"} onValueChange={(v) => setForm({ ...form, category_id: v === "__none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem categoria</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>URL da imagem</Label>
            <Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} id="prod-active" />
            <Label htmlFor="prod-active">Produto ativo (visível para a IA)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !form.name.trim()} className="bg-gradient-primary">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- helpers ---------------- */

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
      {text}
    </div>
  );
}

function DeleteButton({ label, onConfirm }: { label: string; onConfirm: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      disabled={loading}
      onClick={async () => {
        if (!confirm("Tem certeza?")) return;
        setLoading(true);
        try { await onConfirm(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
        finally { setLoading(false); }
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
