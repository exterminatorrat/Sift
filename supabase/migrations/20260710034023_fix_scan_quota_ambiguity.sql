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
  on conflict on constraint sift_scan_usage_monthly_pkey do nothing;

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

revoke all on function public.sift_claim_menu_scan(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.sift_claim_menu_scan(uuid, text, integer) to service_role;
