import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { signOutAction } from "@/modules/auth/actions";
import { getCurrentUser } from "@/modules/auth/session";
import { hasActiveSystemAdminRecord } from "@/modules/admin/guard";
import { isInternalOpsEmail } from "@/lib/internal-ops";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const showSystemAdminNav =
    Boolean(user.id) &&
    (isInternalOpsEmail(user.email) || (await hasActiveSystemAdminRecord(user.id)));

  return (
    <div>
      <header
        style={{
          padding: "1rem 2rem",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between"
        }}
      >
        <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <strong>MarTech</strong>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/billing">Billing</Link>
          <Link href="/pricing">Pricing</Link>
          {showSystemAdminNav ? (
            <Link href="/admin" style={{ color: "#7c3aed" }}>
              System admin
            </Link>
          ) : null}
        </nav>
        <form action={signOutAction}>
          <button type="submit">Sign out</button>
        </form>
      </header>
      <main style={{ padding: "2rem" }}>{children}</main>
    </div>
  );
}
