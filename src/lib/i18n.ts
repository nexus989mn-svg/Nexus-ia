import i18n from "i18next";

import { initReactI18next } from "react-i18next";

const resources = {
  "pt-BR": {
    translation: {
      common: {
        signIn: "Entrar",
        signOut: "Sair",
        signUp: "Criar conta",
        getStarted: "Começar agora",
        loading: "Carregando…",
        cancel: "Cancelar",
        confirm: "Confirmar",
        save: "Salvar",
        email: "E-mail",
        password: "Senha",
        fullName: "Nome completo",
        or: "OU",
        continueWithGoogle: "Continuar com Google",
        language: "Idioma",
      },
      nav: {
        dashboard: "Painel",
        agent: "Agente IA",
        billing: "Assinatura",
        catalog: "Catálogo",
        whatsapp: "WhatsApp",
        company: "Empresa",
        profile: "Perfil",
        admin: "Administração",
        signOut: "Sair",
        brand: "Assistente IA",
        tagline: "Vendas no WhatsApp",
        menu: "Menu",
      },
      agent: {
        conversations: "Conversas",
        new: "Nova",
        empty: "Sem conversas ainda. Clique em Nova para começar.",
        delete: "Excluir",
        confirmDelete: "Excluir esta conversa?",
        welcomeTitle: "Converse com seu Agente IA",
        welcomeDesc: "Treine, teste e converse com o agente que atende seus clientes no WhatsApp.",
        startChat: "Iniciar conversa",
        sendFirst: "Envie a primeira mensagem para começar.",
        placeholder: "Digite uma mensagem…",
        thinking: "Pensando…",
      },
      landing: {
        badge: "Plataforma de vendas com IA no WhatsApp",
        heroPre: "Venda no WhatsApp",
        heroAccent: "no piloto automático.",
        heroDesc:
          "Conecte seu WhatsApp, plugue seu catálogo e deixe agentes de IA qualificarem leads, atenderem clientes e fecharem vendas — 24/7, em qualquer idioma.",
        startTrial: "Iniciar teste grátis",
        viewPricing: "Ver planos",
        featuresTitle: "Tudo que você precisa para vender com IA",
        pricingTitle: "Planos simples e transparentes",
        pricingDesc: "Cobrado em USD. Cancele quando quiser.",
        perMonth: "/mês",
        perYear: "/ano",
        perTrial: "/teste",
        subscribe: "Assinar",
        startPlanTrial: "Iniciar teste",
        features: {
          aiAgent: { t: "Agente IA de vendas", d: "Treinado no seu catálogo, responde como um vendedor humano." },
          leadCapture: { t: "Captura instantânea de leads", d: "Detecta intenção, qualifica e direciona leads quentes." },
          analytics: { t: "Métricas em tempo real", d: "Conversas, conversões e receita em um único painel." },
          autoBlock: { t: "Bloqueio automático", d: "Guarda de assinatura garante que só clientes ativos consumam IA." },
          multi: { t: "Multi-instância", d: "Vários números de WhatsApp, isolados por ambiente." },
          sdr: { t: "IA SDR e Designer", d: "Gera campanhas, scripts e criativos na sua marca." },
        },
        footer: "Assistente IA de Vendas WhatsApp",
      },
      auth: {
        welcomeBack: "Bem-vindo de volta",
        signInDesc: "Entre no seu ambiente.",
        createTitle: "Crie seu ambiente",
        createDesc: "7 dias de teste grátis. Sem cartão.",
        signingIn: "Entrando…",
        creating: "Criando…",
        noAccount: "Não tem conta?",
        createOne: "Cadastre-se",
        haveAccount: "Já tem conta?",
        accountCreated: "Conta criada — bem-vindo!",
      },
      dashboard: {
        welcome: "Bem-vindo de volta",
        subscriptionPaused: "Sua assinatura está {{status}}",
        defaultBlockedReason: "Recursos de IA pausados até reativar.",
        reactivate: "Reativar",
        adminEnabled: "Acesso administrativo habilitado",
        adminEnabledDesc: "Você pode gerenciar clientes, planos e logs do sistema.",
        openAdmin: "Abrir painel administrativo",
        cards: {
          subscription: "Assinatura",
          daysRemaining: "Dias restantes",
          whatsapp: "WhatsApp",
          mode: "Modo",
          conversations: "Conversas",
          leads: "Leads",
          revenue: "Receita (USD)",
        },
        notConnected: "Não conectado",
        comingV2: "Disponível na v2",
        mockBilling: "Cobrança simulada",
        liveBilling: "Cobrança ativa",
        stripeNotSet: "Stripe não configurado",
        stripeActive: "Stripe ativo",
        noData: "Sem dados ainda",
        renews: "Renova em {{date}}",
        em: "—",
        nextSteps: "Próximos passos",
        steps: {
          plan: "Escolha um plano ou continue o teste",
          whats: "Conecte seu WhatsApp (v2)",
          catalog: "Envie seu catálogo de produtos (v2)",
          ai: "Ative o Agente IA de Vendas (v2)",
        },
      },
      billing: {
        title: "Assinatura",
        subtitle: "Gerencie sua assinatura e planos.",
        mockTitle: "Modo de cobrança simulada.",
        mockDesc:
          "Stripe não configurado — assinaturas ativam instantaneamente para teste.",
        currentPlan: "Plano atual",
        cancelSub: "Cancelar assinatura",
        confirmCancel: "Deseja cancelar sua assinatura?",
        canceled: "Assinatura cancelada",
        availablePlans: "Planos disponíveis",
        choosePlan: "Escolher plano",
        renew: "Renovar",
        activatedMock: "Assinatura ativada (modo simulado)",
        redirecting: "Redirecionando para o checkout…",
        renewsAt: "Renova/expira em {{date}}",
      },
      status: {
        trial: "Teste",
        active: "Ativo",
        expired: "Expirado",
        blocked: "Bloqueado",
        canceled: "Cancelado",
        unknown: "Desconhecido",
      },
    },
  },
  en: {
    translation: {
      common: {
        signIn: "Sign in",
        signOut: "Sign out",
        signUp: "Create account",
        getStarted: "Get started",
        loading: "Loading…",
        cancel: "Cancel",
        confirm: "Confirm",
        save: "Save",
        email: "Email",
        password: "Password",
        fullName: "Full name",
        or: "OR",
        continueWithGoogle: "Continue with Google",
        language: "Language",
      },
      nav: {
        dashboard: "Dashboard",
        billing: "Billing",
        catalog: "Catalog",
        admin: "Admin",
        signOut: "Sign out",
        brand: "AI Assistant",
        tagline: "WhatsApp Sales",
        menu: "Menu",
      },
      landing: {
        badge: "AI-powered WhatsApp sales platform",
        heroPre: "Sell on WhatsApp",
        heroAccent: "on autopilot.",
        heroDesc:
          "Connect your WhatsApp, plug in your catalog, and let AI agents qualify leads, answer customers and close sales — 24/7, in any language.",
        startTrial: "Start free trial",
        viewPricing: "View pricing",
        featuresTitle: "Everything you need to sell with AI",
        pricingTitle: "Simple global pricing",
        pricingDesc: "Billed in USD. Cancel anytime.",
        perMonth: "/month",
        perYear: "/year",
        perTrial: "/trial",
        subscribe: "Subscribe",
        startPlanTrial: "Start trial",
        features: {
          aiAgent: { t: "AI Sales Agent", d: "Trained on your catalog, replies like a human seller." },
          leadCapture: { t: "Instant lead capture", d: "Auto-detect intent, qualify and route hot leads." },
          analytics: { t: "Live analytics", d: "Conversations, conversions and revenue in one dashboard." },
          autoBlock: { t: "Auto block & unblock", d: "Subscription guard ensures only active customers consume AI." },
          multi: { t: "Multi-instance", d: "Run many WhatsApp numbers, isolated per workspace." },
          sdr: { t: "AI SDR & Designer", d: "Generate campaigns, scripts and on-brand creatives." },
        },
        footer: "AI WhatsApp Sales Assistant",
      },
      auth: {
        welcomeBack: "Welcome back",
        signInDesc: "Sign in to your workspace.",
        createTitle: "Create your workspace",
        createDesc: "7-day free trial. No card required.",
        signingIn: "Signing in…",
        creating: "Creating…",
        noAccount: "No account?",
        createOne: "Create one",
        haveAccount: "Already have an account?",
        accountCreated: "Account created — welcome!",
      },
      dashboard: {
        welcome: "Welcome back",
        subscriptionPaused: "Your subscription is {{status}}",
        defaultBlockedReason: "AI features are paused until you reactivate.",
        reactivate: "Reactivate",
        adminEnabled: "Admin access enabled",
        adminEnabledDesc: "You can manage customers, plans and system logs.",
        openAdmin: "Open Admin Console",
        cards: {
          subscription: "Subscription",
          daysRemaining: "Days remaining",
          whatsapp: "WhatsApp",
          mode: "Mode",
          conversations: "Conversations",
          leads: "Leads",
          revenue: "Revenue (USD)",
        },
        notConnected: "Not connected",
        comingV2: "Coming in v2",
        mockBilling: "Mock billing",
        liveBilling: "Live billing",
        stripeNotSet: "Stripe keys not set",
        stripeActive: "Stripe active",
        noData: "No data yet",
        renews: "Renews {{date}}",
        em: "—",
        nextSteps: "Next steps",
        steps: {
          plan: "Choose a plan or continue the trial",
          whats: "Connect your WhatsApp number (v2)",
          catalog: "Upload your product catalog (v2)",
          ai: "Activate AI Sales Agent (v2)",
        },
      },
      billing: {
        title: "Billing",
        subtitle: "Manage your subscription and plans.",
        mockTitle: "Mock billing mode.",
        mockDesc: "Stripe not configured — subscriptions activate instantly for testing.",
        currentPlan: "Current plan",
        cancelSub: "Cancel subscription",
        confirmCancel: "Cancel your subscription?",
        canceled: "Subscription canceled",
        availablePlans: "Available plans",
        choosePlan: "Choose plan",
        renew: "Renew",
        activatedMock: "Subscription activated (mock mode)",
        redirecting: "Redirecting to checkout…",
        renewsAt: "Renews/expires {{date}}",
      },
      status: {
        trial: "Trial",
        active: "Active",
        expired: "Expired",
        blocked: "Blocked",
        canceled: "Canceled",
        unknown: "Unknown",
      },
    },
  },
  es: {
    translation: {
      common: {
        signIn: "Entrar",
        signOut: "Salir",
        signUp: "Crear cuenta",
        getStarted: "Empezar",
        loading: "Cargando…",
        cancel: "Cancelar",
        confirm: "Confirmar",
        save: "Guardar",
        email: "Correo",
        password: "Contraseña",
        fullName: "Nombre completo",
        or: "O",
        continueWithGoogle: "Continuar con Google",
        language: "Idioma",
      },
      nav: {
        dashboard: "Panel",
        billing: "Suscripción",
        catalog: "Catálogo",
        admin: "Administración",
        signOut: "Salir",
        brand: "Asistente IA",
        tagline: "Ventas en WhatsApp",
        menu: "Menú",
      },
      landing: {
        badge: "Plataforma de ventas con IA en WhatsApp",
        heroPre: "Vende en WhatsApp",
        heroAccent: "en piloto automático.",
        heroDesc:
          "Conecta tu WhatsApp, integra tu catálogo y deja que agentes de IA califiquen leads, atiendan clientes y cierren ventas — 24/7, en cualquier idioma.",
        startTrial: "Probar gratis",
        viewPricing: "Ver planes",
        featuresTitle: "Todo lo que necesitas para vender con IA",
        pricingTitle: "Precios globales simples",
        pricingDesc: "Facturado en USD. Cancela cuando quieras.",
        perMonth: "/mes",
        perYear: "/año",
        perTrial: "/prueba",
        subscribe: "Suscribirse",
        startPlanTrial: "Iniciar prueba",
        features: {
          aiAgent: { t: "Agente IA de ventas", d: "Entrenado en tu catálogo, responde como un vendedor humano." },
          leadCapture: { t: "Captura de leads instantánea", d: "Detecta intención y dirige leads calientes." },
          analytics: { t: "Analíticas en vivo", d: "Conversaciones, conversiones e ingresos en un panel." },
          autoBlock: { t: "Bloqueo automático", d: "Solo clientes activos consumen IA." },
          multi: { t: "Multi-instancia", d: "Varios números de WhatsApp aislados por workspace." },
          sdr: { t: "IA SDR y Designer", d: "Genera campañas, guiones y creativos de marca." },
        },
        footer: "Asistente IA de Ventas WhatsApp",
      },
      auth: {
        welcomeBack: "Bienvenido de nuevo",
        signInDesc: "Entra a tu workspace.",
        createTitle: "Crea tu workspace",
        createDesc: "Prueba gratis de 7 días. Sin tarjeta.",
        signingIn: "Entrando…",
        creating: "Creando…",
        noAccount: "¿Sin cuenta?",
        createOne: "Crear una",
        haveAccount: "¿Ya tienes cuenta?",
        accountCreated: "¡Cuenta creada — bienvenido!",
      },
      dashboard: {
        welcome: "Bienvenido de nuevo",
        subscriptionPaused: "Tu suscripción está {{status}}",
        defaultBlockedReason: "Las funciones de IA están pausadas hasta reactivar.",
        reactivate: "Reactivar",
        adminEnabled: "Acceso administrativo habilitado",
        adminEnabledDesc: "Puedes gestionar clientes, planes y logs del sistema.",
        openAdmin: "Abrir Consola Admin",
        cards: {
          subscription: "Suscripción",
          daysRemaining: "Días restantes",
          whatsapp: "WhatsApp",
          mode: "Modo",
          conversations: "Conversaciones",
          leads: "Leads",
          revenue: "Ingresos (USD)",
        },
        notConnected: "No conectado",
        comingV2: "Disponible en v2",
        mockBilling: "Facturación simulada",
        liveBilling: "Facturación activa",
        stripeNotSet: "Stripe no configurado",
        stripeActive: "Stripe activo",
        noData: "Sin datos aún",
        renews: "Renueva el {{date}}",
        em: "—",
        nextSteps: "Próximos pasos",
        steps: {
          plan: "Elige un plan o continúa la prueba",
          whats: "Conecta tu WhatsApp (v2)",
          catalog: "Sube tu catálogo (v2)",
          ai: "Activa el Agente IA (v2)",
        },
      },
      billing: {
        title: "Suscripción",
        subtitle: "Gestiona tu suscripción y planes.",
        mockTitle: "Modo de facturación simulada.",
        mockDesc: "Stripe no configurado — las suscripciones se activan al instante para pruebas.",
        currentPlan: "Plan actual",
        cancelSub: "Cancelar suscripción",
        confirmCancel: "¿Cancelar tu suscripción?",
        canceled: "Suscripción cancelada",
        availablePlans: "Planes disponibles",
        choosePlan: "Elegir plan",
        renew: "Renovar",
        activatedMock: "Suscripción activada (modo simulado)",
        redirecting: "Redirigiendo al checkout…",
        renewsAt: "Renueva/expira {{date}}",
      },
      status: {
        trial: "Prueba",
        active: "Activo",
        expired: "Expirado",
        blocked: "Bloqueado",
        canceled: "Cancelado",
        unknown: "Desconocido",
      },
    },
  },
} as const;

export const planCopy = {
  trial: {
    name: "Teste grátis",
    interval: "teste",
    features: ["1 instância de WhatsApp", "Assistente de IA", "Até 100 conversas", "Catálogo básico"],
  },
  monthly: {
    name: "Pro mensal",
    interval: "mensal",
    features: [
      "Conversas ilimitadas",
      "Múltiplas instâncias de WhatsApp",
      "Assistente de vendas com IA",
      "IA SDR",
      "Catálogo de produtos",
      "Suporte prioritário",
    ],
  },
  yearly: {
    name: "Pro anual",
    interval: "anual",
    features: ["Tudo do plano mensal", "2 meses grátis", "IA Designer incluída", "Implantação dedicada"],
  },
} as const;

export function getPlanCopy(plan: { code?: string | null; name?: string | null; interval?: string | null; features?: unknown }) {
  const key = plan.code as keyof typeof planCopy | undefined;
  const translated = key ? planCopy[key] : undefined;
  return {
    name: translated?.name ?? plan.name ?? "Plano",
    interval: translated?.interval ?? translateInterval(plan.interval),
    features: translated?.features ?? (Array.isArray(plan.features) ? plan.features.map(String) : []),
  };
}

export function translateInterval(interval?: string | null) {
  if (interval === "yearly") return "anual";
  if (interval === "monthly") return "mensal";
  if (interval === "trial") return "teste";
  return interval ?? "—";
}

try {
  if (typeof window !== "undefined") window.localStorage.setItem("lang", "pt-BR");
} catch {}

if (i18n.isInitialized) {
  Object.entries(resources).forEach(([lang, value]) => {
    i18n.addResourceBundle(lang, "translation", value.translation, true, true);
  });
  void i18n.changeLanguage("pt-BR");
} else {
  i18n.use(initReactI18next).init({
    resources,
    lng: "pt-BR",
    fallbackLng: "pt-BR",
    defaultNS: "translation",
    ns: ["translation"],
    supportedLngs: ["pt-BR", "en", "es"],
    nonExplicitSupportedLngs: true,
    load: "currentOnly",
    initAsync: false,
    react: { useSuspense: false },
    interpolation: { escapeValue: false },
  });
}

const originalT = i18n.t.bind(i18n);
i18n.t = ((key: string | string[], options?: Record<string, unknown>) => {
  const rawKey = Array.isArray(key) ? key[0] : key;
  const result = originalT(key as never, options as never);
  if (typeof result === "string" && result !== rawKey) return result;
  const fallback = rawKey.split(".").reduce<unknown>((acc, part) => {
    return acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined;
  }, resources["pt-BR"].translation);
  if (typeof fallback !== "string") return result;
  return fallback.replace(/{{\s*(\w+)\s*}}/g, (_, token) => String(options?.[token] ?? ""));
}) as typeof i18n.t;

export default i18n;
