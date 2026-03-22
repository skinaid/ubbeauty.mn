import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";
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
    <div className="app-shell">
      <header className="app-shell__header">
        <nav className="app-shell__nav">
          <span className="app-shell__brand">MarTech</span>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/billing">Billing</Link>
          <Link href="/pricing">Pricing</Link>
          {showSystemAdminNav ? (
            <Link href="/admin" className="app-shell__nav-link--accent">
              System admin
            </Link>
          ) : null}
        </nav>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </header>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
