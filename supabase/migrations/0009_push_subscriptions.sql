-- Web Push subscriptions. A customer who opts in stores their browser's push
-- endpoint here; the send-push function (service role) fans out to all of them.
create table if not exists push_subscriptions (
  id bigint generated always as identity primary key,
  device_id uuid,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- Anyone may subscribe (insert their own endpoint). Reads/deletes are admin
-- only; the serverless sender uses the service role and bypasses RLS anyway.
create policy "anyone can subscribe" on push_subscriptions
  for insert with check (true);

create policy "admin reads subscriptions" on push_subscriptions
  for select to authenticated using (true);
