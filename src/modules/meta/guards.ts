import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

/** Thrown when user has no organization (e.g. pre-setup). Use instanceof, not string match. */
export class OrgNotFoundError extends Error {
  readonly code = "ORG_NOT_FOUND" as const;
  constructor() {
    super("Organization not found");
    this.name = "OrgNotFoundError";
  }
}

export async function requireCurrentUserOrganization() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) {
    throw new OrgNotFoundError();
  }

  return { user, organization };
}
