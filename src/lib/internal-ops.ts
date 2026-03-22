/**
 * Env allowlist for legacy internal ops and bootstrap — not a full RBAC product.
 * See `docs/admin-auth-v1.md` for how this interacts with `system_admins` and `/admin`.
 */
export function isInternalOpsEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  const raw = process.env.MARTECH_INTERNAL_OPS_EMAILS ?? "";
  const allowed = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  if (allowed.size === 0) {
    return false;
  }
  return allowed.has(email.toLowerCase());
}
