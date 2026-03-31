-- Phase 7 hardening: verification audit trail on invoices (reconciliation / retries / recovery)

alter table public.invoices
  add column if not exists verification_attempt_count integer not null default 0 check (verification_attempt_count >= 0),
  add column if not exists last_verification_at timestamptz null,
  add column if not exists last_verification_outcome text null;

comment on column public.invoices.verification_attempt_count is 'Number of provider verification round-trips (payment/check); for retries and reconciliation.';
comment on column public.invoices.last_verification_at is 'Last time we called the payment provider to verify this invoice.';
comment on column public.invoices.last_verification_outcome is 'Short outcome code from last verification (e.g. paid_confirmed, not_paid_yet, qpay_error).';
