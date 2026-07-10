-- Sale pricing: price stays the regular price; a sale sets sale_price below
-- it. Null (or >= price) means not on sale.

alter table products add column if not exists sale_price numeric;
