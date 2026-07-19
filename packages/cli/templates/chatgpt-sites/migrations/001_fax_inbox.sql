-- Sites fax inbox only. NOT a holiday ledger schema.
create table if not exists fax_inbox (
  file_id text primary key,
  event_name text not null,
  payload_json text not null,
  r2_key text,
  status text not null check (status in ('received', 'stored', 'failed', 'exported', 'dead')),
  error text,
  received_at text not null,
  updated_at text not null
);

create table if not exists review_export (
  id text primary key,
  file_id text not null,
  draft_json text not null,
  status text not null check (status in ('pending', 'accepted', 'rejected', 'exported')),
  created_at text not null
);
