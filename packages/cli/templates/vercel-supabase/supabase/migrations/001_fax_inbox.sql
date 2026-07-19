-- Fax inbox + recovery for Vercel/Supabase BYOC.
-- Ledger tables come from @holiday-cfo/store-postgres migrations.

create table if not exists fax_inbox (
  file_id text primary key,
  event_name text not null,
  payload_json jsonb not null,
  storage_path text,
  status text not null check (status in ('received', 'stored', 'processing', 'submitted', 'failed', 'dead')),
  error text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fax_inbox_status_idx on fax_inbox (status, received_at);
