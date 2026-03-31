export type QPayEnv = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  invoiceCode: string;
};

export function getQPayEnv(): QPayEnv | null {
  const baseUrl = (process.env.QPAY_BASE_URL ?? "").replace(/\/$/, "");
  const clientId = process.env.QPAY_CLIENT_ID ?? "";
  const clientSecret = process.env.QPAY_CLIENT_SECRET ?? "";
  const invoiceCode = process.env.QPAY_INVOICE_CODE ?? "";

  if (!baseUrl || !clientId || !clientSecret || !invoiceCode) {
    return null;
  }

  return { baseUrl, clientId, clientSecret, invoiceCode };
}

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) {
    return explicit;
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel}`;
  }
  return "http://localhost:3000";
}
