-- Shared scenery community: profiles, content, interactions, and private photos.
-- Run this migration in a Supabase project before selecting the supabase backend.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  bio text not null default '',
  avatar_color text not null default 'forest'
    check (avatar_color in ('clay', 'forest', 'lake', 'sun', 'plum', 'ink')),
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.profile_emails (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique
);

create table if not exists public.sceneries (
  id text primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  story text not null,
  location jsonb not null,
  tags text[] not null default '{}',
  image_path text not null,
  image_alt text,
  image_credit jsonb,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  quality_status text check (quality_status in ('pass', 'review', 'reject')),
  quality_score integer not null default 0,
  quality_checks jsonb,
  quality_issues text[] not null default '{}',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_note text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sceneries_author_created_idx
  on public.sceneries (author_id, created_at desc);
create index if not exists sceneries_moderation_created_idx
  on public.sceneries (moderation_status, created_at desc);

create table if not exists public.likes (
  scenery_id text not null references public.sceneries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (scenery_id, user_id)
);

create table if not exists public.ratings (
  scenery_id text not null references public.sceneries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (scenery_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  scenery_id text not null references public.sceneries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists comments_scenery_created_idx
  on public.comments (scenery_id, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.can_view_scenery(p_scenery_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sceneries
    where id = p_scenery_id
      and (
        moderation_status = 'approved'
        or author_id = auth.uid()
        or public.is_admin()
      )
  );
$$;

create or replace function public.can_view_scenery_image(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sceneries
    where image_path = p_object_name
      and public.can_view_scenery(id)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, bio, avatar_color)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nickname', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'bio', ''), '正在收集属于自己的合肥风景。'),
    coalesce(nullif(new.raw_user_meta_data ->> 'avatar_color', ''), 'forest')
  )
  on conflict (id) do nothing;

  insert into public.profile_emails (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do update set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.review_scenery(
  p_scenery_id text,
  p_decision text,
  p_review_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '只有管理员可以审核作品。';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception '审核状态无效。';
  end if;

  update public.sceneries
  set moderation_status = p_decision,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_note = coalesce(p_review_note, '')
  where id = p_scenery_id;

  if not found then
    raise exception '这份风景不存在。';
  end if;
end;
$$;

create or replace function public.set_user_status(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '只有管理员可以管理用户。';
  end if;

  if p_user_id = auth.uid() then
    raise exception '不能修改自己的账户状态。';
  end if;

  if p_status not in ('active', 'suspended') then
    raise exception '账户状态无效。';
  end if;

  update public.profiles set status = p_status where id = p_user_id;
  if not found then
    raise exception '用户不存在。';
  end if;
end;
$$;

create or replace function public.set_user_role(
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '只有管理员可以管理用户。';
  end if;

  if p_user_id = auth.uid() then
    raise exception '不能修改自己的管理员角色。';
  end if;

  if p_role not in ('user', 'admin') then
    raise exception '用户角色无效。';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception '用户不存在。';
  end if;
end;
$$;

create or replace function public.toggle_like(p_scenery_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  liked boolean;
begin
  if not public.is_active_user() then
    raise exception '请先登录有效账户。';
  end if;

  if not public.can_view_scenery(p_scenery_id) then
    raise exception '无法操作这份风景。';
  end if;

  select exists (
    select 1
    from public.likes
    where scenery_id = p_scenery_id and user_id = auth.uid()
  ) into liked;

  if liked then
    delete from public.likes
    where scenery_id = p_scenery_id and user_id = auth.uid();
    return false;
  end if;

  insert into public.likes (scenery_id, user_id)
  values (p_scenery_id, auth.uid());
  return true;
end;
$$;

alter table public.profiles enable row level security;
alter table public.profile_emails enable row level security;
alter table public.sceneries enable row level security;
alter table public.likes enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "email is visible to self or admins" on public.profile_emails;
create policy "email is visible to self or admins"
  on public.profile_emails for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "visible sceneries are readable" on public.sceneries;
create policy "visible sceneries are readable"
  on public.sceneries for select
  using (
    moderation_status = 'approved'
    or author_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "active users can submit sceneries" on public.sceneries;
create policy "active users can submit sceneries"
  on public.sceneries for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active_user()
    and moderation_status = 'pending'
  );

drop policy if exists "authors can delete their sceneries" on public.sceneries;
create policy "authors can delete their sceneries"
  on public.sceneries for delete
  to authenticated
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists "visible likes are readable" on public.likes;
create policy "visible likes are readable"
  on public.likes for select
  using (public.can_view_scenery(scenery_id));

drop policy if exists "users can add their likes" on public.likes;
create policy "users can add their likes"
  on public.likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and public.can_view_scenery(scenery_id)
  );

drop policy if exists "users can remove their likes" on public.likes;
create policy "users can remove their likes"
  on public.likes for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "visible ratings are readable" on public.ratings;
create policy "visible ratings are readable"
  on public.ratings for select
  using (public.can_view_scenery(scenery_id));

drop policy if exists "users can add their ratings" on public.ratings;
create policy "users can add their ratings"
  on public.ratings for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and public.can_view_scenery(scenery_id)
  );

drop policy if exists "users can update their ratings" on public.ratings;
create policy "users can update their ratings"
  on public.ratings for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and public.can_view_scenery(scenery_id)
  );

drop policy if exists "visible comments are readable" on public.comments;
create policy "visible comments are readable"
  on public.comments for select
  using (public.can_view_scenery(scenery_id));

drop policy if exists "active users can post comments" on public.comments;
create policy "active users can post comments"
  on public.comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and public.can_view_scenery(scenery_id)
  );

drop policy if exists "users can delete their comments" on public.comments;
create policy "users can delete their comments"
  on public.comments for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.sceneries, public.likes, public.ratings, public.comments to anon, authenticated;
grant select on public.profile_emails to authenticated;
grant insert on public.sceneries, public.likes, public.ratings, public.comments to authenticated;
grant update on public.ratings to authenticated;
grant delete on public.sceneries, public.likes, public.comments to authenticated;
grant execute on function public.can_view_scenery(text) to anon, authenticated;
grant execute on function public.can_view_scenery_image(text) to anon, authenticated;
grant execute on function public.review_scenery(text, text, text) to authenticated;
grant execute on function public.set_user_status(uuid, text) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.toggle_like(text) to authenticated;

insert into storage.buckets (id, name, public)
values ('scenery-images', 'scenery-images', false)
on conflict (id) do update set public = false;

drop policy if exists "scenery images are visible when the work is visible" on storage.objects;
create policy "scenery images are visible when the work is visible"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'scenery-images'
    and public.can_view_scenery_image(name)
  );

drop policy if exists "users can upload their pending scenery images" on storage.objects;
create policy "users can upload their pending scenery images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'scenery-images'
    and public.is_active_user()
    and name like ('pending/' || auth.uid()::text || '/%')
  );

drop policy if exists "users can delete their scenery images" on storage.objects;
create policy "users can delete their scenery images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'scenery-images'
    and (
      owner_id = auth.uid()
      or public.is_admin()
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sceneries'
  ) then
    alter publication supabase_realtime add table public.sceneries;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'likes'
  ) then
    alter publication supabase_realtime add table public.likes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ratings'
  ) then
    alter publication supabase_realtime add table public.ratings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end
$$;
