/**
 * QPay Merchant API client (OAuth token + invoice + payment verification).
 * @see https://developer.qpay.mn/
 */
import type { QPayEnv } from "@/modules/billing/qpay-env";

type TokenCache = { accessToken: string; expiresAtMs: number };
let tokenCache: TokenCache | null = null;

function basicAuthHeader(clientId: string, clientSecret: string): string {
  const raw = `${clientId}:${clientSecret}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

export async function qpayFetchAccessToken(env: QPayEnv): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAtMs - 60_000) {
    return tokenCache.accessToken;
  }

  const res = await fetch(`${env.baseUrl}/v2/auth/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(env.clientId, env.clientSecret),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const body = (await res.json().catch((parseErr: unknown) => {
    console.warn("[qpay] Token response JSON parse failed:", parseErr instanceof Error ? parseErr.message : parseErr);
    return {};
  })) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`QPay token error ${res.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }

  const accessToken =
    (typeof body.access_token === "string" && body.access_token) ||
    (typeof body.token === "string" && body.token) ||
    null;
  if (!accessToken) {
    throw new Error("QPay token response missing access_token");
  }

  const expiresIn =
    typeof body.expires_in === "number" ? body.expires_in : typeof body.expires_in === "string" ? parseInt(body.expires_in, 10) : 3600;

  tokenCache = {
    accessToken,
    expiresAtMs: now + Math.max(60, expiresIn) * 1000
  };

  return accessToken;
}

export type QPayCreateInvoiceInput = {
  senderInvoiceNo: string;
  receiverCode: string;
  receiverName?: string;
  description: string;
  amount: number;
  currency: string;
  callbackUrl: string;
  /** ISO date YYYY-MM-DD */
  dueDate?: string;
};

export type QPayCreateInvoiceResult = {
  invoiceId: string;
  qrText: string | null;
  qrImageBase64: string | null;
  urls: Array<{ name?: string; description?: string; link?: string }>;
  raw: Record<string, unknown>;
};

export async function qpayCreateInvoice(env: QPayEnv, input: QPayCreateInvoiceInput): Promise<QPayCreateInvoiceResult> {
  const token = await qpayFetchAccessToken(env);

  const lineUnit = input.amount.toFixed(2);
  const payload: Record<string, unknown> = {
    invoice_code: env.invoiceCode,
    sender_invoice_no: input.senderInvoiceNo,
    invoice_receiver_code: input.receiverCode.slice(0, 45),
    invoice_description: input.description.slice(0, 255),
    callback_url: input.callbackUrl.slice(0, 255),
    amount: input.amount,
    lines: [
      {
        line_description: input.description.slice(0, 255),
        line_quantity: "1.00",
        line_unit_price: lineUnit
      }
    ]
  };

  if (input.receiverName) {
    payload.invoice_receiver_data = { name: input.receiverName.slice(0, 100) };
  }
  if (input.dueDate) {
    payload.invoice_due_date = input.dueDate;
  }

  const res = await fetch(`${env.baseUrl}/v2/invoice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const raw = (await res.json().catch((parseErr: unknown) => {
    console.warn("[qpay] Invoice response JSON parse failed:", parseErr instanceof Error ? parseErr.message : parseErr);
    return {};
  })) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`QPay invoice create ${res.status}: ${JSON.stringify(raw).slice(0, 800)}`);
  }

  const invoiceId = typeof raw.invoice_id === "string" ? raw.invoice_id : null;
  if (!invoiceId) {
    throw new Error("QPay invoice response missing invoice_id");
  }

  const qrText = typeof raw.qr_text === "string" ? raw.qr_text : null;
  const qrImageBase64 = typeof raw.qr_image === "string" ? raw.qr_image : null;
  const urls = Array.isArray(raw.urls) ? (raw.urls as QPayCreateInvoiceResult["urls"]) : [];

  return { invoiceId, qrText, qrImageBase64, urls, raw };
}

export type QPayPaidRow = {
  payment_id: string;
  payment_status: string;
  payment_amount: string | number;
  payment_currency?: string;
  payment_date?: string;
};

export type QPayPaymentCheckResult = {
  count: number;
  paidAmount: number;
  rows: QPayPaidRow[];
  raw: Record<string, unknown>;
};

export async function qpayCheckInvoicePayments(env: QPayEnv, qpayInvoiceId: string): Promise<QPayPaymentCheckResult> {
  const token = await qpayFetchAccessToken(env);

  const res = await fetch(`${env.baseUrl}/v2/payment/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: qpayInvoiceId,
      offset: { page_number: 1, page_limit: 100 }
    })
  });

  const raw = (await res.json().catch((parseErr: unknown) => {
    console.warn("[qpay] Payment check response JSON parse failed:", parseErr instanceof Error ? parseErr.message : parseErr);
    return {};
  })) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`QPay payment/check ${res.status}: ${JSON.stringify(raw).slice(0, 800)}`);
  }

  const count = typeof raw.count === "number" ? raw.count : Number(raw.count ?? 0);
  const paidAmount = typeof raw.paid_amount === "number" ? raw.paid_amount : Number(raw.paid_amount ?? 0);
  const rowsRaw = Array.isArray(raw.rows) ? raw.rows : [];
  const rows: QPayPaidRow[] = rowsRaw.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      payment_id: String(o.payment_id ?? ""),
      payment_status: String(o.payment_status ?? ""),
      payment_amount: (o.payment_amount as string | number) ?? 0,
      payment_currency: typeof o.payment_currency === "string" ? o.payment_currency : undefined,
      payment_date: typeof o.payment_date === "string" ? o.payment_date : undefined
    };
  });

  return { count, paidAmount, rows, raw };
}
