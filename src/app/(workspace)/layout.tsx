import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { signOutAction } from "@/modules/auth/actions";
import { getCurrentUser } from "@/modules/auth/session";
import { hasActiveSystemAdminRecord } from "@/modules/admin/guard";
import { isInternalOpsEmail } from "@/lib/internal-ops";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const showSystemAdminNav =
    Boolean(user.id) &&
    (isInternalOpsEmail(user.email) || (await hasActiveSystemAdminRecord(user.id)));

  const navItems = [
    { href: "/pulse", label: "Pulse" },
    { href: "/schedule", label: "Schedule" },
    { href: "/patients", label: "Patients" },
    { href: "/checkout", label: "Checkout" },
    { href: "/settings", label: "Settings" },
    ...(showSystemAdminNav
      ? [{ href: "/admin", label: "System Admin", accent: true }]
      : []),
  ];

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="app-shell__sidebar">
        <Link href="/pulse" className="app-shell__logo-link">
          <Image
            src="/brand/logo.svg"
            alt="UbBeauty"
            width={140}
            height={40}
            className="app-shell__logo"
            priority
          />
        </Link>

        <SidebarNav items={navItems} />

        <form action={signOutAction} className="app-shell__signout">
          <Button type="submit" variant="outline-white" size="sm" full>
            Sign out
          </Button>
        </form>
      </aside>

      {/* Main content */}
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
