-- Run in a dedicated Supabase project's SQL Editor.
-- After creating the sole owner in Authentication > Users, add that user's UUID
-- to board_owners with the separate command in README.md.

create schema if not exists private;

create table if not exists public.board_owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.board_owners enable row level security;
revoke all on public.board_owners from anon, authenticated;

create or replace function public.is_board_owner()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.board_owners
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_board_owner() from public, anon;
grant execute on function public.is_board_owner() to authenticated;

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  title text not null check (length(btrim(title)) between 1 and 100),
  description text not null default '' check (length(description) <= 500),
  share_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  title text not null default '' check (length(title) <= 160),
  body text not null default '' check (length(body) <= 10000),
  image_path text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  constraint post_has_content check (length(btrim(title)) > 0 or length(btrim(body)) > 0 or image_path is not null)
);
create index if not exists board_posts_order_idx on public.board_posts(board_id, sort_order, created_at);

alter table public.boards enable row level security;
alter table public.board_posts enable row level security;
revoke all on public.boards, public.board_posts from anon;
grant select, insert, update, delete on public.boards, public.board_posts to authenticated;

drop policy if exists boards_owner_select on public.boards;
create policy boards_owner_select on public.boards for select to authenticated
using (owner_id = (select auth.uid()) and (select public.is_board_owner()));
drop policy if exists boards_owner_insert on public.boards;
create policy boards_owner_insert on public.boards for insert to authenticated
with check (owner_id = (select auth.uid()) and (select public.is_board_owner()));
drop policy if exists boards_owner_update on public.boards;
create policy boards_owner_update on public.boards for update to authenticated
using (owner_id = (select auth.uid()) and (select public.is_board_owner()))
with check (owner_id = (select auth.uid()) and (select public.is_board_owner()));
drop policy if exists boards_owner_delete on public.boards;
create policy boards_owner_delete on public.boards for delete to authenticated
using (owner_id = (select auth.uid()) and (select public.is_board_owner()));

drop policy if exists posts_owner_select on public.board_posts;
create policy posts_owner_select on public.board_posts for select to authenticated
using ((select public.is_board_owner()) and exists (
  select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())
));
drop policy if exists posts_owner_insert on public.board_posts;
create policy posts_owner_insert on public.board_posts for insert to authenticated
with check ((select public.is_board_owner()) and exists (
  select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())
));
drop policy if exists posts_owner_update on public.board_posts;
create policy posts_owner_update on public.board_posts for update to authenticated
using ((select public.is_board_owner()) and exists (
  select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())
))
with check ((select public.is_board_owner()) and exists (
  select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())
));
drop policy if exists posts_owner_delete on public.board_posts;
create policy posts_owner_delete on public.board_posts for delete to authenticated
using ((select public.is_board_owner()) and exists (
  select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())
));

create or replace function public.get_shared_board(p_token uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'board', jsonb_build_object(
      'id', b.id, 'title', b.title, 'description', b.description,
      'share_token', b.share_token
    ),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'title', p.title, 'body', p.body,
        'image_path', p.image_path, 'sort_order', p.sort_order
      ) order by p.sort_order, p.created_at, p.id)
      from public.board_posts p where p.board_id = b.id
    ), '[]'::jsonb)
  )
  from public.boards b
  where b.share_token = p_token;
$$;
revoke all on function public.get_shared_board(uuid) from public;
grant execute on function public.get_shared_board(uuid) to anon, authenticated;

create or replace function public.move_board_post(p_post_id uuid, p_direction integer)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_board_id uuid;
  v_ids uuid[];
  v_position integer;
  v_other uuid;
  v_index integer;
begin
  if p_direction not in (-1, 1) then raise exception 'Invalid direction'; end if;
  select b.id into v_board_id
  from public.board_posts p join public.boards b on b.id = p.board_id
  where p.id = p_post_id and b.owner_id = (select auth.uid())
    and (select public.is_board_owner())
  for update of b;
  if v_board_id is null then raise exception 'Post unavailable'; end if;
  select array_agg(id order by sort_order, created_at, id) into v_ids
  from public.board_posts where board_id = v_board_id;
  v_position := array_position(v_ids, p_post_id);
  if v_position + p_direction < 1 or v_position + p_direction > array_length(v_ids, 1) then return; end if;
  v_other := v_ids[v_position + p_direction];
  v_ids[v_position + p_direction] := p_post_id;
  v_ids[v_position] := v_other;
  for v_index in 1..array_length(v_ids, 1) loop
    update public.board_posts set sort_order = v_index where id = v_ids[v_index];
  end loop;
end;
$$;
revoke all on function public.move_board_post(uuid, integer) from public, anon;
grant execute on function public.move_board_post(uuid, integer) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-images', 'board-images', true, 5242880, array['image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists board_images_owner_select on storage.objects;
create policy board_images_owner_select on storage.objects for select to authenticated
using (bucket_id = 'board-images' and (select public.is_board_owner())
  and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists board_images_owner_insert on storage.objects;
create policy board_images_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'board-images' and (select public.is_board_owner())
  and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists board_images_owner_delete on storage.objects;
create policy board_images_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'board-images' and (select public.is_board_owner())
  and (storage.foldername(name))[1] = (select auth.uid())::text);
