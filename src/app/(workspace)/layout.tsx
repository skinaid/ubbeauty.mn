import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Button, Logo } from "@/components/ui";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { signOutAction } from "@/modules/auth/actions";
import { getCurrentUser } from "@/modules/auth/session";
import { hasActiveSystemAdminRecord } from "@/modules/admin/guard";
import { getClinicActorOrNull } from "@/modules/clinic/guard";
import { getClinicWorkspaceNavItems } from "@/modules/clinic/workspace-access";
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
  const clinicActor = await getClinicActorOrNull();

  const navItems = [
    ...(clinicActor ? getClinicWorkspaceNavItems(clinicActor.role) : [{ href: "/pulse", label: "Pulse" }]),
    ...(showSystemAdminNav
      ? [{ href: "/admin", label: "System Admin", accent: true }]
      : []),
  ];

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__sidebar-top">
          <Link href="/pulse" className="app-shell__logo-link">
            <Logo size="md" />
          </Link>
        </div>

        <SidebarNav items={navItems} />

        <form action={signOutAction} className="app-shell__signout">
          <Button type="submit" variant="outline-white" size="sm" full>
            Sign out
          </Button>
        </form>
      </aside>

      <main className="app-shell__main">{children}</main>
    </div>
  );
}
