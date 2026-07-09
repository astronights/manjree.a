-- Three-state availability: in stock / sold out / available on order.
-- Replaces the in_stock boolean, which is kept (unused) so builds deployed
-- before this migration keep working; a later migration can drop it.

alter table products add column if not exists stock_status text not null default 'in_stock'
  check (stock_status in ('in_stock', 'sold_out', 'on_order'));

update products set stock_status = 'sold_out' where in_stock = false;
