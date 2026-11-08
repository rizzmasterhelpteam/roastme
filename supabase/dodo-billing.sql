-- Shared web / Android entitlement, with private Dodo billing records.
create table if not exists public.dodo_customers (
 user_id uuid not null references public.profiles(id) on delete cascade,
 environment text not null check(environment in ('live_mode','test_mode')),
 customer_id text not null,
 primary key(user_id,environment), unique(environment,customer_id)
);
create table if not exists public.dodo_subscriptions (
 subscription_id text not null, environment text not null,
 user_id uuid not null references public.profiles(id) on delete cascade,
 customer_id text not null, product_id text not null,
 plan text not null check(plan in ('weekly','monthly')),
 active boolean not null, expires_at timestamptz not null,
 period_start timestamptz not null, state text not null, checked_at timestamptz not null,
 blocked_until timestamptz,
 primary key(environment,subscription_id),
 foreign key(environment,customer_id) references public.dodo_customers(environment,customer_id) on delete cascade
);
create index if not exists dodo_subscription_owner on public.dodo_subscriptions(user_id,environment,expires_at);
create index if not exists dodo_subscription_customer on public.dodo_subscriptions(environment,customer_id);
create index if not exists subscriptions_active_owner on public.subscriptions(user_id,expires_at) where status='active';
create table if not exists public.dodo_events (
 environment text not null, event_id text not null,
 processed_at timestamptz not null default now(), primary key(environment,event_id)
);
alter table public.dodo_customers enable row level security;
alter table public.dodo_subscriptions enable row level security;
alter table public.dodo_events enable row level security;
revoke all on public.dodo_customers,public.dodo_subscriptions,public.dodo_events from public,anon,authenticated;
grant all on public.dodo_customers,public.dodo_subscriptions,public.dodo_events to service_role;

create or replace function public.apply_dodo_subscription(p_user uuid,p_environment text,p_id text,p_customer text,p_product text,p_plan text,p_active boolean,p_expiry timestamptz,p_period_start timestamptz,p_state text,p_checked timestamptz,p_event text default null,p_blocked_until timestamptz default null)
returns void language plpgsql security invoker set search_path='' as $$
declare owner_id uuid; previous timestamptz; best record; blocked timestamptz; live boolean;
begin
 perform 1 from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 if not exists(select 1 from public.dodo_customers where user_id=p_user and environment=p_environment and customer_id=p_customer) then
  raise exception 'Customer belongs to a different account';
 end if;
 insert into public.dodo_subscriptions(subscription_id,environment,user_id,customer_id,product_id,plan,active,expires_at,period_start,state,checked_at,blocked_until)
 values(p_id,p_environment,p_user,p_customer,p_product,p_plan,p_active,p_expiry,p_period_start,p_state,p_checked,p_blocked_until)
 on conflict(environment,subscription_id) do nothing;
 select user_id,checked_at,blocked_until into owner_id,previous,blocked from public.dodo_subscriptions where environment=p_environment and subscription_id=p_id for update;
 if owner_id is distinct from p_user then raise exception 'Subscription belongs to a different account'; end if;
 if previous>p_checked then return; end if;
 blocked:=greatest(blocked,p_blocked_until);
 live:=p_active and (blocked is null or p_period_start>=blocked);
 update public.dodo_subscriptions set product_id=p_product,plan=p_plan,active=live,expires_at=p_expiry,period_start=p_period_start,state=p_state,checked_at=p_checked,blocked_until=blocked
 where environment=p_environment and subscription_id=p_id;
 insert into public.subscriptions(user_id,provider,provider_reference,plan_type,status,expires_at)
 values(p_user,'dodo','dodo:'||p_environment||':'||p_id,p_plan,case when live then 'active' else 'expired' end,p_expiry)
 on conflict(provider_reference) do update set plan_type=excluded.plan_type,status=excluded.status,expires_at=excluded.expires_at;
 -- Any valid provider preserves Premium. The reviewer-grant trigger still applies.
 select plan_type,expires_at into best from public.subscriptions where user_id=p_user and provider in ('dodo','google_play') and status='active' and expires_at>now() order by expires_at desc limit 1;
 update public.profiles set premium_status=found,premium_plan=best.plan_type,premium_expires_at=best.expires_at,subscription_checked_at=greatest(subscription_checked_at,p_checked) where id=p_user;
end; $$;
revoke all on function public.apply_dodo_subscription(uuid,text,text,text,text,text,boolean,timestamptz,timestamptz,text,timestamptz,text,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_dodo_subscription(uuid,text,text,text,text,text,boolean,timestamptz,timestamptz,text,timestamptz,text,timestamptz) to service_role;
