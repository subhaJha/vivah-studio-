create table public.studio_payment_events (
  fingerprint text primary key check (fingerprint ~ '^[a-f0-9]{64}$'),
  provider_order text not null references public.orders on delete cascade,
  received_at timestamptz not null default now()
);
alter table public.studio_payment_events enable row level security;
revoke all on public.studio_payment_events from public, anon, authenticated;
grant all on public.studio_payment_events to service_role;

create function public.process_studio_payment(p_event text,p_payment text,p_order text,p_status text,p_amount integer)
returns text language plpgsql set search_path='' as $$
declare expected integer;
begin
  select amount into expected from public.orders where provider_order=p_order for update;
  if not found then return 'unknown_order'; end if;
  if expected<>p_amount or p_status not in ('captured','failed') then return 'mismatch'; end if;
  insert into public.studio_payment_events(fingerprint,provider_order) values(p_event,p_order) on conflict do nothing;
  if not found then return 'duplicate'; end if;
  if exists(select 1 from public.payments where provider_payment=p_payment and provider_order<>p_order) then
    return 'mismatch';
  end if;
  if p_status='captured' and exists(
    select 1 from public.payments where provider_order=p_order and status='captured' and provider_payment<>p_payment
  ) then return 'duplicate'; end if;
  perform public.record_studio_payment(p_payment,p_order,p_status);
  return 'recorded';
end $$;
revoke execute on function public.process_studio_payment(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.process_studio_payment(text,text,text,text,integer) to service_role;

alter table public.rsvp_responses add column submission_id uuid;
alter table public.rsvp_responses add unique(invitation,submission_id);

create function public.submit_studio_rsvp_once(p_slug text,p_bucket text,p_response jsonb,p_submission uuid)
returns text language plpgsql set search_path='' as $$
declare target uuid; attempts integer;
begin
  select invitation into target from public.publications where slug=p_slug and snapshot->>'rsvp'='true' for share;
  if not found then return 'closed'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text||p_submission::text,0));
  if exists(select 1 from public.rsvp_responses where invitation=target and submission_id=p_submission) then
    return 'accepted';
  end if;
  insert into public.rsvp_limits values(p_bucket,date_trunc('hour',now()),1)
    on conflict(bucket,window_start) do update set requests=public.rsvp_limits.requests+1 returning requests into attempts;
  if attempts>5 then return 'limited'; end if;
  insert into public.rsvp_responses(invitation,name,attending,guests,message,submission_id)
    values(target,p_response->>'name',(p_response->>'attending')::boolean,(p_response->>'guests')::integer,p_response->>'message',p_submission);
  return 'accepted';
end $$;
revoke execute on function public.submit_studio_rsvp_once(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.submit_studio_rsvp_once(text,text,jsonb,uuid) to service_role;
