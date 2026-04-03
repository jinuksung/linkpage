create sequence if not exists public.products_master_sequence_no_seq;

alter table public.products_master
add column if not exists sequence_no bigint;

alter table public.products_master
alter column sequence_no set default nextval('public.products_master_sequence_no_seq');

update public.products_master
set sequence_no = nextval('public.products_master_sequence_no_seq')
where sequence_no is null;

alter table public.products_master
alter column sequence_no set not null;

create unique index if not exists ux_products_master_sequence_no
on public.products_master(sequence_no);
