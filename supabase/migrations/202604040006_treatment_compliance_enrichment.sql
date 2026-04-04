alter table public.treatment_records
  add column if not exists consent_artifact_url text null,
  add column if not exists before_photo_url text null,
  add column if not exists after_photo_url text null,
  add column if not exists complication_notes text null,
  add column if not exists follow_up_outcome text null;
