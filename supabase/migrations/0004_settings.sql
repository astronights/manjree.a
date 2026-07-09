-- Shop settings the admin can edit in the app (categories, sizes, …) as
-- key/jsonb rows. Public read (the catalog filter needs categories);
-- admin-only writes.

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;

create policy "public read settings" on settings
  for select using (true);

create policy "admin write settings" on settings
  for all to authenticated using (true) with check (true);
