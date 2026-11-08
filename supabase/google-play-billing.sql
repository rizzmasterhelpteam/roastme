create table if not exists public.google_play_purchases (
 token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
 user_id uuid not null references public.profiles(id) on delete cascade,
 purchase_token text not null,
 product_id text not null, base_plan_id text not null,
 plan text not null check (plan in ('weekly','monthly')),
 active boolean not null, expires_at timestamptz not null,
 state text not null, checked_at timestamptz not null
);
create index if not exists google_play_purchase_owner on public.google_play_purchases(user_id,expires_at);
alter table public.google_play_purchases enable row level security;
revoke all on public.google_play_purchases from public,anon,authenticated;
grant all on public.google_play_purchases to service_role;
create or replace function public.apply_google_play_subscription(p_user uuid,p_hash text,p_token text,p_product text,p_base text,p_plan text,p_active boolean,p_expiry timestamptz,p_state text,p_checked timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
declare owner_id uuid; previous timestamptz; best record;
begin
 perform 1 from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 insert into public.google_play_purchases(token_hash,user_id,purchase_token,product_id,base_plan_id,plan,active,expires_at,state,checked_at)
 values(p_hash,p_user,p_token,p_product,p_base,p_plan,p_active,p_expiry,p_state,p_checked) on conflict(token_hash) do nothing;
 select user_id,checked_at into owner_id,previous from public.google_play_purchases where token_hash=p_hash for update;
 if owner_id is distinct from p_user then raise exception 'Purchase already belongs to another account'; end if;
 if previous>p_checked then return; end if;
 update public.google_play_purchases set product_id=p_product,base_plan_id=p_base,plan=p_plan,active=p_active,expires_at=p_expiry,state=p_state,checked_at=p_checked where token_hash=p_hash;
 insert into public.subscriptions(user_id,provider,provider_reference,plan_type,status,expires_at)
 values(p_user,'google_play','google_play:'||p_hash,p_plan,case when p_active then 'active' else 'expired' end,p_expiry)
 on conflict(provider_reference) do update set plan_type=excluded.plan_type,status=excluded.status,expires_at=excluded.expires_at;
 select plan_type,expires_at into best from public.subscriptions where user_id=p_user and provider in ('google_play','dodo') and status='active' and expires_at>now() order by expires_at desc limit 1;
 update public.profiles set premium_status=found,premium_plan=best.plan_type,premium_expires_at=best.expires_at,subscription_checked_at=greatest(subscription_checked_at,p_checked)
 where id=p_user;
end; $$;
revoke all on function public.apply_google_play_subscription(uuid,text,text,text,text,text,boolean,timestamptz,text,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_google_play_subscription(uuid,text,text,text,text,text,boolean,timestamptz,text,timestamptz) to service_role;
