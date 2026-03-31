export type SystemAdminRole = "super_admin" | "operator" | "viewer";

const ROLE_LEVEL: Record<SystemAdminRole, number> = {
  viewer: 0,
  operator: 1,
  super_admin: 2,
};

export function hasMinRole(actual: SystemAdminRole, required: SystemAdminRole): boolean {
  return ROLE_LEVEL[actual] >= ROLE_LEVEL[required];
}

export function isValidRole(value: string): value is SystemAdminRole {
  return value in ROLE_LEVEL;
}
