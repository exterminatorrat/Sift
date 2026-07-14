create or replace function public.sift_claim_menu_scan_limits(
  p_user_id uuid,
  p_plan_id text,
  p_scan_limit integer,
  p_user_limit integer,
  p_global_limit integer
)
returns table (
  allowed boolean,
  rejection_reason text,
  monthly_scan_count integer,
  monthly_scan_limit integer,
  month_start date,
  user_scan_count integer,
  user_scan_limit integer,
  global_scan_count integer,
  global_scan_limit integer,
  minute_start timestamptz,
  retry_after_seconds integer
)
language plpgsql
set search_path = public
as $$
declare
  v_month_start date := date_trunc('month', statement_timestamp())::date;
  v_minute_start timestamptz := date_trunc('minute', statement_timestamp());
  v_monthly_scan_count integer;
  v_user_scan_count integer;
  v_global_scan_count integer;
  v_retry_after_seconds integer;
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

  if p_user_limit is null or p_user_limit < 1 or p_user_limit > 60 then
    raise exception 'invalid user_limit';
  end if;

  if p_global_limit is null or p_global_limit < 1 or p_global_limit > 600 then
    raise exception 'invalid global_limit';
  end if;

  insert into public.sift_scan_usage_monthly (user_id, month_start, scan_count)
  values (p_user_id, v_month_start, 0)
  on conflict on constraint sift_scan_usage_monthly_pkey do nothing;

  select m.scan_count
  into v_monthly_scan_count
  from public.sift_scan_usage_monthly m
  where m.user_id = p_user_id
    and m.month_start = v_month_start
  for update;

  if v_monthly_scan_count >= p_scan_limit then
    return query select
      false,
      'monthly_quota_reached',
      v_monthly_scan_count,
      p_scan_limit,
      v_month_start,
      0,
      p_user_limit,
      0,
      p_global_limit,
      v_minute_start,
      0;
    return;
  end if;

  insert into public.sift_scan_usage_minute_global (minute_start, scan_count)
  values (v_minute_start, 0)
  on conflict on constraint sift_scan_usage_minute_global_pkey do nothing;

  select g.scan_count
  into v_global_scan_count
  from public.sift_scan_usage_minute_global g
  where g.minute_start = v_minute_start
  for update;

  insert into public.sift_scan_usage_minute_user (user_id, minute_start)
  values (p_user_id, v_minute_start)
  on conflict on constraint sift_scan_usage_minute_user_pkey do nothing;

  select u.scan_count
  into v_user_scan_count
  from public.sift_scan_usage_minute_user u
  where u.user_id = p_user_id
    and u.minute_start = v_minute_start
  for update;

  v_retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from ((v_minute_start + interval '1 minute') - clock_timestamp())))::integer
  );

  if v_global_scan_count >= p_global_limit then
    return query select
      false,
      'global_minute_limit',
      v_monthly_scan_count,
      p_scan_limit,
      v_month_start,
      v_user_scan_count,
      p_user_limit,
      v_global_scan_count,
      p_global_limit,
      v_minute_start,
      v_retry_after_seconds;
    return;
  end if;

  if v_user_scan_count >= p_user_limit then
    return query select
      false,
      'user_minute_limit',
      v_monthly_scan_count,
      p_scan_limit,
      v_month_start,
      v_user_scan_count,
      p_user_limit,
      v_global_scan_count,
      p_global_limit,
      v_minute_start,
      v_retry_after_seconds;
    return;
  end if;

  update public.sift_scan_usage_minute_global g
  set scan_count = g.scan_count + 1,
      updated_at = now()
  where g.minute_start = v_minute_start
  returning g.scan_count into v_global_scan_count;

  update public.sift_scan_usage_minute_user u
  set scan_count = u.scan_count + 1,
      updated_at = now()
  where u.user_id = p_user_id
    and u.minute_start = v_minute_start
  returning u.scan_count into v_user_scan_count;

  update public.sift_scan_usage_monthly m
  set scan_count = m.scan_count + 1,
      updated_at = now()
  where m.user_id = p_user_id
    and m.month_start = v_month_start
  returning m.scan_count into v_monthly_scan_count;

  return query select
    true,
    null::text,
    v_monthly_scan_count,
    p_scan_limit,
    v_month_start,
    v_user_scan_count,
    p_user_limit,
    v_global_scan_count,
    p_global_limit,
    v_minute_start,
    0;
end;
$$;

revoke all on function public.sift_claim_menu_scan_limits(uuid, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.sift_claim_menu_scan_limits(uuid, text, integer, integer, integer)
  to service_role;
