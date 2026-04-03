alter table public.link_pages
add column if not exists profile_title text,
add column if not exists profile_intro text,
add column if not exists profile_notice text,
add column if not exists profile_image_url text;

update public.link_pages
set
  profile_title = coalesce(profile_title, blocks #>> '{0,title}'),
  profile_intro = coalesce(profile_intro, blocks #>> '{0,intro}'),
  profile_notice = coalesce(profile_notice, blocks #>> '{0,notice}'),
  profile_image_url = coalesce(profile_image_url, blocks #>> '{0,imageUrl}');

alter table public.link_pages
alter column profile_title set default '',
alter column profile_intro set default '',
alter column profile_notice set default '',
alter column profile_image_url set default '/images/profile-main.jpg';

update public.link_pages
set
  profile_title = coalesce(profile_title, ''),
  profile_intro = coalesce(profile_intro, ''),
  profile_notice = coalesce(profile_notice, ''),
  profile_image_url = coalesce(profile_image_url, '/images/profile-main.jpg');

alter table public.link_pages
alter column profile_title set not null,
alter column profile_intro set not null,
alter column profile_notice set not null,
alter column profile_image_url set not null;
