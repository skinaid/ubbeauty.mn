"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function BrandManagersError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[BrandManagers error]", error);
  }, [error]);

  return (
    <div className="page-content">
      <div className="bm-error-page">
        <div className="bm-error-page__icon">⚠️</div>
        <h2 className="bm-error-page__title">Хуудас ачааллаж чадсангүй</h2>
        <p className="bm-error-page__desc">
          {error.message ?? "Тодорхойгүй алдаа гарлаа. Дахин оролдоно уу."}
        </p>
        <div className="bm-error-page__actions">
          <Button variant="primary" onClick={reset}>Дахин оролдох</Button>
          <Link href="/dashboard">
            <Button variant="secondary">Dashboard руу буцах</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
