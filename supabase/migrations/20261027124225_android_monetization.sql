-- Android store entitlements and verified rewarded ads. Service role only.
alter table public.profiles add column subscription_checked_at timestamptz;
alter table public.ad_rewards add column intent_expires_at timestamptz;
create index ad_rewards_owner_time on public.ad_rewards(user_id,created_at desc);
create function public.create_ad_intent(p_user uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare intent uuid; n integer;
begin
 perform 1 from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 select count(*) into n from public.ad_rewards where user_id=p_user and created_at>now()-interval '1 minute';
 if n>=2 then raise exception 'Please wait before requesting another ad.'; end if;
 select count(*) into n from public.ad_rewards where user_id=p_user and verification_status='verified' and created_at>date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 if n>=10 then raise exception 'Your daily ad rewards are complete. Come back tomorrow.'; end if;
 insert into public.ad_rewards(user_id,ad_network,amount,verification_status,intent_expires_at) values(p_user,'admob',5,'pending',now()+interval '10 minutes') returning id into intent;
 return intent;
end; $$;
create function public.grant_verified_ad(p_user uuid,p_intent uuid,p_event text) returns void language plpgsql security invoker set search_path='' as $$
declare reward public.ad_rewards; n integer;
begin
 perform 1 from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 select * into reward from public.ad_rewards where id=p_intent and user_id=p_user and ad_network='admob' for update;
 if not found then raise exception 'Unknown intent'; end if;
 if reward.verification_status='verified' and reward.provider_event_id=p_event then return; end if;
 if reward.verification_status<>'pending' or reward.intent_expires_at<now() then raise exception 'Invalid or expired intent'; end if;
 select count(*) into n from public.ad_rewards where user_id=p_user and verification_status='verified' and created_at>date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 if n>=10 then raise exception 'Daily ad reward limit'; end if;
 update public.ad_rewards set verification_status='verified',provider_event_id=p_event where id=p_intent;
 update public.profiles set credits_balance=credits_balance+5 where id=p_user;
 insert into public.credit_transactions(user_id,type,amount,reference) values(p_user,'ad_reward',5,'ad:'||p_event);
end; $$;
create function public.apply_store_subscription(p_user uuid,p_active boolean,p_plan text,p_expiry timestamptz,p_checked timestamptz) returns void language plpgsql security invoker set search_path='' as $$
declare previous timestamptz;
begin
 select subscription_checked_at into previous from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 if previous is not null and previous>p_checked then return; end if;
 update public.profiles set premium_status=p_active,premium_plan=p_plan,premium_expires_at=p_expiry,subscription_checked_at=p_checked where id=p_user;
 insert into public.subscriptions(user_id,provider,provider_reference,plan_type,status,expires_at)
 values(p_user,'revenuecat','revenuecat:'||p_user::text,coalesce(p_plan,'none'),case when p_active then 'active' else 'expired' end,p_expiry)
 on conflict(provider_reference) do update set plan_type=excluded.plan_type,status=excluded.status,expires_at=excluded.expires_at;
end; $$;
revoke all on function public.create_ad_intent(uuid),public.grant_verified_ad(uuid,uuid,text),public.apply_store_subscription(uuid,boolean,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.create_ad_intent(uuid),public.grant_verified_ad(uuid,uuid,text),public.apply_store_subscription(uuid,boolean,text,timestamptz,timestamptz) to service_role;
