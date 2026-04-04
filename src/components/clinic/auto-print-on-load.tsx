"use client";

import { useEffect, useRef } from "react";

export function AutoPrintOnLoad({ enabled }: { enabled: boolean }) {
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasPrintedRef.current) return;

    hasPrintedRef.current = true;
    const handle = window.setTimeout(() => {
      window.print();
    }, 150);

    return () => window.clearTimeout(handle);
  }, [enabled]);

  return null;
}
