"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function VisualPageError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[VisualPage error]", error);
  }, [error]);

  return (
    <div className="page-content">
      <div className="bm-error-page">
        <div className="bm-error-page__icon">⚠️</div>
        <h2 className="bm-error-page__title">Visual DNA ачааллаж чадсангүй</h2>
        <p className="bm-error-page__desc">
          {error.message ?? "Тодорхойгүй алдаа гарлаа. Дахин оролдоно уу."}
        </p>
        <div className="bm-error-page__actions">
          <Button variant="primary" onClick={reset}>Дахин оролдох</Button>
          <Link href="/brand-managers">
            <Button variant="secondary">Буцах</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
