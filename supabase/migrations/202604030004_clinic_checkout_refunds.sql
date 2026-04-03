-- Clinic POS refund support
-- Adds ledger direction so payment and refund events can live in one table.

alter table public.clinic_checkout_payments
  add column if not exists payment_kind text not null default 'payment'
  check (payment_kind in ('payment', 'refund'));

create index if not exists clinic_checkout_payments_kind_idx
  on public.clinic_checkout_payments (organization_id, payment_kind, paid_at desc);
