create table if not exists public.sift_user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null default 'free' check (plan_id in ('free', 'plus', 'pro', 'family')),
  source text not null default 'default' check (source in ('default', 'test', 'app_store', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sift_scan_usage_monthly (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  scan_count integer not null default 0 check (scan_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);

alter table public.sift_user_entitlements enable row level security;
alter table public.sift_scan_usage_monthly enable row level security;

revoke all on table public.sift_user_entitlements from anon, authenticated;
revoke all on table public.sift_scan_usage_monthly from anon, authenticated;
grant all on table public.sift_user_entitlements to service_role;
grant all on table public.sift_scan_usage_monthly to service_role;

create or replace function public.sift_get_or_create_entitlement(p_user_id uuid)
returns table (
  plan_id text,
  source text
)
language plpgsql
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  insert into public.sift_user_entitlements (user_id, plan_id, source)
  values (p_user_id, 'free', 'default')
  on conflict (user_id) do nothing;

  return query
  select e.plan_id, e.source
  from public.sift_user_entitlements e
  where e.user_id = p_user_id;
end;
$$;

create or replace function public.sift_set_test_entitlement(
  p_user_id uuid,
  p_plan_id text
)
returns table (
  plan_id text,
  source text
)
language plpgsql
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_plan_id not in ('free', 'plus', 'pro', 'family') then
    raise exception 'invalid plan_id';
  end if;

  insert into public.sift_user_entitlements (user_id, plan_id, source, updated_at)
  values (p_user_id, p_plan_id, 'test', now())
  on conflict (user_id) do update
    set plan_id = excluded.plan_id,
        source = 'test',
        updated_at = now();

  return query
  select e.plan_id, e.source
  from public.sift_user_entitlements e
  where e.user_id = p_user_id;
end;
$$;

create or replace function public.sift_claim_menu_scan(
  p_user_id uuid,
  p_plan_id text,
  p_scan_limit integer
)
returns table (
  allowed boolean,
  scan_count integer,
  scan_limit integer,
  month_start date
)
language plpgsql
set search_path = public
as $$
declare
  v_month_start date := date_trunc('month', now())::date;
  v_scan_count integer;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_plan_id not in ('free', 'plus', 'pro', 'family') then
    raise exception 'invalid plan_id';
  end if;

  if p_scan_limit is null or p_scan_limit < 1 then
    raise exception 'invalid scan_limit';
  end if;

  insert into public.sift_user_entitlements (user_id, plan_id, source)
  values (p_user_id, p_plan_id, 'default')
  on conflict (user_id) do nothing;

  insert into public.sift_scan_usage_monthly (user_id, month_start, scan_count)
  values (p_user_id, v_month_start, 0)
  on conflict (user_id, month_start) do nothing;

  update public.sift_scan_usage_monthly u
  set scan_count = u.scan_count + 1,
      updated_at = now()
  where u.user_id = p_user_id
    and u.month_start = v_month_start
    and u.scan_count < p_scan_limit
  returning u.scan_count into v_scan_count;

  if v_scan_count is null then
    select u.scan_count
    into v_scan_count
    from public.sift_scan_usage_monthly u
    where u.user_id = p_user_id
      and u.month_start = v_month_start;

    return query select false, coalesce(v_scan_count, 0), p_scan_limit, v_month_start;
    return;
  end if;

  return query select true, v_scan_count, p_scan_limit, v_month_start;
end;
$$;

revoke all on function public.sift_get_or_create_entitlement(uuid) from public, anon, authenticated;
revoke all on function public.sift_set_test_entitlement(uuid, text) from public, anon, authenticated;
revoke all on function public.sift_claim_menu_scan(uuid, text, integer) from public, anon, authenticated;

grant execute on function public.sift_get_or_create_entitlement(uuid) to service_role;
grant execute on function public.sift_set_test_entitlement(uuid, text) to service_role;
grant execute on function public.sift_claim_menu_scan(uuid, text, integer) to service_role;
