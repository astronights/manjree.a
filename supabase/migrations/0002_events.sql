-- Anonymous analytics events. Customers have no login: each browser gets a
-- random device id (localStorage) and records product views and WhatsApp
-- enquiry clicks against it. Anyone may insert; only the signed-in admin may
-- read, so per-device activity is never exposed publicly.

create table if not exists events (
  id bigint generated always as identity primary key,
  device_id uuid not null,
  product_id uuid not null references products(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'enquiry')),
  created_at timestamptz not null default now()
);

create index if not exists events_product_idx on events (product_id);
create index if not exists events_device_idx on events (device_id);

alter table events enable row level security;

create policy "anyone can record events" on events
  for insert with check (true);

create policy "admin read events" on events
  for select to authenticated using (true);
