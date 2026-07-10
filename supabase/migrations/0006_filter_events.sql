-- Track which filters customers use (searches, sizes, categories, …).
-- Filter events have no product, so product_id becomes nullable and the
-- event carries a jsonb payload like {"kind": "size", "value": "40"}.

alter table events alter column product_id drop not null;
alter table events add column if not exists payload jsonb;

alter table events drop constraint events_event_type_check;
alter table events add constraint events_event_type_check
  check (event_type in ('view', 'enquiry', 'filter'));
