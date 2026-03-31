import Link from "next/link";
import type { ReactNode } from "react";
import { requireInternalOpsActor } from "@/modules/admin/guard";

export const dynamic = "force-dynamic";

export default async function InternalOpsLayout({ children }: { children: ReactNode }) {
  await requireInternalOpsActor();

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <header style={{ borderBottom: "1px solid #e2e8f0", padding: "1rem 2rem", background: "#fff" }}>
        <nav style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
          <strong style={{ marginRight: "0.5rem" }}>Internal ops (transitional)</strong>
          <Link href="/admin">System admin</Link>
          <Link href="/admin/organizations">Organizations</Link>
          <Link href="/admin/jobs">Sync &amp; analysis</Link>
          <Link href="/admin/billing">Billing</Link>
          <Link href="/dashboard" style={{ marginLeft: "auto", color: "#64748b" }}>
            ← App dashboard
          </Link>
        </nav>
      </header>
      <div style={{ padding: "1.5rem 2rem", maxWidth: 1200, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
