import { describe, expect, it } from "vitest";
import { isProtectedPath } from "@/lib/supabase/middleware";
import {
  getAllClinicRoleSmokeWorkflows,
  getClinicRoleSmokeWorkflow,
  getConsumerBookingSmokeFlow,
  isClinicRoleWorkflowConsistent
} from "./smoke-workflows";

describe("clinic role smoke workflows", () => {
  it("keeps every role workflow internally consistent", () => {
    for (const workflow of getAllClinicRoleSmokeWorkflows()) {
      expect(isClinicRoleWorkflowConsistent(workflow.role)).toBe(true);
    }
  });

  it("protects every required workspace route in the smoke matrix", () => {
    for (const workflow of getAllClinicRoleSmokeWorkflows()) {
      for (const route of workflow.requiredRoutes) {
        expect(isProtectedPath(route)).toBe(true);
      }
    }
  });

  it("captures the intended front desk operational handoff", () => {
    expect(getClinicRoleSmokeWorkflow("front_desk")).toEqual({
      role: "front_desk",
      label: "Front desk appointment to POS flow",
      requiredRoutes: [
        "/pulse",
        "/schedule",
        "/patients",
        "/checkout",
        "/billing",
        "/notifications",
        "/reports"
      ],
      forbiddenRoutes: ["/treatments", "/clinic"],
      handoffRoutes: ["/schedule", "/patients", "/checkout"]
    });
  });
});

describe("consumer booking smoke flow", () => {
  it("keeps discovery pages public and the clinic handoff protected", () => {
    const flow = getConsumerBookingSmokeFlow();

    for (const route of flow.publicRoutes) {
      expect(isProtectedPath(route)).toBe(false);
    }

    for (const route of flow.workspaceHandoffRoutes) {
      expect(isProtectedPath(route)).toBe(true);
    }
  });
});
