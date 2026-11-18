create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default ''
);
create function public.init_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id) values(new.id) on conflict do nothing; return new; end $$;
create trigger studio_profile after insert on auth.users for each row execute function public.init_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;

create table public.templates (
  id text primary key, title text not null, price integer not null check(price>0), active boolean not null default true
);
insert into public.templates(id,title,price) values
 ('royal-bengali','Royal Bengali',99900),('ivory-dreams','Ivory Dreams',69900),
 ('palace-affair','Palace Affair',149900),('blush-bloom','Blush & Bloom',89900),
 ('golden-hour','Golden Hour',79900),('midnight-vows','Midnight Vows',129900);

create table public.invitations (
  id uuid primary key default gen_random_uuid(), owner uuid not null references public.profiles on delete cascade,
  template text not null references public.templates, draft jsonb not null, revision integer not null default 1,
  updated_at timestamptz not null default now()
);
create index on public.invitations(owner,updated_at desc);
create table public.publications (
  slug text primary key check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 72),
  invitation uuid not null unique references public.invitations on delete cascade, snapshot jsonb not null,
  published_at timestamptz not null default now()
);
create table public.invitation_events (
  invitation uuid references public.invitations on delete cascade, position integer, event jsonb not null,
  primary key(invitation,position)
);
create table public.invitation_assets (
  path text primary key, owner uuid not null references public.profiles on delete cascade, created_at timestamptz not null default now()
);
create index on public.invitation_assets(owner);
create table public.orders (
  provider_order text primary key, invitation uuid not null references public.invitations on delete cascade,
  template text not null references public.templates, amount integer not null check(amount>0),
  created_at timestamptz not null default now()
);
create unique index on public.orders(invitation,template,amount);
create table public.payments (
  provider_payment text primary key, provider_order text not null references public.orders on delete cascade,
  status text not null check(status in ('captured','failed','refunded')), created_at timestamptz not null default now()
);
create index on public.payments(provider_order,status);
create table public.rsvp_responses (
  id bigint generated always as identity primary key, invitation uuid not null references public.invitations on delete cascade,
  name text not null, attending boolean not null, guests integer not null check(guests between 0 and 12),
  message text not null, created_at timestamptz not null default now()
);
create index on public.rsvp_responses(invitation,created_at desc);
create table public.invitation_analytics (
  invitation uuid references public.invitations on delete cascade, day date not null default current_date,
  views bigint not null default 0, primary key(invitation,day)
);
create table public.rsvp_limits (
  bucket text, window_start timestamptz, requests integer not null, primary key(bucket,window_start)
);

do $$ declare t text; begin
  foreach t in array array['profiles','templates','invitations','publications','invitation_events','invitation_assets','orders','payments','rsvp_responses','invitation_analytics','rsvp_limits'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
grant select,update(display_name) on public.profiles to authenticated;
grant select on public.invitations,public.invitation_events,public.invitation_assets, public.orders,public.payments,
  public.rsvp_responses, public.invitation_analytics to authenticated;
grant select on public.templates to anon,authenticated;
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_edit on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy template_read on public.templates for select using(active);
create policy invitation_read on public.invitations for select to authenticated using(owner=(select auth.uid()));
create policy asset_read on public.invitation_assets for select to authenticated using(owner=(select auth.uid()));
create policy events_read on public.invitation_events for select to authenticated using(invitation in (select id from public.invitations));
create policy order_read on public.orders for select to authenticated using(invitation in (select id from public.invitations));
create policy payment_read on public.payments for select to authenticated using(provider_order in (select provider_order from public.orders));
create policy rsvp_read on public.rsvp_responses for select to authenticated using(invitation in (select id from public.invitations));
create policy analytics_read on public.invitation_analytics for select to authenticated using(invitation in (select id from public.invitations));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('invitation-media','invitation-media',false,3145728,array['image/jpeg','image/png','image/webp','audio/mpeg'])
on conflict(id) do nothing;

create function public.save_studio_draft(p_owner uuid,p_id uuid,p_revision integer,p_draft jsonb)
returns integer language plpgsql set search_path='' as $$
declare next_revision integer;
begin
  if p_revision=0 then
    insert into public.invitations(id,owner,template,draft)
      values(p_id,p_owner,p_draft->>'template',p_draft) on conflict do nothing returning revision into next_revision;
  else
    update public.invitations set draft=p_draft,template=p_draft->>'template',revision=revision+1,updated_at=now()
      where id=p_id and owner=p_owner and revision=p_revision returning revision into next_revision;
  end if;
  if next_revision is null then return null; end if;
  delete from public.invitation_events where invitation=p_id;
  insert into public.invitation_events select p_id, ordinality::integer,event
    from jsonb_array_elements(p_draft->'events') with ordinality as x(event,ordinality);
  return next_revision;
end $$;
create function public.publish_studio_draft(p_owner uuid,p_id uuid,p_revision integer)
returns text language plpgsql set search_path='' as $$
declare i public.invitations%rowtype; target_slug text;
begin
  select * into i from public.invitations where id=p_id and owner=p_owner and revision=p_revision for update;
  if not found then return 'conflict'; end if;
  if not exists(select 1 from public.orders o join public.payments p using(provider_order)
    where o.invitation=i.id and o.template=i.template and p.status='captured') then return 'payment'; end if;
  target_slug=i.draft->>'slug';
  insert into public.publications(slug,invitation,snapshot) values(target_slug,i.id,i.draft)
    on conflict(invitation) do update set slug=excluded.slug,snapshot=excluded.snapshot,published_at=now();
  return 'published';
exception when unique_violation then return 'slug';
end $$;
create function public.record_studio_view(p_slug text) returns void language sql set search_path='' as $$
  insert into public.invitation_analytics(invitation,views) select invitation,1 from public.publications where slug=p_slug
  on conflict(invitation,day) do update set views=public.invitation_analytics.views+1
$$;
create function public.submit_studio_rsvp(p_slug text,p_bucket text,p_response jsonb) returns text language plpgsql set search_path='' as $$
declare target uuid; attempts integer;
begin
  select invitation into target from public.publications where slug=p_slug and snapshot->>'rsvp'='true' for share;
  if not found then return 'closed'; end if;
  insert into public.rsvp_limits values(p_bucket,date_trunc('hour',now()),1)
    on conflict(bucket,window_start) do update set requests=public.rsvp_limits.requests+1 returning requests into attempts;
  if attempts>5 then return 'limited'; end if;
  insert into public.rsvp_responses(invitation,name,attending,guests,message)
    values(target,p_response->>'name',(p_response->>'attending')::boolean,(p_response->>'guests')::integer,p_response->>'message');
  return 'accepted';
end $$;
revoke execute on function public.init_profile(),public.save_studio_draft(uuid,uuid,integer,jsonb),
  public.publish_studio_draft(uuid,uuid,integer),public.record_studio_view(text),public.submit_studio_rsvp(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_studio_draft(uuid,uuid,integer,jsonb),public.publish_studio_draft(uuid,uuid,integer),
  public.record_studio_view(text),public.submit_studio_rsvp(text,text,jsonb) to service_role;

create function public.record_studio_payment(p_payment text,p_order text,p_status text) returns void
language sql set search_path='' as $$
  insert into public.payments(provider_payment,provider_order,status) values(p_payment,p_order,p_status)
  on conflict(provider_payment) do update set status=excluded.status,created_at=case when excluded.status='captured' then now() else public.payments.created_at end
  where public.payments.provider_order=excluded.provider_order and public.payments.status='failed'
$$;
revoke execute on function public.record_studio_payment(text,text,text) from public,anon,authenticated;
grant execute on function public.record_studio_payment(text,text,text) to service_role;

create view public.studio_admin_orders as
select o.*,case
  when exists(select 1 from public.payments p where p.provider_order=o.provider_order and status='captured') then 'Paid'
  when exists(select 1 from public.payments p where p.provider_order=o.provider_order and status='failed') then 'Failed'
  else 'Pending' end as status
from public.orders o;
create view public.studio_admin_customers as
  select p.id,p.display_name,u.email,u.created_at,coalesce(u.banned_until>now(),false) as banned
  from public.profiles p join auth.users u on u.id=p.id;
create view public.studio_admin_invitations as
  select i.id,coalesce(nullif(concat_ws(' & ',nullif(i.draft->>'bride',''),nullif(i.draft->>'groom','')),''),'Untitled invitation') as name,
  i.template,i.updated_at,p.slug from public.invitations i left join public.publications p on p.invitation=i.id;
revoke all on public.studio_admin_orders,public.studio_admin_customers,public.studio_admin_invitations from public,anon,authenticated;
grant select on public.studio_admin_orders,public.studio_admin_customers,public.studio_admin_invitations to service_role;

create function public.studio_admin_overview() returns jsonb language sql set search_path='' as $$
select jsonb_build_object(
  'customers',(select count(*) from public.profiles),
  'invitations',(select count(*) from public.invitations),
  'published',(select count(*) from public.publications),
  'orders',(select count(*) from public.orders),
  'revenue',(select coalesce(sum(o.amount),0) from public.payments p join public.orders o using(provider_order) where p.status='captured'),
  'templates',(select jsonb_agg(jsonb_build_object('name',title,'value',total)) from (
    select t.title,count(i.id) as total from public.templates t left join public.invitations i on t.id=i.template group by t.id order by total desc,t.title
  ) totals),
  'months',(select jsonb_agg(jsonb_build_object('name',to_char(month,'Mon'),'value',coalesce(total,0)/100.0) order by month) from
    generate_series(date_trunc('month',now())-interval '5 months',date_trunc('month',now()),interval '1 month') as month
    left join (select date_trunc('month',p.created_at) as period,sum(o.amount) as total from public.payments p join public.orders o using(provider_order)
      where p.status='captured' group by period) totals on totals.period=month)
)
$$;
revoke execute on function public.studio_admin_overview() from public,anon,authenticated;
grant execute on function public.studio_admin_overview() to service_role;
