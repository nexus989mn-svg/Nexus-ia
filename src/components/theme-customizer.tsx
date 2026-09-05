import { useEffect, useRef, useState } from "react";
import { ImagePlus, Palette, RotateCcw, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type ThemePreset = { id: string; label: string; primary: string; secondary: string; background: string; card: string; accent: string };

const PRESETS: ThemePreset[] = [
  { id: "auri", label: "Auri", primary: "#22c55e", secondary: "#16a34a", background: "#0b0f0c", card: "#1a1f1c", accent: "#173b27" },
  { id: "blue", label: "Azul", primary: "#3b82f6", secondary: "#2563eb", background: "#080d16", card: "#111827", accent: "#172b4d" },
  { id: "purple", label: "Roxo", primary: "#a855f7", secondary: "#7e22ce", background: "#0e0915", card: "#1b1225", accent: "#32184a" },
  { id: "orange", label: "Laranja", primary: "#f97316", secondary: "#ea580c", background: "#140b06", card: "#24150d", accent: "#4a2412" },
  { id: "pink", label: "Rosa", primary: "#ec4899", secondary: "#db2777", background: "#150910", card: "#25111d", accent: "#4b1733" },
];

const DB_NAME = "auri-theme-db";
const STORE_NAME = "assets";
const IMAGE_KEY_PREFIX = "background:";
const DB_VERSION = 2;

// Estado compartilhado entre todas as instâncias do ThemeCustomizer.
// O AppShell possui uma instância mobile e outra desktop; ambas precisam
// enxergar exatamente o mesmo fundo da conta atual.
let sharedUserId: string | null = null;
let sharedImage: string | null | undefined = undefined;
let sharedImagePromise: Promise<string | null> | null = null;

const BACKGROUND_EVENT = "auri-background-change";

function broadcastBackground(image: string | null) {
  window.dispatchEvent(
    new CustomEvent(BACKGROUND_EVENT, { detail: { image } })
  );
}

function setSharedBackground(userId: string, image: string | null) {
  sharedUserId = userId;
  sharedImage = image;
  sharedImagePromise = null;
  broadcastBackground(image);
}

async function getSharedBackground(userId: string): Promise<string | null> {
  if (sharedUserId === userId && sharedImage !== undefined) {
    return sharedImage;
  }

  if (
    sharedUserId === userId &&
    sharedImagePromise
  ) {
    return sharedImagePromise;
  }

  sharedUserId = userId;

  sharedImagePromise = loadImage(userId).then((saved) => {
    sharedImage = saved;
    sharedImagePromise = null;
    return saved;
  });

  return sharedImagePromise;
}

function openThemeDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveImage(image: Blob | string, userId: string) {
  const db = await openThemeDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(image, `${IMAGE_KEY_PREFIX}${userId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Falha ao salvar a imagem"));
  });
  db.close();
}

async function loadImage(userId: string): Promise<string | null> {
  try {
    const db = await openThemeDb();
    const stored = await new Promise<Blob | string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(`${IMAGE_KEY_PREFIX}${userId}`);
      request.onsuccess = () => resolve((request.result as Blob | string | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();

    if (!stored) return null;
    if (typeof stored === "string") return stored;
    if (stored instanceof Blob) return URL.createObjectURL(stored);
    return null;
  } catch {
    return null;
  }
}

async function removeImage(userId: string) {
  try {
    const db = await openThemeDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(`${IMAGE_KEY_PREFIX}${userId}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Falha ao remover a imagem"));
    });
    db.close();
  } catch {}
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function mix(a: string, b: string, amount: number) {
  const x = hexToRgb(a), y = hexToRgb(b);
  const m = (k: keyof typeof x) => Math.round(x[k] + (y[k] - x[k]) * amount);
  return `rgb(${m("r")}, ${m("g")}, ${m("b")})`;
}


function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) +
    Math.pow(a.g - b.g, 2) +
    Math.pow(a.b - b.b, 2)
  );
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function isUsefulColor(r: number, g: number, b: number) {
  const { s, l } = rgbToHsl(r, g, b);

  // Ignora branco, preto e cinzas quase neutros.
  if (l < 8 || l > 94) return false;
  if (s < 12) return false;

  return true;
}

async function extractImagePalette(
  image: string
): Promise<{ primary: string; secondary: string; accent: string } | null> {
  return new Promise(resolve => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          resolve(null);
          return;
        }

        // Amostragem pequena para funcionar bem também no celular.
        const maxSize = 120;
        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));

        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        const colors: Array<{ r: number; g: number; b: number; count: number }> = [];

        // Amostra pixels espaçados para reduzir custo.
        for (let i = 0; i < pixels.length; i += 16) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          if (a < 180 || !isUsefulColor(r, g, b)) continue;

          let found = false;

          for (const color of colors) {
            if (colorDistance(color, { r, g, b }) < 42) {
              color.count++;
              color.r = Math.round((color.r * (color.count - 1) + r) / color.count);
              color.g = Math.round((color.g * (color.count - 1) + g) / color.count);
              color.b = Math.round((color.b * (color.count - 1) + b) / color.count);
              found = true;
              break;
            }
          }

          if (!found) {
            colors.push({ r, g, b, count: 1 });
          }
        }

        colors.sort((a, b) => b.count - a.count);

        if (!colors.length) {
          resolve(null);
          return;
        }

        const primary = colors[0];

        const secondary =
          colors.find(c => colorDistance(c, primary) > 65) ??
          colors[Math.min(1, colors.length - 1)] ??
          primary;

        const accent =
          colors.find(c =>
            colorDistance(c, primary) > 90 &&
            colorDistance(c, secondary) > 45
          ) ??
          secondary;

        resolve({
          primary: rgbToHex(primary.r, primary.g, primary.b),
          secondary: rgbToHex(secondary.r, secondary.g, secondary.b),
          accent: rgbToHex(accent.r, accent.g, accent.b),
        });
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = image;
  });
}

function createImageTheme(
  palette: { primary: string; secondary: string; accent: string }
): ThemePreset {
  const primaryLum = luminance(palette.primary);

  // Mantém a interface escura e adapta os elementos à imagem.
  const background = "#090b0a";

  const card = mix(
    background,
    palette.primary,
    0.16
  );

  const secondary = mix(
    palette.secondary,
    palette.primary,
    0.35
  );

  const accent = mix(
    palette.accent,
    palette.primary,
    0.45
  );

  return {
    id: "image",
    label: "Minha imagem",
    primary: palette.primary,
    secondary,
    background,
    card,
    accent,
  };
}

function applyTheme(theme: ThemePreset, image?: string | null) {
  const root = document.documentElement;
  const dark = luminance(theme.background) < 0.45;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-glow", theme.secondary);
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--card", theme.card);
  root.style.setProperty("--popover", theme.card);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--ring", theme.primary);
  root.style.setProperty("--success", theme.primary);
  root.style.setProperty("--secondary", mix(theme.card, theme.background, 0.25));
  root.style.setProperty("--muted", mix(theme.card, theme.background, 0.5));
  root.style.setProperty("--foreground", dark ? "#f8fafc" : "#111827");
  root.style.setProperty("--card-foreground", dark ? "#f8fafc" : "#111827");
  root.style.setProperty("--popover-foreground", dark ? "#f8fafc" : "#111827");
  root.style.setProperty("--primary-foreground", luminance(theme.primary) > 0.48 ? "#0b0f0c" : "#ffffff");
  root.style.setProperty("--accent-foreground", dark ? "#ffffff" : "#111827");
  root.style.setProperty("--sidebar", dark ? mix(theme.background, "#000000", 0.28) : mix(theme.background, "#ffffff", 0.08));
  root.style.setProperty("--sidebar-foreground", dark ? "#e5e7eb" : "#1f2937");
  root.style.setProperty("--gradient-primary", `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`);
  root.style.setProperty("--gradient-hero", `radial-gradient(80% 60% at 50% 0%, ${theme.primary}55 0%, transparent 70%), linear-gradient(180deg, ${theme.background} 0%, ${mix(theme.background, "#000000", 0.12)} 100%)`);
  root.style.setProperty("--gradient-card", `linear-gradient(160deg, ${theme.card}ee, ${theme.background}cc)`);

  document.body.style.backgroundImage = image
    ? `linear-gradient(rgba(0,0,0,.28), rgba(0,0,0,.52)), url(${JSON.stringify(image)})`
    : "";
  document.body.style.backgroundSize = image ? "cover" : "";
  document.body.style.backgroundPosition = image ? "center center" : "";
  document.body.style.backgroundAttachment = image ? "fixed" : "";
  document.body.style.backgroundRepeat = image ? "no-repeat" : "";
  document.body.dataset.customTheme = image ? "image" : "preset";
}

function saveTheme(theme: ThemePreset) {
  try { localStorage.setItem("auri-theme", JSON.stringify({ theme })); } catch {}
}

function readSavedTheme(): ThemePreset {
  try {
    const raw = localStorage.getItem("auri-theme");
    if (raw) {
      const parsed = JSON.parse(raw);
      const preset = PRESETS.find(p => p.id === parsed.theme?.id) ?? PRESETS[0];
      return { ...preset, ...parsed.theme };
    }
  } catch {}
  return PRESETS[0];
}

export function ThemeCustomizer({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemePreset>(readSavedTheme);
  const [image, setImage] = useState<string | null | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;

    const handleBackgroundChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ image: string | null }>;
      const nextImage = customEvent.detail?.image ?? null;

      if (!alive) return;

      imageUrlRef.current = nextImage;
      setImage(nextImage);
    };

    window.addEventListener(
      BACKGROUND_EVENT,
      handleBackgroundChange
    );

    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId || !alive) return;

      getSharedBackground(userId).then(saved => {
        if (!alive) {
          if (saved?.startsWith("blob:")) {
            URL.revokeObjectURL(saved);
          }
          return;
        }

        imageUrlRef.current = saved;
        setImage(saved);
      });
    });

    return () => {
      alive = false;
      window.removeEventListener(
        BACKGROUND_EVENT,
        handleBackgroundChange
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imageUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(imageUrlRef.current);
    };
  }, []);

  useEffect(() => {
    // undefined = ainda carregando. Não apagar um fundo já aplicado
    // enquanto a imagem persistida da conta ainda está sendo recuperada.
    if (image !== undefined) {
      applyTheme(theme, image);
    }
  }, [theme, image]);

  const choosePreset = async (preset: ThemePreset) => {
    setTheme(preset);
    if (imageUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(imageUrlRef.current);
    imageUrlRef.current = null;
    setSharedBackground(
      (await supabase.auth.getUser()).data.user?.id ?? "",
      null
    );
    setImage(null);
    saveTheme(preset);

    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await removeImage(data.user.id);
    }
  };

  const onImage = async (file: File) => {
    // No Android/Google Fotos alguns arquivos chegam com MIME vazio.
    // Aceitamos também extensões conhecidas para não descartar a seleção.
    const type = file.type || "";
    const looksLikeImage =
      type.startsWith("image/") ||
      /\.(avif|gif|heic|heif|jpeg|jpg|png|webp)$/i.test(file.name);

    if (!looksLikeImage || file.size === 0) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    imageUrlRef.current = previewUrl;

    // Compartilha imediatamente o fundo entre as instâncias mobile/desktop.
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      URL.revokeObjectURL(previewUrl);
      return;
    }

    setSharedBackground(userId, previewUrl);

    // A imagem continua sendo o fundo.
    setImage(previewUrl);

    // Extrai automaticamente a paleta da própria imagem.
    const palette = await extractImagePalette(previewUrl);

    if (palette) {
      const imageTheme = createImageTheme(palette);
      setTheme(imageTheme);
      saveTheme(imageTheme);
    } else {
      setTheme((current) => ({
        ...current,
        id: "image",
        label: "Minha imagem",
      }));
    }

    // Salva o próprio Blob no IndexedDB.
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await saveImage(file, data.user.id);
      }
    } catch {
      // A prévia continua funcionando mesmo se o armazenamento local falhar.
    }
  };

  return (
    <>
      <input
        id="auri-theme-image-upload"
        ref={fileInputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onImage(file);
          event.currentTarget.value = "";
        }}
      />
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className="gap-2" aria-label="Personalizar aparência">
          <Palette className="h-4 w-4" />
          {!compact && <span className="text-xs">Aparência</span>}
          <span className="sr-only">Personalizar aparência</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Paleta de cores</div>
        {PRESETS.map(p => (
          <DropdownMenuItem key={p.id} onClick={() => choosePreset(p)} className="gap-2">
            <span className="h-4 w-4 rounded-full border" style={{ background: p.primary }} />
            {p.label}
            {theme.id === p.id && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <label htmlFor="auri-theme-image-upload">
            <ImagePlus className="h-4 w-4" />
            Usar minha imagem
          </label>
        </DropdownMenuItem>
        {image && (
          <DropdownMenuItem onClick={() => choosePreset(PRESETS[0])}>
            <RotateCcw className="h-4 w-4" />
            Voltar à paleta Auri
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
