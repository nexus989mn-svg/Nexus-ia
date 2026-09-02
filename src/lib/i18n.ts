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
        badge: "Assistente de IA para WhatsApp",
        heroPre: "AURI IA,",
        heroAccent: "Sua Assistente de Atendimento",
        heroDesc:
          "Você conecta seu WhatsApp e sua assistente de IA cuida do atendimento. Treine a AURI IA com as informações da sua empresa para ela entender seu negócio e atender melhor seus clientes.",
        startTrial: "Iniciar teste grátis",
        viewPricing: "Ver planos",
        featuresTitle: "Tudo que você precisa para atender com IA",
        pricingTitle: "Planos simples e transparentes",
        pricingDesc: "Cobrado em USD. Cancele quando quiser.",
        perMonth: "/mês",
        perYear: "/ano",
        perTrial: "/teste",
        subscribe: "Assinar",
        startPlanTrial: "Iniciar teste",
        features: {
          aiAgent: { t: "Assistente de Atendimento", d: "A Auri IA atende seus clientes pelo WhatsApp de forma natural." },
          leadCapture: { t: "IA treinável", d: "Treine a Auri IA com as informações, serviços e orientações da sua empresa." },
          analytics: { t: "Atendimento inteligente", d: "Entende a intenção do cliente e conduz cada conversa com contexto." },
          autoBlock: { t: "Contexto da empresa", d: "Informe como sua empresa funciona para a IA atender melhor seus clientes." },
          multi: { t: "WhatsApp conectado", d: "Conecte seu número e deixe a Auri IA cuidar do atendimento." },
          sdr: { t: "Voz da sua assistente", d: "Escolha a voz que a Auri IA usará nas conversas com seus clientes." },
        },
        footer: "Assistente IA para WhatsApp",
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
          catalog: "Configure as informações da sua empresa (v2)",
          ai: "Configure sua Assistente de Atendimento (v2)",
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
        agent: "Internal center",
        training: "Train your AI",
        whatsapp: "WhatsApp",
        billing: "Billing",
        catalog: "Catalog",
        company: "Company",
        profile: "Profile",
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
          aiAgent: { t: "Customer Service Assistant", d: "Auri AI serves your customers on WhatsApp naturally." },
          leadCapture: { t: "Trainable AI", d: "Train Auri AI with your company's information, services and guidelines." },
          analytics: { t: "Intelligent customer service", d: "Understands customer intent and guides each conversation with context." },
          autoBlock: { t: "Company context", d: "Tell the AI how your company works so it can serve your customers better." },
          multi: { t: "Connected WhatsApp", d: "Connect your number and let Auri AI handle customer service." },
          sdr: { t: "Your assistant's voice", d: "Choose the voice Auri AI will use in conversations with your customers." },
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
        agent: "Centro interno",
        training: "Entrena tu IA",
        whatsapp: "WhatsApp",
        billing: "Suscripción",
        catalog: "Catálogo",
        company: "Empresa",
        profile: "Perfil",
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
          aiAgent: { t: "Asistente de atención", d: "Auri IA atiende a tus clientes por WhatsApp de forma natural." },
          leadCapture: { t: "IA entrenable", d: "Entrena Auri IA con la información, servicios y orientaciones de tu empresa." },
          analytics: { t: "Atención inteligente", d: "Entiende la intención del cliente y guía cada conversación con contexto." },
          autoBlock: { t: "Contexto de la empresa", d: "Indica cómo funciona tu empresa para que la IA atienda mejor a tus clientes." },
          multi: { t: "WhatsApp conectado", d: "Conecta tu número y deja que Auri IA se encargue de la atención." },
          sdr: { t: "Voz de tu asistente", d: "Elige la voz que Auri IA usará en las conversaciones con tus clientes." },
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
    name: translated?.name ? translateText(translated.name) : (plan.name ? translateText(plan.name) : translateText("Plano")),
    interval: translated?.interval ? translateText(translated.interval) : translateInterval(plan.interval),
    features: translated?.features
      ? translated.features.map((feature) => translateText(feature))
      : (Array.isArray(plan.features) ? plan.features.map((feature) => translateText(String(feature))) : []),
  };
}

const SUPPORTED_LANGUAGES = ["pt-BR", "en", "es"] as const;
let savedLanguage: string = "pt-BR";
try {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem("lang");
    if (saved && SUPPORTED_LANGUAGES.includes(saved as typeof SUPPORTED_LANGUAGES[number])) savedLanguage = saved;
  }
} catch {}


const DIRECT_TRANSLATIONS: Record<string, { en: string; es: string }> = {
  "Esta página não existe.": { en: "This page doesn't exist.", es: "Esta página no existe." },
  "Voltar ao início": { en: "Back to home", es: "Volver al inicio" },
  "Algo deu errado": { en: "Something went wrong", es: "Algo salió mal" },
  "Tentar novamente": { en: "Try again", es: "Intentar de nuevo" },
  "Meu perfil": { en: "My profile", es: "Mi perfil" },
  "Dados pessoais": { en: "Personal information", es: "Datos personales" },
  "Atualize seu nome e senha de acesso.": { en: "Update your name and login password.", es: "Actualiza tu nombre y contraseña de acceso." },
  "Identificação": { en: "Identification", es: "Identificación" },
  "Nome completo": { en: "Full name", es: "Nombre completo" },
  "Empresa (legado)": { en: "Company (legacy)", es: "Empresa (legado)" },
  "Esses dados serão migrados para a aba": { en: "This data will be migrated to the", es: "Estos datos se migrarán a la pestaña" },
  "Senha": { en: "Password", es: "Contraseña" },
  "Nova senha": { en: "New password", es: "Nueva contraseña" },
  "Acesso administrativo ativo.": { en: "Administrative access is active.", es: "El acceso administrativo está activo." },
  "Esta conta administra a plataforma e não precisa de uma assinatura de cliente.": { en: "This account administers the platform and does not need a customer subscription.", es: "Esta cuenta administra la plataforma y no necesita una suscripción de cliente." },
  "Histórico de cobrança": { en: "Billing history", es: "Historial de facturación" },
  "Nenhum evento registrado ainda.": { en: "No events recorded yet.", es: "Aún no hay eventos registrados." },
  "Painel administrativo · TW Design Studio": { en: "Admin panel · TW Design Studio", es: "Panel administrativo · TW Design Studio" },
  "Centro operacional": { en: "Operations center", es: "Centro operativo" },
  "Centro de administração da plataforma — acesso controlado pela função de administrador.": { en: "Platform administration center — access controlled by the administrator role.", es: "Centro de administración de la plataforma — acceso controlado por la función de administrador." },
  "Executivo": { en: "Executive", es: "Ejecutivo" }, "Clientes": { en: "Customers", es: "Clientes" },
  "Empresas": { en: "Companies", es: "Empresas" }, "Usuários": { en: "Users", es: "Usuarios" },
  "Briefings": { en: "Briefings", es: "Briefings" }, "Financeiro": { en: "Finance", es: "Finanzas" },
  "Módulos de IA": { en: "AI modules", es: "Módulos de IA" }, "Filas": { en: "Queues", es: "Colas" },
  "Logs": { en: "Logs", es: "Registros" }, "Integrações": { en: "Integrations", es: "Integraciones" },
  "Configurações": { en: "Settings", es: "Configuración" }, "Segurança": { en: "Security", es: "Seguridad" },
  "Operacional": { en: "Operational", es: "Operativo" }, "Verificar vencidas": { en: "Check overdue", es: "Verificar vencidas" },
  "Plano": { en: "Plan", es: "Plan" }, "Status": { en: "Status", es: "Estado" }, "Expira em": { en: "Expires", es: "Expira el" }, "Ações": { en: "Actions", es: "Acciones" },
  "Ativar": { en: "Activate", es: "Activar" }, "Bloquear": { en: "Block", es: "Bloquear" }, "Nenhum cliente.": { en: "No customers.", es: "Ningún cliente." },
  "Dono": { en: "Owner", es: "Propietario" }, "Criada em": { en: "Created", es: "Creada" }, "Nenhuma empresa.": { en: "No companies.", es: "Ninguna empresa." },
  "Carregando usuários…": { en: "Loading users…", es: "Cargando usuarios…" }, "Administrador": { en: "Administrator", es: "Administrador" },
  "Nenhum usuário encontrado.": { en: "No users found.", es: "No se encontraron usuarios." }, "Novo briefing": { en: "New briefing", es: "Nuevo briefing" },
  "Canal": { en: "Channel", es: "Canal" }, "Criado": { en: "Created", es: "Creado" }, "Nenhum briefing ainda. Crie o primeiro.": { en: "No briefings yet. Create the first one.", es: "Aún no hay briefings. Crea el primero." },
  "Contato": { en: "Contact", es: "Contacto" }, "Instagram": { en: "Instagram", es: "Instagram" }, "E-mail": { en: "Email", es: "Correo electrónico" }, "Site": { en: "Website", es: "Sitio web" },
  "Pendente": { en: "Pending", es: "Pendiente" }, "Em andamento": { en: "In progress", es: "En progreso" }, "Aprovado": { en: "Approved", es: "Aprobado" }, "Finalizado": { en: "Completed", es: "Finalizado" }, "Resumo": { en: "Summary", es: "Resumen" }, "Salvar": { en: "Save", es: "Guardar" },
  "Nenhum evento ainda (Stripe está em modo simulado).": { en: "No events yet (Stripe is in simulated mode).", es: "Aún no hay eventos (Stripe está en modo simulado)." },
  "Última execução": { en: "Last run", es: "Última ejecución" }, "Execuções": { en: "Runs", es: "Ejecuciones" }, "Modelo (Nexus IA)": { en: "Model (Nexus AI)", es: "Modelo (Nexus IA)" }, "Prompt do sistema": { en: "System prompt", es: "Prompt del sistema" }, "Máx. tokens": { en: "Max tokens", es: "Máx. tokens" }, "Salvar configuração": { en: "Save configuration", es: "Guardar configuración" },
  "Estatísticas em tempo real da fila de atendimento, baseadas nos briefings e conexões WhatsApp ativas. Use a aba": { en: "Real-time service queue statistics based on briefings and active WhatsApp connections. Use the", es: "Estadísticas en tiempo real de la cola de atención basadas en briefings y conexiones de WhatsApp activas. Usa la pestaña" },
  "para gerenciar individualmente.": { en: "tab to manage them individually.", es: "para gestionarlos individualmente." }, "Nenhum log encontrado.": { en: "No logs found.", es: "No se encontraron registros." },
  "Conectado": { en: "Connected", es: "Conectado" }, "Falha": { en: "Failed", es: "Falló" }, "Não testado": { en: "Not tested", es: "No probado" }, "Ativo": { en: "Active", es: "Activo" }, "URL base": { en: "Base URL", es: "URL base" }, "Chave de API / token": { en: "API key / token", es: "Clave API / token" },
  "Nome da marca": { en: "Brand name", es: "Nombre de marca" }, "E-mail de suporte": { en: "Support email", es: "Correo de soporte" }, "Timeout resposta (s)": { en: "Response timeout (s)", es: "Tiempo de espera de respuesta (s)" }, "Tentativas de retry": { en: "Retry attempts", es: "Intentos de reintento" }, "Moeda padrão": { en: "Default currency", es: "Moneda predeterminada" }, "BRL — Real": { en: "BRL — Brazilian Real", es: "BRL — Real brasileño" }, "USD — Dólar": { en: "USD — Dollar", es: "USD — Dólar" }, "EUR — Euro": { en: "EUR — Euro", es: "EUR — Euro" }, "URL do webhook interno (n8n / automações)": { en: "Internal webhook URL (n8n / automations)", es: "URL del webhook interno (n8n / automatizaciones)" },
  "Minha empresa": { en: "My company", es: "Mi empresa" }, "Dados utilizados pelo atendimento, catálogo e cobrança.": { en: "Data used by customer service, catalog and billing.", es: "Datos utilizados por atención, catálogo y facturación." }, "Dados da empresa": { en: "Company data", es: "Datos de la empresa" }, "Nome / Razão social": { en: "Name / Legal name", es: "Nombre / Razón social" }, "CNPJ / CPF": { en: "Tax ID", es: "CNPJ / CPF" }, "Telefone": { en: "Phone", es: "Teléfono" }, "Fuso horário": { en: "Time zone", es: "Zona horaria" }, "URL do logo": { en: "Logo URL", es: "URL del logo" }, "Identidade": { en: "Identity", es: "Identidad" }, "Sem logo": { en: "No logo", es: "Sin logo" }, "Dica: use uma imagem quadrada (512x512) hospedada em CDN pública. Em breve, upload direto.": { en: "Tip: use a square image (512x512) hosted on a public CDN. Direct upload coming soon.", es: "Consejo: usa una imagen cuadrada (512x512) alojada en una CDN pública. La carga directa llegará pronto." },
  "Catálogo bloqueado": { en: "Catalog blocked", es: "Catálogo bloqueado" }, "Ative o Trial ou um plano pago para liberar o catálogo e o assistente de criação de produtos.": { en: "Activate the trial or a paid plan to unlock the catalog and product creation assistant.", es: "Activa la prueba o un plan de pago para habilitar el catálogo y el asistente de creación de productos." }, "Catálogo": { en: "Catalog", es: "Catálogo" }, "Gerencie categorias e produtos. O atendimento usa este catálogo para responder seus clientes.": { en: "Manage categories and products. Customer service uses this catalog to answer your customers.", es: "Gestiona categorías y productos. La atención usa este catálogo para responder a tus clientes." }, "Criar catálogo profissional": { en: "Create professional catalog", es: "Crear catálogo profesional" }, "Como você quer o catálogo?": { en: "How do you want the catalog?", es: "¿Cómo quieres el catálogo?" }, "Referências (opcional)": { en: "References (optional)", es: "Referencias (opcional)" }, "O pedido usa os produtos e categorias já cadastrados. A criação visual será processada internamente e entregue pelo fluxo de catálogo/Canva.": { en: "The request uses the products and categories already registered. Visual creation is processed internally and delivered through the catalog/Canva workflow.", es: "El pedido usa los productos y categorías ya registradas. La creación visual se procesa internamente y se entrega mediante el flujo de catálogo/Canva." },
  "Produtos": { en: "Products", es: "Productos" }, "Categorias": { en: "Categories", es: "Categorías" }, "Assistente de catálogo": { en: "Catalog assistant", es: "Asistente de catálogo" }, "Crie produtos conversando com o assistente": { en: "Create products by chatting with the assistant", es: "Crea productos conversando con el asistente" }, "Converse, envie sua própria foto ou peça uma nova. A IA Designer trabalha internamente quando você escolher gerar.": { en: "Chat, send your own photo, or request a new one. AI Designer works internally when you choose to generate.", es: "Conversa, envía tu propia foto o pide una nueva. IA Designer trabaja internamente cuando eliges generar." }, "Preparando…": { en: "Preparing…", es: "Preparando…" }, "Imagem anexada": { en: "Image attached", es: "Imagen adjunta" }, "Imagem do produto": { en: "Product image", es: "Imagen del producto" }, "Envie uma foto e escolha na conversa se quer usar a original, usar como referência ou gerar uma nova imagem.": { en: "Send a photo and choose whether to use the original, use it as a reference, or generate a new image.", es: "Envía una foto y elige si quieres usar la original, usarla como referencia o generar una nueva imagen." }, "Trocar foto": { en: "Change photo", es: "Cambiar foto" }, "Adicionar foto do produto": { en: "Add product photo", es: "Añadir foto del producto" }, "Toque aqui para escolher da galeria ou câmera": { en: "Tap here to choose from gallery or camera", es: "Toca aquí para elegir de la galería o cámara" }, "Imagem deste produto": { en: "Image for this product", es: "Imagen de este producto" }, "Usar foto": { en: "Use photo", es: "Usar foto" }, "Referência": { en: "Reference", es: "Referencia" }, "Gerar nova": { en: "Generate new", es: "Generar nueva" }, "Prévia pronta": { en: "Preview ready", es: "Vista previa lista" }, "Salvar produto": { en: "Save product", es: "Guardar producto" }, "Nova categoria": { en: "New category", es: "Nueva categoría" }, "Nome": { en: "Name", es: "Nombre" }, "Descrição": { en: "Description", es: "Descripción" }, "Ordem": { en: "Order", es: "Orden" }, "Ativa": { en: "Active", es: "Activa" }, "Todas categorias": { en: "All categories", es: "Todas las categorías" }, "Novo produto": { en: "New product", es: "Nuevo producto" }, "Preço": { en: "Price", es: "Precio" }, "Moeda": { en: "Currency", es: "Moneda" }, "SKU": { en: "SKU", es: "SKU" }, "Estoque": { en: "Inventory", es: "Inventario" }, "Categoria": { en: "Category", es: "Categoría" }, "Sem categoria": { en: "No category", es: "Sin categoría" }, "URL da imagem": { en: "Image URL", es: "URL de imagen" }, "Produto ativo (visível para a IA)": { en: "Active product (visible to AI)", es: "Producto activo (visible para la IA)" },
  "Treine sua IA": { en: "Train your AI", es: "Entrena tu IA" }, "Personalize a Auri com o conhecimento e o jeito da sua empresa. A camada central de qualidade e segurança não pode ser desativada pelo treinamento.": { en: "Customize Auri with your company's knowledge and style. The central quality and safety layer cannot be disabled by training.", es: "Personaliza Auri con el conocimiento y estilo de tu empresa. La capa central de calidad y seguridad no puede desactivarse mediante el entrenamiento." }, "Tutorial rápido": { en: "Quick tutorial", es: "Tutorial rápido" }, "Anterior": { en: "Previous", es: "Anterior" }, "Próximo": { en: "Next", es: "Siguiente" }, "Concluído": { en: "Completed", es: "Completado" }, "Nome de atendimento": { en: "Assistant name", es: "Nombre de atención" }, "Sobre minha empresa": { en: "About my company", es: "Sobre mi empresa" }, "Como quero que o atendimento responda": { en: "How I want customer service to respond", es: "Cómo quiero que responda la atención" }, "Orientações específicas da empresa": { en: "Company-specific instructions", es: "Instrucciones específicas de la empresa" }, "Usar respostas em áudio": { en: "Use audio responses", es: "Usar respuestas de audio" }, "Voz da Auri": { en: "Auri's voice", es: "Voz de Auri" }, "Nenhuma voz está disponível no catálogo do Nexus ainda.": { en: "No voice is available in the Nexus catalog yet.", es: "Aún no hay ninguna voz disponible en el catálogo de Nexus." }, "Suas informações são usadas somente pela sua empresa. Elas personalizam conhecimento e estilo, mas não podem desligar memória, veracidade, segurança, permissões, handoff humano, proteção de credenciais ou outras regras centrais da Auri.": { en: "Your information is used only by your company. It personalizes knowledge and style, but cannot disable memory, truthfulness, safety, permissions, human handoff, credential protection, or other core Auri rules.", es: "Tu información solo la usa tu empresa. Personaliza el conocimiento y el estilo, pero no puede desactivar la memoria, veracidad, seguridad, permisos, traspaso humano, protección de credenciales u otras reglas centrales de Auri." }, "Configuração por empresa, versão controlada e isolada.": { en: "Per-company configuration, controlled and isolated version.", es: "Configuración por empresa, versión controlada y aislada." },
  "WhatsApp bloqueado": { en: "WhatsApp blocked", es: "WhatsApp bloqueado" }, "Ative o Trial ou um plano pago para liberar a conexão do WhatsApp.": { en: "Activate the trial or a paid plan to unlock WhatsApp connection.", es: "Activa la prueba o un plan de pago para habilitar la conexión de WhatsApp." }, "Ver planos": { en: "View plans", es: "Ver planes" }, "Conectar WhatsApp": { en: "Connect WhatsApp", es: "Conectar WhatsApp" }, "Conecte o número que será utilizado pela sua IA. A conexão é feita diretamente pelo aplicativo.": { en: "Connect the number that will be used by your AI. The connection is made directly through the app.", es: "Conecta el número que utilizará tu IA. La conexión se realiza directamente desde la aplicación." }, "Número": { en: "Number", es: "Número" }, "Nome de exibição": { en: "Display name", es: "Nombre de visualización" }, "Instância": { en: "Instance", es: "Instancia" }, "Conectado em": { en: "Connected at", es: "Conectado el" }, "Desconectar": { en: "Disconnect", es: "Desconectar" }, "1. Dados do número": { en: "1. Number details", es: "1. Datos del número" }, "Informe o número que será conectado ao Assistente IA.": { en: "Enter the number that will be connected to the AI Assistant.", es: "Introduce el número que se conectará al Asistente IA." }, "Número do WhatsApp": { en: "WhatsApp number", es: "Número de WhatsApp" }, "Conectando...": { en: "Connecting…", es: "Conectando…" }, "Atualizar QR": { en: "Refresh QR", es: "Actualizar QR" }, "2. Escaneie o QR no WhatsApp": { en: "2. Scan the QR in WhatsApp", es: "2. Escanea el QR en WhatsApp" }, "Abra o WhatsApp no celular.": { en: "Open WhatsApp on your phone.", es: "Abre WhatsApp en tu teléfono." }, "Aparelhos conectados": { en: "Linked devices", es: "Dispositivos vinculados" }, "Conectar um aparelho": { en: "Link a device", es: "Vincular un dispositivo" }, "Aponte a câmera para o QR abaixo.": { en: "Point the camera at the QR below.", es: "Apunta la cámara al QR de abajo." }, "Verificar conexão": { en: "Check connection", es: "Verificar conexión" }, "Cancelar / trocar número": { en: "Cancel / change number", es: "Cancelar / cambiar número" }, "Depois de escanear, o sistema verifica automaticamente a conexão.": { en: "After scanning, the system automatically checks the connection.", es: "Después de escanear, el sistema verifica automáticamente la conexión." }, "Gerando QR de conexão...": { en: "Generating connection QR…", es: "Generando QR de conexión…" }, "A Evolution está preparando o QR.": { en: "Evolution is preparing the QR.", es: "Evolution está preparando el QR." }, "Atualizar": { en: "Refresh", es: "Actualizar" }, "WhatsApp ativo": { en: "WhatsApp active", es: "WhatsApp activo" }, "Seu número está conectado e pronto para receber e responder mensagens com a IA.": { en: "Your number is connected and ready to receive and reply to messages with AI.", es: "Tu número está conectado y listo para recibir y responder mensajes con IA." }, "Abrir catálogo": { en: "Open catalog", es: "Abrir catálogo" }, "Voltar ao painel": { en: "Back to dashboard", es: "Volver al panel" }, "Tentativa de conexão cancelada.": { en: "Connection attempt canceled.", es: "Intento de conexión cancelado." }, "Não foi possível cancelar a conexão": { en: "Could not cancel the connection", es: "No se pudo cancelar la conexión" }, "Desconectar este WhatsApp?": { en: "Disconnect this WhatsApp?", es: "¿Desconectar este WhatsApp?" }, "WhatsApp desconectado.": { en: "WhatsApp disconnected.", es: "WhatsApp desconectado." },

  "anual": { en: "annual", es: "anual" },
  "mensal": { en: "monthly", es: "mensual" },
  "teste": { en: "trial", es: "prueba" },
  "Erro": { en: "Error", es: "Error" },
  "Foto": { en: "Photo", es: "Foto" },
  "Editar": { en: "Edit", es: "Editar" },
  "Buscar…": { en: "Search…", es: "Buscar…" },
  "Próximo": { en: "Next", es: "Siguiente" },
  "Sessões": { en: "Sessions", es: "Sesiones" },
  "Sistema": { en: "System", es: "Sistema" },
  "IA Áudio": { en: "AI Audio", es: "IA de audio" },
  "Treinar IA": { en: "Train AI", es: "Entrenar IA" },
  "Já escaneei": { en: "I've scanned it", es: "Ya lo escaneé" },
  "Criar com IA": { en: "Create with AI", es: "Crear con IA" },
  "E-mail admin": { en: "Admin email", es: "Correo del administrador" },
  "Loja do João": { en: "João's Store", es: "Tienda de João" },
  "Módulo salvo": { en: "Module saved", es: "Módulo guardado" },
  "Novo produto": { en: "New product", es: "Nuevo producto" },
  "Novo briefing": { en: "New briefing", es: "Nuevo briefing" },
  "Não conectado": { en: "Not connected", es: "No conectado" },
  "Salvar perfil": { en: "Save profile", es: "Guardar perfil" },
  "Sem categoria": { en: "No category", es: "Sin categoría" },
  "Abrir catálogo": { en: "Open catalog", es: "Abrir catálogo" },
  "Briefing salvo": { en: "Briefing saved", es: "Briefing guardado" },
  "Conectar agora": { en: "Connect now", es: "Conectar ahora" },
  "Criar catálogo": { en: "Create catalog", es: "Crear catálogo" },
  "Editar produto": { en: "Edit product", es: "Editar producto" },
  "Erro ao salvar": { en: "Error saving", es: "Error al guardar" },
  "Nova categoria": { en: "New category", es: "Nueva categoría" },
  "Preço inválido": { en: "Invalid price", es: "Precio no válido" },
  "Produto criado": { en: "Product created", es: "Producto creado" },
  "Salvar empresa": { en: "Save company", es: "Guardar empresa" },
  "Ver assinatura": { en: "View subscription", es: "Ver suscripción" },
  "Ative seu plano": { en: "Activate your plan", es: "Activa tu plan" },
  "Buscar usuário…": { en: "Search user…", es: "Buscar usuario…" },
  "Editar briefing": { en: "Edit briefing", es: "Editar briefing" },
  "Escolha uma voz": { en: "Choose a voice", es: "Elige una voz" },
  "Falha no upload": { en: "Upload failed", es: "Error al subir" },
  "Foto do produto": { en: "Product photo", es: "Foto del producto" },
  "Informe a chave": { en: "Enter the key", es: "Introduce la clave" },
  "Logo da empresa": { en: "Company logo", es: "Logo de la empresa" },
  "Planos e preços": { en: "Plans and pricing", es: "Planes y precios" },
  "Remover produto": { en: "Remove product", es: "Eliminar producto" },
  "Categoria criada": { en: "Category created", es: "Categoría creada" },
  "Conexão pendente": { en: "Connection pending", es: "Conexión pendiente" },
  "Editar categoria": { en: "Edit category", es: "Editar categoría" },
  "Empresa sem nome": { en: "Company without a name", es: "Empresa sin nombre" },
  "Integração salva": { en: "Integration saved", es: "Integración guardada" },
  "Plano atualizado": { en: "Plan updated", es: "Plan actualizado" },
  "Produto removido": { en: "Product removed", es: "Producto eliminado" },
  "Excluir briefing?": { en: "Delete briefing?", es: "¿Eliminar briefing?" },
  "Finalizar conexão": { en: "Finish connection", es: "Finalizar conexión" },
  "Perfil atualizado": { en: "Profile updated", es: "Perfil actualizado" },
  "Personalize a voz": { en: "Customize the voice", es: "Personaliza la voz" },
  "Remover categoria": { en: "Remove category", es: "Eliminar categoría" },
  "WhatsApp, e-mail…": { en: "WhatsApp, email…", es: "WhatsApp, correo…" },
  "Categoria removida": { en: "Category removed", es: "Categoría eliminada" },
  "Clique em WhatsApp": { en: "Open WhatsApp", es: "Abre WhatsApp" },
  "Configuração salva": { en: "Configuration saved", es: "Configuración guardada" },
  "Em teste de 7 dias": { en: "7-day trial", es: "Prueba de 7 días" },
  "Empresa atualizada": { en: "Company updated", es: "Empresa actualizada" },
  "Produto atualizado": { en: "Product updated", es: "Producto actualizado" },
  "Serviços saudáveis": { en: "Healthy services", es: "Servicios saludables" },
  "Abrir administração": { en: "Open administration", es: "Abrir administración" },
  "Erro ao desconectar": { en: "Error disconnecting", es: "Error al desconectar" },
  "Informe sua empresa": { en: "Tell us about your company", es: "Informa sobre tu empresa" },
  "Mínimo 8 caracteres": { en: "Minimum 8 characters", es: "Mínimo 8 caracteres" },
  "WhatsApp conectado!": { en: "WhatsApp connected!", es: "¡WhatsApp conectado!" },
  "WhatsApp conectados": { en: "Connected WhatsApp", es: "WhatsApp conectados" },
  "Categoria atualizada": { en: "Category updated", es: "Categoría actualizada" },
  "Conecte seu WhatsApp": { en: "Connect your WhatsApp", es: "Conecta tu WhatsApp" },
  "Conversas da empresa": { en: "Company conversations", es: "Conversaciones de la empresa" },
  "Permissão atualizada": { en: "Permission updated", es: "Permiso actualizado" },
  "Acesso administrativo": { en: "Administrative access", es: "Acceso administrativo" },
  "Cadastre seu catálogo": { en: "Set up your catalog", es: "Configura tu catálogo" },
  "Usuários e permissões": { en: "Users and permissions", es: "Usuarios y permisos" },
  "Ative o áudio primeiro": { en: "Enable audio first", es: "Activa el audio primero" },
  "Baseado no plano ativo": { en: "Based on the active plan", es: "Basado en el plan activo" },
  "Conheça a configuração": { en: "Learn the setup", es: "Conoce la configuración" },
  "Personalizar aparência": { en: "Customize appearance", es: "Personalizar apariencia" },
  "Preencha nome e número": { en: "Enter name and number", es: "Completa nombre y número" },
  "Buscar por nome ou SKU…": { en: "Search by name or SKU…", es: "Buscar por nombre o SKU…" },
  "Enviando para Designer…": { en: "Sending to Designer…", es: "Enviando al Designer…" },
  "Erro ao iniciar conexão": { en: "Error starting connection", es: "Error al iniciar la conexión" },
  "Falha ao salvar produto": { en: "Failed to save product", es: "No se pudo guardar el producto" },
  "Auditoria de autenticação": { en: "Authentication audit", es: "Auditoría de autenticación" },
  "Erro ao atualizar conexão": { en: "Error updating connection", es: "Error al actualizar la conexión" },
  "Falha ao remover a imagem": { en: "Failed to remove image", es: "No se pudo eliminar la imagen" },
  "Buscar nome, CNPJ, e-mail…": { en: "Search name, tax ID, email…", es: "Buscar nombre, CNPJ, correo…" },
  "Configuração da Auri salva": { en: "Auri configuration saved", es: "Configuración de Auri guardada" },
  "Nenhum produto encontrado.": { en: "No products found.", es: "No se encontraron productos." },
  "Produto criado no catálogo": { en: "Product created in catalog", es: "Producto creado en el catálogo" },
  "Cadastros — últimos 14 dias": { en: "Sign-ups — last 14 days", es: "Registros — últimos 14 días" },
  "Erro ao atualizar permissão": { en: "Error updating permission", es: "Error al actualizar el permiso" },
  "Falha no Agente de Catálogo": { en: "Catalog Agent failed", es: "Error del Agente de Catálogo" },
  "Buscar e-mail, nome, empresa": { en: "Search email, name, company", es: "Buscar correo, nombre, empresa" },
  "Gerar imagem com IA Designer": { en: "Generate image with AI Designer", es: "Generar imagen con IA Designer" },
  "Imagem adicionada ao produto": { en: "Image added to product", es: "Imagen añadida al producto" },
  "Prompt específico do agente…": { en: "Agent-specific prompt…", es: "Prompt específico del agente…" },
  "Nome da empresa é obrigatório": { en: "Company name is required", es: "El nombre de la empresa es obligatorio" },
  "Conexão iniciada. Aguarde o QR.": { en: "Connection started. Wait for the QR.", es: "Conexión iniciada. Espera el QR." },
  "Nenhuma categoria criada ainda.": { en: "No categories created yet.", es: "Aún no hay categorías creadas." },
  "Tentativa de conexão cancelada.": { en: "Connection attempt canceled.", es: "Intento de conexión cancelado." },
  "Conecte seu WhatsApp para começar": { en: "Connect your WhatsApp to get started", es: "Conecta tu WhatsApp para comenzar" },
  "Empresa — Assistente IA de Vendas": { en: "Company — AI Sales Assistant", es: "Empresa — Asistente de Ventas IA" },
  "Não foi possível reproduzir a voz": { en: "Could not play the voice", es: "No se pudo reproducir la voz" },
  "QR gerado. Escaneie pelo WhatsApp.": { en: "QR generated. Scan it with WhatsApp.", es: "QR generado. Escanéalo con WhatsApp." },
  "Não foi possível cancelar a conexão": { en: "Could not cancel the connection", es: "No se pudo cancelar la conexión" },
  "Não foi possível iniciar o catálogo": { en: "Could not start the catalog", es: "No se pudo iniciar el catálogo" },
  "O WhatsApp ainda não está conectado": { en: "WhatsApp is not connected yet", es: "WhatsApp aún no está conectado" },
  "QR code real de conexão do WhatsApp": { en: "Real WhatsApp connection QR code", es: "Código QR real de conexión de WhatsApp" },
  "Meu perfil — Assistente IA de Vendas": { en: "My profile — AI Sales Assistant", es: "Mi perfil — Asistente de Ventas IA" },
  "Eventos de cobrança (webhooks Stripe)": { en: "Billing events (Stripe webhooks)", es: "Eventos de facturación (webhooks de Stripe)" },
  "Confirme seu plano e ciclo de cobrança.": { en: "Confirm your plan and billing cycle.", es: "Confirma tu plan y ciclo de facturación." },
  "Escaneie o QR para finalizar a conexão.": { en: "Scan the QR to finish the connection.", es: "Escanea el QR para finalizar la conexión." },
  "Catálogo — Assistente de Vendas WhatsApp": { en: "Catalog — WhatsApp Sales Assistant", es: "Catálogo — Asistente de Ventas WhatsApp" },
  "Painel administrativo — TW Design Studio": { en: "Admin panel — TW Design Studio", es: "Panel administrativo — TW Design Studio" },
  "Entrar — Assistente IA de Vendas WhatsApp": { en: "Sign in — AI WhatsApp Sales Assistant", es: "Iniciar sesión — Asistente de Ventas IA para WhatsApp" },
  "Painel — Assistente IA de Vendas WhatsApp": { en: "Dashboard — AI WhatsApp Sales Assistant", es: "Panel — Asistente de Ventas IA para WhatsApp" },
  "Não foi possível enviar para a IA Designer": { en: "Could not send to AI Designer", es: "No se pudo enviar a la IA Designer" },
  "Cadastre o número que receberá as conversas.": { en: "Set up the number that will receive conversations.", es: "Configura el número que recibirá las conversaciones." },
  "Assinatura — Assistente IA de Vendas WhatsApp": { en: "Subscription — AI WhatsApp Sales Assistant", es: "Suscripción — Asistente de Ventas IA para WhatsApp" },
  "Escaneie o QR code para finalizar a ativação.": { en: "Scan the QR code to finish activation.", es: "Escanea el código QR para finalizar la activación." },
  "Criar conta — Assistente IA de Vendas WhatsApp": { en: "Create account — AI WhatsApp Sales Assistant", es: "Crear cuenta — Asistente de Ventas IA para WhatsApp" },
  "Ex.: quero cadastrar um X-Burger por R$ 29,90…": { en: "E.g.: I want to add an X-Burger for R$ 29.90…", es: "Ej.: quiero registrar un X-Burger por R$ 29,90…" },
  "API Key do Nexus IA e URL compatível com OpenAI.": { en: "Nexus AI API key and OpenAI-compatible URL.", es: "Clave API de Nexus IA y URL compatible con OpenAI." },
  "Chave configurada — digite apenas para substituir": { en: "Key configured — type only to replace it", es: "Clave configurada — escribe solo para reemplazarla" },
  "Adicione produtos para a IA responder com preços reais.": { en: "Add products so AI can answer with real prices.", es: "Añade productos para que la IA responda con precios reales." },
  "Sua assinatura está pausada. Reative para liberar a IA.": { en: "Your subscription is paused. Reactivate it to unlock AI.", es: "Tu suscripción está pausada. Reactívala para habilitar la IA." },
  "Sem WhatsApp conectado a IA não consegue atender seus clientes.": { en: "Without connected WhatsApp, AI cannot serve your customers.", es: "Sin WhatsApp conectado, la IA no puede atender a tus clientes." },
  "Cole uma URL por linha de sites, imagens ou referências visuais.": { en: "Paste one URL per line for websites, images or visual references.", es: "Pega una URL por línea de sitios, imágenes o referencias visuales." },
  "A tentativa será encerrada automaticamente se não houver conexão.": { en: "The attempt will end automatically if there is no connection.", es: "El intento finalizará automáticamente si no hay conexión." },
  "Diga segmento, produtos, serviços e informações que a atendente precisa conhecer.": { en: "Tell us your industry, products, services and information the assistant needs to know.", es: "Indica el sector, productos, servicios e información que la asistente debe conocer." },
  "Tom de voz, forma de responder, como abordar clientes, como apresentar os serviços...": { en: "Tone of voice, response style, how to approach customers, how to present services...", es: "Tono de voz, forma de responder, cómo abordar clientes, cómo presentar los servicios..." },
  "URL base do seu UAZAPI/Evolution (ex.: https://api.seudominio.com) e token de instância.": { en: "Your UAZAPI/Evolution base URL (e.g. https://api.yourdomain.com) and instance token.", es: "URL base de tu UAZAPI/Evolution (ej.: https://api.tudominio.com) y token de instancia." },
  "Plataforma SaaS global: conecte o WhatsApp, ative agentes de IA e venda no piloto automático.": { en: "Global SaaS platform: connect WhatsApp, activate AI agents and sell on autopilot.", es: "Plataforma SaaS global: conecta WhatsApp, activa agentes de IA y vende en piloto automático." },
  "Você está configurando o conhecimento e as preferências que a Auri usa para atender sua empresa.": { en: "You are configuring the knowledge and preferences Auri uses to serve your company.", es: "Estás configurando el conocimiento y las preferencias que Auri usa para atender a tu empresa." },
  "Ative o áudio somente se quiser e escolha a voz que será usada quando a atendente decidir que falar é melhor.": { en: "Enable audio only if you want it and choose the voice used when the assistant decides speaking is better.", es: "Activa el audio solo si quieres y elige la voz que se usará cuando la asistente decida que hablar es mejor." },
  "Enviei a imagem para a IA Designer interna. Ela vai produzir a imagem e devolver o resultado para este produto.": { en: "I sent the image to the internal AI Designer. It will create the image and return the result to this product.", es: "Envié la imagen a la IA Designer interna. Creará la imagen y devolverá el resultado a este producto." },
  "Ex.: catálogo premium para WhatsApp, preto e dourado, 10 páginas, capa, categorias, produtos, combos e contato.": { en: "E.g.: premium WhatsApp catalog, black and gold, 10 pages, cover, categories, products, combos and contact.", es: "Ej.: catálogo premium para WhatsApp, negro y dorado, 10 páginas, portada, categorías, productos, combos y contacto." },
  "Escolha nome, tom e orientações. As regras centrais de qualidade, segurança e continuidade permanecem protegidas.": { en: "Choose the name, tone and guidelines. Core quality, safety and continuity rules remain protected.", es: "Elige el nombre, tono y orientaciones. Las reglas centrales de calidad, seguridad y continuidad permanecen protegidas." },
};

export function translateText(text: string) {
  const lang = i18n.language?.startsWith("en") ? "en" : i18n.language?.startsWith("es") ? "es" : "pt-BR";
  if (lang === "pt-BR") return text;
  return DIRECT_TRANSLATIONS[text]?.[lang] ?? text;
}

export function installDomTranslations() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  const translateNode = (node: Node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentElement;
    if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|SELECT|OPTION)$/.test(parent.tagName)) return;
    const original = node.nodeValue ?? "";
    const leading = original.match(/^\s*/)?.[0] ?? "";
    const trailing = original.match(/\s*$/)?.[0] ?? "";
    const core = original.trim();
    if (!core || !DIRECT_TRANSLATIONS[core]) return;
    const translated = translateText(core);
    node.nodeValue = `${leading}${translated}${trailing}`;
  };
  const scan = () => {
    document.body?.querySelectorAll("*").forEach((el) => {
      const element = el as HTMLElement;
      if (!["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"].includes(element.tagName)) {
        element.childNodes.forEach(translateNode);
      }
      for (const attr of ["placeholder", "title", "aria-label"]) {
        const value = element.getAttribute(attr);
        if (value && DIRECT_TRANSLATIONS[value]) element.setAttribute(attr, translateText(value));
      }
    });
    const lang = i18n.language?.startsWith("en") ? "en" : i18n.language?.startsWith("es") ? "es" : "pt-BR";
    document.documentElement.lang = lang;
  };
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) translateNode(n);
        else if (n.nodeType === Node.ELEMENT_NODE) (n as Element).querySelectorAll("*").forEach((el) => el.childNodes.forEach(translateNode));
      });
    }
  });
  const run = () => window.requestAnimationFrame(scan);
  if (document.body) { scan(); observer.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  i18n.on("languageChanged", run);
  return () => { observer.disconnect(); i18n.off("languageChanged", run); };
}

export function translateInterval(interval?: string | null) {
  if (interval === "yearly") return translateText("anual");
  if (interval === "monthly") return translateText("mensal");
  if (interval === "trial") return translateText("teste");
  return interval ? translateText(interval) : "—";
}

try {
  if (typeof window !== "undefined") window.localStorage.setItem("lang", savedLanguage);
} catch {}

if (i18n.isInitialized) {
  Object.entries(resources).forEach(([lang, value]) => {
    i18n.addResourceBundle(lang, "translation", value.translation, true, true);
  });
  void i18n.changeLanguage(savedLanguage);
} else {
  i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage,
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
