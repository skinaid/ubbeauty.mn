-- System admin control plane: DB-backed role model
-- Replaces env-var-only allowlist with a proper table.
-- Env var (MARTECH_INTERNAL_OPS_EMAILS) remains as bootstrap seed only.

CREATE TABLE public.system_admins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('super_admin', 'operator', 'viewer')),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  granted_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;
-- No client-facing RLS policies. All access via service role.

CREATE TRIGGER set_system_admins_updated_at
  BEFORE UPDATE ON public.system_admins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_system_admins_email ON public.system_admins (email);
