-- Manjree's catalog schema. Run in the Supabase SQL editor of a fresh
-- project, then create the admin user under Authentication → Users and set
-- VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in the app's environment.

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  price numeric not null default 0,
  category text not null default 'Other',
  sizes text[] not null default '{}',
  images text[] not null default '{}',
  is_new_arrival boolean not null default false,
  new_until timestamptz,
  in_stock boolean not null default true,
  is_draft boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

-- Anyone can browse published pieces; only signed-in admins see drafts or write.
create policy "public read published" on products
  for select using (is_draft = false);

create policy "admin read all" on products
  for select to authenticated using (true);

create policy "admin write" on products
  for all to authenticated using (true) with check (true);

-- Public bucket for product photos; only admins upload/delete.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public read images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "admin upload images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

create policy "admin delete images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');
