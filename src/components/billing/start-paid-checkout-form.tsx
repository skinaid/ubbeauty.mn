"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Card } from "@/components/ui";
import { startPaidPlanCheckoutAction, type StartCheckoutState } from "@/modules/billing/actions";

type Props = {
  organizationId: string;
  planId: string;
  planLabel: string;
  disabled?: boolean;
};

const initial: StartCheckoutState = {};

export function StartPaidCheckoutForm({ organizationId, planId, planLabel, disabled = false }: Props) {
  const [state, formAction, pending] = useActionState(startPaidPlanCheckoutAction, initial);

  return (
    <div className="ui-form-block">
      <form action={formAction} className="ui-form-inline--row">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="planId" value={planId} />
        <Button type="submit" variant="primary" disabled={pending || disabled}>
          {pending ? "QPay нэхэмжлэл үүсгэж байна..." : `QPay-аар төлөх — ${planLabel}`}
        </Button>
      </form>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.checkout ? (
        <Card padded stack>
          <p style={{ margin: 0 }}>
            <strong>Нэхэмжлэл {state.checkout.invoiceId.slice(0, 8)}…</strong> · {state.checkout.amount} {state.checkout.currency}
          </p>
          <p className="ui-text-muted" style={{ margin: 0 }}>
            {state.checkout.callbackNote}
          </p>
          {state.checkout.paymentUrl ? (
            <p style={{ margin: 0 }}>
              <a href={state.checkout.paymentUrl} rel="noopener noreferrer" className="ui-table__link">
                Банкны апп холбоос нээх
              </a>
            </p>
          ) : null}
          {state.checkout.bankAppLinks.length > 0 ? (
            <details style={{ marginTop: "var(--space-2)" }}>
              <summary className="ui-text-muted" style={{ cursor: "pointer", fontSize: "var(--text-sm)" }}>
                Бүх банкны deeplink ({state.checkout.bankAppLinks.length})
              </summary>
              <ul style={{ margin: "var(--space-2) 0 0", paddingLeft: "1.1rem", fontSize: "var(--text-sm)" }}>
                {state.checkout.bankAppLinks.map((l, i) => (
                  <li key={i}>
                    {l.link ? (
                      <a href={l.link} rel="noopener noreferrer" className="ui-table__link">
                        {l.name ?? l.description ?? "Bank"}
                      </a>
                    ) : (
                      l.name ?? l.description ?? "Bank"
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {state.checkout.qrImageDataUrl ? (
            <div style={{ marginTop: "var(--space-2)" }}>
              <p className="ui-text-faint" style={{ margin: "0 0 var(--space-2)" }}>
                Банкны апп-аараа QR уншуулж төлнө үү
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.checkout.qrImageDataUrl} alt="QPay QR" width={200} height={200} style={{ maxWidth: "100%" }} />
            </div>
          ) : state.checkout.qrText ? (
            <p className="ui-text-muted" style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", wordBreak: "break-all" }}>
              QR payload: {state.checkout.qrText.slice(0, 120)}…
            </p>
          ) : null}
          <p className="ui-text-faint" style={{ margin: "var(--space-3) 0 0" }}>
            Төлбөрийн дараа <Link href="/billing" className="ui-table__link">Billing</Link> хэсгээс нэхэмжлэлийн төлөвөө
            шалгана уу. Subscription нь төлбөр баталгаажсаны дараа идэвхжинэ.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
