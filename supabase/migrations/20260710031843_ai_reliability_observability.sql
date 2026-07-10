create extension if not exists pg_cron;

create table if not exists public.sift_ai_analysis_events (
  request_id uuid primary key,
  created_at timestamptz not null default now(),
  provider text check (provider is null or provider in ('gemini', 'openai', 'nvidia')),
  model text,
  prompt_version text not null,
  schema_version text not null,
  outcome text not null check (outcome in ('success', 'fallback', 'quota_rejected')),
  failure_code text check (failure_code is null or char_length(failure_code) <= 80),
  latency_ms integer not null check (latency_ms >= 0),
  image_bytes integer not null check (image_bytes >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  thinking_tokens integer check (thinking_tokens is null or thinking_tokens >= 0),
  dish_count smallint check (dish_count is null or dish_count >= 0),
  image_readability text check (
    image_readability is null or image_readability in ('clear', 'partially_clear', 'poor')
  ),
  plan_id text not null check (plan_id in ('free', 'plus', 'pro', 'family'))
);

comment on table public.sift_ai_analysis_events is
  'Privacy-minimized operational metrics. Never stores users, allergy profiles, menu text, prompts, images, or model output.';

create index if not exists sift_ai_analysis_events_created_at_idx
  on public.sift_ai_analysis_events (created_at desc);

create index if not exists sift_ai_analysis_events_outcome_created_at_idx
  on public.sift_ai_analysis_events (outcome, created_at desc);

alter table public.sift_ai_analysis_events enable row level security;
alter table public.sift_ai_analysis_events force row level security;

revoke all on table public.sift_ai_analysis_events from public, anon, authenticated;
grant select, insert, delete on table public.sift_ai_analysis_events to service_role;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'sift-prune-ai-analysis-events';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'sift-prune-ai-analysis-events',
    '15 3 * * *',
    $command$delete from public.sift_ai_analysis_events where created_at < now() - interval '30 days'$command$
  );
end;
$$;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role';
  end if;
end;
$$;
