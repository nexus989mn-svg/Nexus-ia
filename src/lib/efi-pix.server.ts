import https from "node:https";
import { Buffer } from "node:buffer";

const EFI_URL = "https://pix.api.efipay.com.br";
const EFI_PIX_WEBHOOK =
  "https://n8nv4.duckdns.org/webhook/efi-pix-pagamentos?ignorar=";

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável ${name} não configurada.`);
  return value;
}

function request<T>(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<{ status: number; data: T }> {
  const u = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: `${u.pathname}${u.search}`,
        method,
        headers,
        pfx: Buffer.from(env("EFI_CERTIFICATE_BASE64").replace(/\s+/g, ""), "base64"),
        passphrase: process.env.EFI_CERTIFICATE_PASSWORD || "",
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");

          let data: any = null;

          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = raw;
          }

          resolve({
            status: res.statusCode || 0,
            data,
          });
        });
      }
    );

    req.on("error", reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

let cachedToken:
  | {
      token: string;
      expiresAt: number;
    }
  | null = null;

async function getEfiToken() {
  if (
    cachedToken &&
    cachedToken.expiresAt > Date.now() + 30_000
  ) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(
    `${env("EFI_CLIENT_ID")}:${env("EFI_CLIENT_SECRET")}`
  ).toString("base64");

  const response = await request<{
    access_token?: string;
    expires_in?: number;
    error?: string;
  }>(
    `${EFI_URL}/oauth/token`,
    "POST",
    {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    {
      grant_type: "client_credentials",
    }
  );

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !response.data?.access_token
  ) {
    throw new Error(
      `Erro OAuth Efí: ${response.data?.error || response.status}`
    );
  }

  cachedToken = {
    token: response.data.access_token,
    expiresAt:
      Date.now() +
      Math.max(Number(response.data.expires_in || 3600) - 60, 60) *
        1000,
  };

  return cachedToken.token;
}

export async function efiRequest<T>(
  path: string,
  method: string,
  body?: unknown
) {
  const token = await getEfiToken();

  const response = await request<T>(
    `${EFI_URL}${path}`,
    method,
    {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Efí HTTP ${response.status}: ${JSON.stringify(response.data)}`
    );
  }

  return response.data;
}

async function registerEfiPixWebhook() {
  const key = env("EFI_PIX_KEY");

  return efiRequest<any>(
    `/v2/webhook/${encodeURIComponent(key)}`,
    "PUT",
    {
      webhookUrl: EFI_PIX_WEBHOOK,
    }
  );
}

export async function createEfiPixCharge(params: {
  amount: number;
  userId: string;
  planCode: string;
  planName: string;
}) {
  // Garante que a chave Pix usada pela cobrança esteja
  // vinculada ao webhook de confirmação da Efí.
  await registerEfiPixWebhook();

  const charge = await efiRequest<any>(
    "/v2/cob",
    "POST",
    {
      calendario: {
        expiracao: 3600,
      },
      valor: {
        original: Number(params.amount).toFixed(2),
      },
      chave: env("EFI_PIX_KEY"),
      solicitacaoPagador:
        `Assinatura AURI IA - ${params.planName}`,
      infoAdicionais: [
        {
          nome: "AURI_USER_ID",
          valor: params.userId,
        },
        {
          nome: "AURI_PLAN_CODE",
          valor: params.planCode,
        },
      ],
    }
  );

  const qrCode = await efiRequest<any>(
    `/v2/loc/${charge.loc.id}/qrcode`,
    "GET"
  );

  return {
    txid: charge.txid,
    status: charge.status,
    valor: charge.valor?.original,
    pixCopiaECola: qrCode.qrcode,
    imagemQrcode: qrCode.imagemQrcode,
    linkVisualizacao: qrCode.linkVisualizacao,
    expiracao: 3600,
  };
}

export async function consultarEfiPix(txid: string) {
  return efiRequest<any>(
    `/v2/cob/${encodeURIComponent(txid)}`,
    "GET"
  );
}
