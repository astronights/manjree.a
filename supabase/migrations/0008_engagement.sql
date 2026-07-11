-- Trending order support + favourite events.
--
-- 1. Allow a 'favorite' event (a customer saving a piece with the ♥).
alter table events drop constraint events_event_type_check;
alter table events add constraint events_event_type_check
  check (event_type in ('view', 'enquiry', 'filter', 'favorite'));

-- 2. Public per-product engagement aggregate for the "Trending" catalog order.
--    events are admin-only readable (they hold device ids); this
--    security-definer function exposes ONLY aggregate counts, so anonymous
--    shoppers can rank by popularity without seeing any per-device data.
create or replace function public.product_engagement(since_days int default 30)
returns table (product_id uuid, views bigint, enquiries bigint, saves bigint)
language sql
security definer
set search_path = public
as $$
  select product_id,
         count(*) filter (where event_type = 'view')     as views,
         count(*) filter (where event_type = 'enquiry')  as enquiries,
         count(*) filter (where event_type = 'favorite') as saves
  from events
  where product_id is not null
    and created_at >= now() - make_interval(days => since_days)
  group by product_id
$$;

grant execute on function public.product_engagement(int) to anon, authenticated;
