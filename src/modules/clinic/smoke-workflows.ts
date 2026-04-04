import type { StaffRole } from "./types";
import { canAccessClinicWorkspaceRoute } from "./workspace-access";

export type ClinicRoleSmokeWorkflow = {
  role: StaffRole;
  label: string;
  requiredRoutes: string[];
  forbiddenRoutes: string[];
  handoffRoutes: string[];
};

const CLINIC_ROLE_SMOKE_WORKFLOWS: Record<StaffRole, ClinicRoleSmokeWorkflow> = {
  owner: {
    role: "owner",
    label: "Owner daily clinic command flow",
    requiredRoutes: [
      "/pulse",
      "/schedule",
      "/patients",
      "/treatments",
      "/checkout",
      "/billing",
      "/notifications",
      "/reports",
      "/clinic"
    ],
    forbiddenRoutes: [],
    handoffRoutes: ["/schedule", "/treatments", "/checkout", "/reports"]
  },
  manager: {
    role: "manager",
    label: "Manager operational oversight flow",
    requiredRoutes: [
      "/pulse",
      "/schedule",
      "/patients",
      "/treatments",
      "/checkout",
      "/billing",
      "/notifications",
      "/reports",
      "/clinic"
    ],
    forbiddenRoutes: [],
    handoffRoutes: ["/schedule", "/patients", "/checkout", "/reports"]
  },
  front_desk: {
    role: "front_desk",
    label: "Front desk appointment to POS flow",
    requiredRoutes: ["/pulse", "/schedule", "/patients", "/checkout", "/billing", "/notifications", "/reports"],
    forbiddenRoutes: ["/treatments", "/clinic"],
    handoffRoutes: ["/schedule", "/patients", "/checkout"]
  },
  provider: {
    role: "provider",
    label: "Provider consultation to treatment flow",
    requiredRoutes: ["/pulse", "/schedule", "/patients", "/treatments", "/notifications"],
    forbiddenRoutes: ["/checkout", "/billing", "/reports", "/clinic"],
    handoffRoutes: ["/schedule", "/patients", "/treatments"]
  },
  assistant: {
    role: "assistant",
    label: "Assistant clinical support flow",
    requiredRoutes: ["/pulse", "/schedule", "/patients", "/treatments", "/notifications"],
    forbiddenRoutes: ["/checkout", "/billing", "/reports", "/clinic"],
    handoffRoutes: ["/schedule", "/patients", "/treatments"]
  },
  billing: {
    role: "billing",
    label: "Billing collection and reconciliation flow",
    requiredRoutes: ["/pulse", "/patients", "/checkout", "/billing", "/notifications", "/reports"],
    forbiddenRoutes: ["/schedule", "/treatments", "/clinic"],
    handoffRoutes: ["/patients", "/checkout", "/billing", "/reports"]
  }
};

export function getClinicRoleSmokeWorkflow(role: StaffRole): ClinicRoleSmokeWorkflow {
  return CLINIC_ROLE_SMOKE_WORKFLOWS[role];
}

export function getAllClinicRoleSmokeWorkflows(): ClinicRoleSmokeWorkflow[] {
  return Object.values(CLINIC_ROLE_SMOKE_WORKFLOWS);
}

export function isClinicRoleWorkflowConsistent(role: StaffRole) {
  const workflow = getClinicRoleSmokeWorkflow(role);

  return (
    workflow.requiredRoutes.every((route) => canAccessClinicWorkspaceRoute(role, route)) &&
    workflow.forbiddenRoutes.every((route) => !canAccessClinicWorkspaceRoute(role, route)) &&
    workflow.handoffRoutes.every((route) => workflow.requiredRoutes.includes(route))
  );
}

export function getConsumerBookingSmokeFlow() {
  return {
    label: "Consumer discovery to clinic operations handoff",
    publicRoutes: ["/", "/clinics", "/clinics/[slug]", "/book/[slug]"],
    workspaceHandoffRoutes: ["/schedule", "/patients", "/checkout", "/reports"]
  };
}
