alter table public.content_blocks
alter column product_id drop not null;

alter table public.content_blocks
add column if not exists link_url text,
add column if not exists image_url text,
add column if not exists price_text text,
add column if not exists discount_text text;

update public.content_blocks cb
set link_url = coalesce(
  cb.link_url,
  (
    select al.affiliate_url
    from public.affiliate_links al
    where al.product_id = cb.product_id
      and al.is_current = true
      and al.health_status = 'ok'
    order by al.generated_at desc
    limit 1
  ),
  (
    select pm.origin_product_url
    from public.products_master pm
    where pm.id = cb.product_id
    limit 1
  )
);
