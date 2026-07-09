-- Per-piece price visibility and lightweight collections ("Diwali 2026",
-- "Summer Cottons") for grouping festive/seasonal stock.

alter table products add column if not exists show_price boolean not null default true;
alter table products add column if not exists collection text;
