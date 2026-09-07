import { useEffect, useRef, useState } from "react";
import { ImagePlus, Palette, RotateCcw, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type ThemePreset = { id: string; label: string; primary: string; secondary: string; background: string; card: string; accent: string };

const PRESETS: ThemePreset[] = [
  { id: "auri", label: "AURI", primary: "#8B5CF6", secondary: "#6D28D9", background: "#08060D", card: "#15101F", accent: "#2E1B4D" },

  { id: "purple", label: "Roxo", primary: "#A855F7", secondary: "#7E22CE", background: "#0E0915", card: "#1B1225", accent: "#32184A" },
  { id: "violet", label: "Violeta", primary: "#8B5CF6", secondary: "#6366F1", background: "#080812", card: "#141426", accent: "#28284F" },
  { id: "indigo", label: "Índigo", primary: "#6366F1", secondary: "#4F46E5", background: "#070912", card: "#11172A", accent: "#222D58" },
  { id: "blue", label: "Azul", primary: "#3B82F6", secondary: "#2563EB", background: "#080D16", card: "#111827", accent: "#172B4D" },
  { id: "cyan", label: "Ciano", primary: "#06B6D4", secondary: "#0891B2", background: "#061013", card: "#0E2025", accent: "#123D46" },
  { id: "teal", label: "Turquesa", primary: "#14B8A6", secondary: "#0D9488", background: "#06100F", card: "#10201E", accent: "#16433E" },

  { id: "green", label: "Verde", primary: "#22C55E", secondary: "#16A34A", background: "#080F0A", card: "#142019", accent: "#183F28" },
  { id: "lime", label: "Lima", primary: "#84CC16", secondary: "#65A30D", background: "#0B1006", card: "#18200D", accent: "#304514" },
  { id: "yellow", label: "Amarelo", primary: "#EAB308", secondary: "#CA8A04", background: "#110F06", card: "#211D0D", accent: "#493F12" },
  { id: "amber", label: "Âmbar", primary: "#F59E0B", secondary: "#D97706", background: "#120C05", card: "#24170B", accent: "#4A2D10" },
  { id: "orange", label: "Laranja", primary: "#F97316", secondary: "#EA580C", background: "#140B06", card: "#24150D", accent: "#4A2412" },
  { id: "red", label: "Vermelho", primary: "#EF4444", secondary: "#DC2626", background: "#120708", card: "#251013", accent: "#4B171C" },
  { id: "rose", label: "Rosa", primary: "#F43F5E", secondary: "#E11D48", background: "#14070A", card: "#261016", accent: "#4B1724" },
  { id: "pink", label: "Pink", primary: "#EC4899", secondary: "#DB2777", background: "#150910", card: "#25111D", accent: "#4B1733" },
  { id: "fuchsia", label: "Fúcsia", primary: "#D946EF", secondary: "#C026D3", background: "#120813", card: "#241025", accent: "#48194B" },

  { id: "sunset", label: "Sunset", primary: "#F97316", secondary: "#EC4899", background: "#11070B", card: "#241017", accent: "#4B1825" },
  { id: "fire", label: "Fire", primary: "#EF4444", secondary: "#F59E0B", background: "#120806", card: "#26140D", accent: "#4A2811" },
  { id: "ocean", label: "Ocean", primary: "#06B6D4", secondary: "#3B82F6", background: "#050B12", card: "#0E1927", accent: "#153B57" },
  { id: "sky", label: "Sky", primary: "#38BDF8", secondary: "#6366F1", background: "#070B14", card: "#11192A", accent: "#20345A" },
  { id: "aurora", label: "Aurora", primary: "#22C55E", secondary: "#8B5CF6", background: "#08090F", card: "#151522", accent: "#29304F" },
  { id: "electric", label: "Electric", primary: "#8B5CF6", secondary: "#06B6D4", background: "#07080F", card: "#121622", accent: "#26334A" },
  { id: "candy", label: "Candy", primary: "#EC4899", secondary: "#8B5CF6", background: "#100811", card: "#211225", accent: "#43204D" },
  { id: "forest", label: "Forest", primary: "#22C55E", secondary: "#14B8A6", background: "#060E0B", card: "#12201B", accent: "#174339" },
  { id: "royal", label: "Royal", primary: "#7C3AED", secondary: "#2563EB", background: "#080712", card: "#151329", accent: "#292A57" },
  { id: "grape", label: "Grape", primary: "#A855F7", secondary: "#EC4899", background: "#100811", card: "#211225", accent: "#47204A" },
  { id: "tropical", label: "Tropical", primary: "#14B8A6", secondary: "#84CC16", background: "#07100C", card: "#132016", accent: "#28451C" },
  { id: "neon", label: "Neon", primary: "#D946EF", secondary: "#22D3EE", background: "#07070D", card: "#151522", accent: "#29334A" },
  { id: "midnight", label: "Midnight", primary: "#6366F1", secondary: "#A855F7", background: "#05060D", card: "#101222", accent: "#25294A" },
  { id: "coffee", label: "Café", primary: "#D97706", secondary: "#92400E", background: "#100A06", card: "#21150E", accent: "#472611" },
  { id: "cherry", label: "Cereja", primary: "#E11D48", secondary: "#9333EA", background: "#10070C", card: "#21101A", accent: "#431D36" },
  { id: "lavender", label: "Lavanda", primary: "#C084FC", secondary: "#818CF8", background: "#0C0913", card: "#1C1628", accent: "#382A50" },
  { id: "mint", label: "Menta", primary: "#2DD4BF", secondary: "#22C55E", background: "#06100D", card: "#12201A", accent: "#194235" },
  { id: "gold", label: "Dourado", primary: "#FBBF24", secondary: "#F59E0B", background: "#100C05", card: "#21190B", accent: "#493712" },
  { id: "ice", label: "Gelo", primary: "#67E8F9", secondary: "#38BDF8", background: "#060B10", card: "#101C25", accent: "#194153" },
];


type CustomPalette = {
  id: string;
  label: string;
  colors: string[];
};

const CUSTOM_PALETTES_KEY = "auri-custom-palettes";

function userStorageKey(base: string, userId: string) {
  return `${base}:${userId}`;
}

/*
 * AURI COLOR ENGINE
 * ----------------------------------------------------------
 * Não existe limite artificial de cores.
 * O disco usa HSL contínuo e o usuário pode escolher
 * qualquer combinação e qualquer quantidade de cores.
 */

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return rgbToHex(
    (r + m) * 255,
    (g + m) * 255,
    (b + m) * 255
  );
}

function generatedColorWheel() {
  const colors: string[] = [];

  /*
   * 72 matizes x 5 níveis de saturação/luminosidade.
   * A seleção do disco continua sendo contínua,
   * então isso não limita as cores possíveis.
   */
  for (let h = 0; h < 360; h += 5) {
    colors.push(hslToHex(h, 100, 50));
  }

  return colors;
}

const AURI_COLOR_WHEEL = generatedColorWheel();

function generatedCombinations() {
  const result: Array<{ colors: string[]; label: string }> = [];

  /*
   * Gera uma grande variedade de combinações automaticamente.
   * Não limita as combinações criadas pelo usuário.
   */
  for (let h = 0; h < 360; h += 15) {
    const a = hslToHex(h, 82, 58);
    const complementary = hslToHex((h + 180) % 360, 78, 55);
    const analogous = hslToHex((h + 30) % 360, 78, 55);
    const triadic = hslToHex((h + 120) % 360, 78, 55);

    result.push({
      colors: [a, complementary],
      label: "Complementar",
    });

    result.push({
      colors: [a, analogous],
      label: "Análoga",
    });

    result.push({
      colors: [a, triadic],
      label: "Triádica",
    });
  }

  return result;
}

const AURI_GENERATED_COMBINATIONS = generatedCombinations();

function themeFromColors(colors: string[], label = "Combinação AURI"): ThemePreset {
  const safe = colors.filter(Boolean);

  const primary = safe[0] || "#8B5CF6";
  const secondary = safe[1] || primary;
  const accent = safe[2] || safe[1] || primary;

  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label,
    primary,
    secondary,
    background: "#08060D",
    card: mix("#08060D", primary, 0.16),
    accent,
  };
}


const COMBINATION_COLORS = [
  "#8B5CF6", "#A855F7", "#EC4899", "#F43F5E",
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#14B8A6", "#06B6D4",
  "#38BDF8", "#3B82F6", "#6366F1", "#7C3AED",
  "#D946EF", "#C084FC", "#2DD4BF", "#67E8F9",
  "#FFFFFF", "#E5E7EB", "#9CA3AF", "#374151",
  "#111827", "#000000"
];

function readCustomPalettes(): CustomPalette[] {
  try {
    const userId = localStorage.getItem("auri-current-user-id");
    if (!userId) return [];
    const raw = localStorage.getItem(userStorageKey(CUSTOM_PALETTES_KEY, userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomPalettes(palettes: CustomPalette[]) {
  try {
    const userId = localStorage.getItem("auri-current-user-id");
    if (!userId) return;
    localStorage.setItem(userStorageKey(CUSTOM_PALETTES_KEY, userId), JSON.stringify(palettes));
  } catch {}
}

function paletteTheme(colors: string[], label: string): ThemePreset {
  const primary = colors[0] || "#8B5CF6";
  const secondary = colors[1] || primary;
  const accent = colors[2] || secondary;

  return {
    id: `custom-${Date.now()}`,
    label,
    primary,
    secondary,
    background: "#08060D",
    card: mix("#08060D", primary, 0.16),
    accent,
  };
}

const THEME_BUCKET = "theme-assets";

function userBackgroundPath(userId: string) {
  return `users/${userId}/background`;
}

const sharedImages = new Map<string, string | null | undefined>();
const sharedImagePromises = new Map<string, Promise<string | null>>();

const BACKGROUND_EVENT = "auri-background-change";

function broadcastBackground(image: string | null) {
  window.dispatchEvent(
    new CustomEvent(BACKGROUND_EVENT, { detail: { image } })
  );
}

function setSharedBackground(userId: string, image: string | null) {
  sharedImages.set(userId, image);
  sharedImagePromises.delete(userId);
  broadcastBackground(image);
}

async function getSharedBackground(userId: string): Promise<string | null> {
  const cached = sharedImages.get(userId);
  if (cached !== undefined) return cached;

  const pending = sharedImagePromises.get(userId);
  if (pending) return pending;

  const path = userBackgroundPath(userId);

  const promise = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(THEME_BUCKET)
        .list(`users/${userId}`, {
          limit: 10,
          search: "background",
        });

      if (error || !data?.some(file => file.name === "background")) {
        sharedImages.set(userId, null);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from(THEME_BUCKET)
        .getPublicUrl(path);

      if (!publicData?.publicUrl) {
        sharedImages.set(userId, null);
        return null;
      }

      const url = `${publicData.publicUrl}?v=${Date.now()}`;
      sharedImages.set(userId, url);
      return url;
    } catch {
      sharedImages.set(userId, null);
      return null;
    } finally {
      sharedImagePromises.delete(userId);
    }
  })();

  sharedImagePromises.set(userId, promise);
  return promise;
}

async function saveImage(image: Blob | string, userId: string) {
  const path = userBackgroundPath(userId);

  const { error } = await supabase.storage
    .from(THEME_BUCKET)
    .upload(path, image, {
      upsert: true,
      cacheControl: "0",
      contentType:
        image instanceof Blob && image.type
          ? image.type
          : "image/jpeg",
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(THEME_BUCKET)
    .getPublicUrl(path);

  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  sharedImages.set(userId, publicUrl);
  sharedImagePromises.delete(userId);
  broadcastBackground(publicUrl);

  return publicUrl;
}

async function removeImage(userId: string) {
  const path = userBackgroundPath(userId);

  const { error } = await supabase.storage
    .from(THEME_BUCKET)
    .remove([path]);

  if (error) throw error;

  sharedImages.set(userId, null);
  sharedImagePromises.delete(userId);
  broadcastBackground(null);
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
  const [customPalettes, setCustomPalettes] = useState<CustomPalette[]>(readCustomPalettes);
  const [selectedCombinationColors, setSelectedCombinationColors] = useState<string[]>([]);
  const [exactColor, setExactColor] = useState("#8B5CF6");
  const [imagePickedColor, setImagePickedColor] = useState<string | null>(null);


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

    const previewUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };

      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    if (!previewUrl) return;

    imageUrlRef.current = previewUrl;

    // Compartilha uma Data URL, nunca um blob: URL.
    // Assim nenhuma instância pode invalidar o fundo da outra.
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) return;

    setSharedBackground(userId, previewUrl);

    // A imagem continua sendo o fundo.
    setImage(previewUrl);

    // PERSISTÊNCIA REAL: salva a imagem no Supabase Storage.
    // Sem isso ela existe somente enquanto a página está aberta.
    try {
      await saveImage(file, userId);
    } catch (error) {
      console.error("Falha ao persistir fundo personalizado:", error);
    }

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
  };


  const selectAnyColor = (color: string) => {
    const normalized = color.startsWith("#") ? color : `#${color}`;
    setExactColor(normalized);

    setSelectedCombinationColors((current) => {
      if (current.includes(normalized)) return current;
      return [...current, normalized];
    });
  };

  const applyColorCombination = (colors: string[], label = "Combinação AURI") => {
    if (!colors.length) return;

    const nextTheme = themeFromColors(colors, label);
    setTheme(nextTheme);
    saveTheme(nextTheme);

    setSelectedCombinationColors([...colors]);
  };

  const addCurrentColor = () => {
    selectAnyColor(exactColor);
  };

  const createUnlimitedCombination = () => {
    if (!selectedCombinationColors.length) return;

    const nextTheme = themeFromColors(
      selectedCombinationColors,
      `Minha combinação (${selectedCombinationColors.length} cores)`
    );

    setTheme(nextTheme);
    saveTheme(nextTheme);

    const nextPalette: CustomPalette = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label: nextTheme.label,
      colors: [...selectedCombinationColors],
    };

    const next = [...customPalettes, nextPalette];
    setCustomPalettes(next);
    saveCustomPalettes(next);
  };

  const pickFromImage = (
    event: React.MouseEvent<HTMLImageElement>
  ) => {
    if (!image) return;

    try {
      const img = event.currentTarget;
      const rect = img.getBoundingClientRect();

      const x = Math.max(
        0,
        Math.min(
          img.naturalWidth - 1,
          Math.floor((event.clientX - rect.left) * img.naturalWidth / rect.width)
        )
      );

      const y = Math.max(
        0,
        Math.min(
          img.naturalHeight - 1,
          Math.floor((event.clientY - rect.top) * img.naturalHeight / rect.height)
        )
      );

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      const pixel = ctx.getImageData(x, y, 1, 1).data;

      const color = rgbToHex(
        pixel[0],
        pixel[1],
        pixel[2]
      );

      setImagePickedColor(color);
      selectAnyColor(color);
    } catch (error) {
      console.warn("Não foi possível amostrar esta imagem diretamente:", error);
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
      <DropdownMenuContent
        align="end"
        className="w-[min(92vw,380px)] max-h-[82vh] overflow-y-auto p-2"
      >
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Aparência da AURI
        </div>

        {/* ======================================================
            CORES PRINCIPAIS — compactas
            ====================================================== */}
        <div className="px-2 pt-2 pb-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Cores principais
          </div>

          <div className="grid grid-cols-2 gap-1">
            {PRESETS.slice(0, 12).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void choosePreset(p)}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-accent transition-colors"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-white/20"
                  style={{ background: p.primary }}
                />
                <span className="truncate">{p.label}</span>
                {theme.id === p.id && (
                  <Check className="ml-auto h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* ======================================================
            DISCO CROMÁTICO
            ====================================================== */}
        <div className="px-2 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Disco cromático
          </div>

          <div className="flex flex-col items-center gap-3">
            <div
              className="relative h-44 w-44 rounded-full p-4 shadow-lg"
              style={{
                background:
                  "conic-gradient(red, #ff7a00, yellow, #7cff00, #00ff88, cyan, #008cff, #004cff, #6a00ff, #b000ff, magenta, red)",
              }}
            >
              <button
                type="button"
                aria-label="Escolher cor no disco cromático"
                className="absolute inset-4 rounded-full border-4 border-background/80 shadow-inner"
                style={{
                  background:
                    "radial-gradient(circle, white 0%, rgba(255,255,255,.65) 18%, transparent 55%)",
                }}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const cx = rect.left + rect.width / 2;
                  const cy = rect.top + rect.height / 2;
                  const dx = event.clientX - cx;
                  const dy = event.clientY - cy;

                  let hue =
                    Math.atan2(dy, dx) * 180 / Math.PI + 90;

                  if (hue < 0) hue += 360;

                  const color = hslToHex(hue, 82, 55);
                  selectAnyColor(color);
                }}
              />

              <div
                className="pointer-events-none absolute inset-[30%] rounded-full border border-white/30"
                style={{
                  background: exactColor,
                  boxShadow: "0 0 0 3px rgba(0,0,0,.28)",
                }}
              />
            </div>

            <div className="flex w-full items-center gap-2">
              <input
                type="color"
                value={exactColor}
                onChange={(event) => selectAnyColor(event.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                title="Escolher qualquer cor"
              />

              <input
                type="text"
                value={exactColor}
                onChange={(event) => {
                  const value = event.target.value;
                  setExactColor(value);
                  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                    selectAnyColor(value);
                  }
                }}
                className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-xs font-mono"
                aria-label="Código hexadecimal da cor"
              />

              <button
                type="button"
                onClick={addCurrentColor}
                className="h-9 rounded-lg border border-border px-3 text-xs hover:bg-accent"
              >
                Adicionar
              </button>
            </div>

            <div className="text-[10px] text-muted-foreground text-center">
              O disco é contínuo: não existe limite de cores disponíveis.
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* ======================================================
            CORES COMBINADAS
            ====================================================== */}
        <div className="px-2 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Cores combinadas
          </div>

          <div className="grid grid-cols-2 gap-2">
            {AURI_GENERATED_COMBINATIONS.slice(0, 48).map((combo, index) => (
              <button
                key={`${combo.label}-${index}`}
                type="button"
                onClick={() => applyColorCombination(combo.colors, combo.label)}
                className="overflow-hidden rounded-lg border border-border text-left hover:border-primary/60 transition-colors"
              >
                <div
                  className="h-8 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${combo.colors[0]}, ${combo.colors[1]})`,
                  }}
                />
                <div className="px-2 py-1.5 text-[10px]">
                  {combo.label}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-2 text-[10px] text-muted-foreground">
            As combinações exibidas são sugestões. Você pode criar quantas
            combinações próprias quiser.
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* ======================================================
            COMBINADOR SEM LIMITE
            ====================================================== */}
        <div className="px-2 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Combinar minhas cores
          </div>

          {selectedCombinationColors.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selectedCombinationColors.map((color, index) => (
                <button
                  key={`${color}-${index}`}
                  type="button"
                  title={`Remover ${color}`}
                  onClick={() => {
                    setSelectedCombinationColors((current) =>
                      current.filter((_, i) => i !== index)
                    );
                  }}
                  className="group flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px]"
                >
                  <span
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ background: color }}
                  />
                  <span>{color}</span>
                  <span className="text-muted-foreground group-hover:text-foreground">
                    ×
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-2 rounded-lg border border-dashed border-border px-3 py-2 text-[10px] text-muted-foreground">
              Escolha quantas cores quiser no disco ou no seletor acima.
            </div>
          )}

          <button
            type="button"
            disabled={!selectedCombinationColors.length}
            onClick={createUnlimitedCombination}
            className="w-full rounded-lg bg-gradient-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"
          >
            Criar combinação com {selectedCombinationColors.length} cores
          </button>
        </div>

        {/* ======================================================
            COMBINAÇÕES SALVAS
            ====================================================== */}
        {customPalettes.length > 0 && (
          <>
            <DropdownMenuSeparator />

            <div className="px-2 py-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Minhas combinações
              </div>

              <div className="space-y-1">
                {customPalettes.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() =>
                      applyColorCombination(
                        palette.colors,
                        palette.label
                      )
                    }
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-accent"
                  >
                    <div className="flex shrink-0">
                      {palette.colors.slice(0, 8).map((color, index) => (
                        <span
                          key={`${color}-${index}`}
                          className="-ml-1 h-4 w-4 rounded-full border border-background first:ml-0"
                          style={{ background: color }}
                        />
                      ))}
                    </div>

                    <span className="truncate text-xs">
                      {palette.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator />

        {/* ======================================================
            IMAGEM — NÃO ALTERA O UPLOAD EXISTENTE
            ====================================================== */}
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <label htmlFor="auri-theme-image-upload">
            <ImagePlus className="h-4 w-4" />
            Usar minha imagem
          </label>
        </DropdownMenuItem>

        {/* ======================================================
            ESCOLHER COR DA FOTO
            ====================================================== */}
        {image && (
          <>
            <div className="px-2 pt-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Ajustar cor da imagem
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-black/20">
                <img
                  src={image}
                  alt="Imagem usada como fundo"
                  crossOrigin="anonymous"
                  className="block max-h-48 w-full cursor-crosshair object-cover"
                  onClick={pickFromImage}
                />
              </div>

              <div className="mt-2 text-[10px] text-muted-foreground">
                Toque diretamente na foto para escolher uma cor dela.
                Essa cor pode ser usada na combinação sem remover a imagem.
              </div>

              {imagePickedColor && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-border px-2 py-2">
                  <span
                    className="h-6 w-6 rounded-full border border-white/20"
                    style={{ background: imagePickedColor }}
                  />
                  <span className="text-xs font-mono">
                    {imagePickedColor}
                  </span>

                  <button
                    type="button"
                    className="ml-auto rounded-md border border-border px-2 py-1 text-[10px] hover:bg-accent"
                    onClick={() => {
                      selectAnyColor(imagePickedColor);
                      applyColorCombination(
                        [imagePickedColor],
                        "Cor escolhida da imagem"
                      );
                    }}
                  >
                    Usar cor
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {image && (
          <DropdownMenuItem onClick={() => choosePreset(PRESETS[0])}>
            <RotateCcw className="h-4 w-4" />
            Voltar à paleta AURI
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
