import type { StaffRole } from "./types";

export type ClinicWorkspaceNavItem = {
  href: string;
  label: string;
  accent?: boolean;
};

type WorkspaceRouteConfig = ClinicWorkspaceNavItem & {
  allowedRoles: StaffRole[];
};

const WORKSPACE_ROUTE_CONFIG: WorkspaceRouteConfig[] = [
  {
    href: "/pulse",
    label: "Pulse",
    allowedRoles: ["owner", "manager", "front_desk", "provider", "assistant", "billing"]
  },
  {
    href: "/schedule",
    label: "Schedule",
    allowedRoles: ["owner", "manager", "front_desk", "provider", "assistant"]
  },
  {
    href: "/patients",
    label: "Patients",
    allowedRoles: ["owner", "manager", "front_desk", "provider", "assistant", "billing"]
  },
  {
    href: "/treatments",
    label: "Treatments",
    allowedRoles: ["owner", "manager", "provider", "assistant"]
  },
  {
    href: "/checkout",
    label: "Checkout",
    allowedRoles: ["owner", "manager", "front_desk", "billing"]
  },
  {
    href: "/billing",
    label: "Billing",
    allowedRoles: ["owner", "manager", "front_desk", "billing"]
  },
  {
    href: "/notifications",
    label: "Notifications",
    allowedRoles: ["owner", "manager", "front_desk", "provider", "assistant", "billing"]
  },
  {
    href: "/reports",
    label: "Reports",
    allowedRoles: ["owner", "manager", "front_desk", "billing"]
  },
  {
    href: "/clinic",
    label: "Clinic",
    allowedRoles: ["owner", "manager"]
  }
];

export function canAccessClinicWorkspaceRoute(role: StaffRole, pathname: string) {
  const route = WORKSPACE_ROUTE_CONFIG.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  if (!route) {
    return false;
  }

  return route.allowedRoles.includes(role);
}

export function getClinicWorkspaceNavItems(role: StaffRole): ClinicWorkspaceNavItem[] {
  return WORKSPACE_ROUTE_CONFIG.filter((item) => item.allowedRoles.includes(role)).map((item) => ({
    href: item.href,
    label: item.label,
    accent: item.accent
  }));
}
