begin;

alter table public.profiles alter column credits_balance set default 3;

alter table public.ad_rewards alter column amount set default 3;

create or replace function private.initialize_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id) values(new.id);
 insert into public.user_settings(user_id) values(new.id);
 insert into public.credit_transactions(user_id,type,amount,reference) values(new.id,'initial',3,'initial');
 return new;
end; $$;

create or replace function public.reset_daily_credits(p_user uuid) returns integer language plpgsql security invoker set search_path='' as $$
declare p public.profiles; today date := (now() at time zone 'UTC')::date;
begin
 select * into p from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 if p.last_daily_claim is distinct from today then
   update public.profiles set credits_balance=3,last_daily_claim=today,streak=case when p.last_daily_claim=today-1 then p.streak+1 else 1 end where id=p_user;
   insert into public.credit_transactions(user_id,type,amount,reference) values(p_user,'daily_reset',3-p.credits_balance,'reset:'||today::text);
   return 3;
 end if;
 return p.credits_balance;
end; $$;

create or replace function public.create_ad_intent(p_user uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare intent uuid; n integer;
begin
 perform 1 from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 select count(*) into n from public.ad_rewards where user_id=p_user and created_at>now()-interval '1 minute';
 if n>=2 then raise exception 'Please wait before requesting another ad.'; end if;
 insert into public.ad_rewards(user_id,ad_network,amount,verification_status,intent_expires_at) values(p_user,'admob',3,'pending',now()+interval '10 minutes') returning id into intent;
 return intent;
end; $$;

create or replace function public.grant_verified_ad(p_user uuid,p_intent uuid,p_event text) returns void language plpgsql security invoker set search_path='' as $$
declare reward public.ad_rewards;
begin
 perform public.reset_daily_credits(p_user);
 perform 1 from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 select * into reward from public.ad_rewards where id=p_intent and user_id=p_user and ad_network='admob' for update;
 if not found then raise exception 'Unknown intent'; end if;
 if reward.verification_status='verified' and reward.provider_event_id=p_event then return; end if;
 if reward.verification_status<>'pending' or reward.intent_expires_at<now() then raise exception 'Invalid or expired intent'; end if;
 update public.ad_rewards set verification_status='verified',provider_event_id=p_event,amount=3 where id=p_intent;
 update public.profiles set credits_balance=credits_balance+3 where id=p_user;
 insert into public.credit_transactions(user_id,type,amount,reference) values(p_user,'ad_reward',3,'ad:'||p_event);
end; $$;

commit;
