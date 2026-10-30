-- Each UTC day has one shared, expiring credit balance, including ad rewards.
update public.profiles set last_daily_claim=(now() at time zone 'UTC')::date where last_daily_claim is null;
alter table public.profiles alter column last_daily_claim set default ((now() at time zone 'UTC')::date);
create or replace function public.reset_daily_credits(p_user uuid) returns integer language plpgsql security invoker set search_path='' as $$
declare p public.profiles; today date := (now() at time zone 'UTC')::date;
begin
 select * into p from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 if p.last_daily_claim is distinct from today then
   update public.profiles set credits_balance=5,last_daily_claim=today,streak=case when p.last_daily_claim=today-1 then p.streak+1 else 1 end where id=p_user;
   insert into public.credit_transactions(user_id,type,amount,reference) values(p_user,'daily_reset',5-p.credits_balance,'reset:'||today::text);
   return 5;
 end if;
 return p.credits_balance;
end; $$;
revoke all on function public.reset_daily_credits(uuid) from public,anon,authenticated;
grant execute on function public.reset_daily_credits(uuid) to service_role;
create or replace function public.claim_daily(p_user uuid) returns integer language plpgsql security invoker set search_path='' as $$
begin
 raise exception 'Daily credits reset automatically at 00:00 UTC.';
end; $$;

create or replace function public.begin_generation(p_user uuid,p_token uuid,p_cost integer) returns void language plpgsql security invoker set search_path='' as $$
declare p public.profiles; n integer;
begin
 perform public.reset_daily_credits(p_user);
 select * into p from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 if p.generation_token is not null and p.generation_expires_at>now() then raise exception 'A roast is already cooking. Try again shortly.'; end if;
 select count(*) into n from public.generation_requests where user_id=p_user and created_at>now()-interval '1 minute';
 if n>=10 then raise exception 'Take a breather. Try again in a minute.'; end if;
 if not (p.premium_status and p.premium_expires_at>now()) and p.credits_balance<p_cost then raise exception 'OUT_OF_CREDITS'; end if;
 update public.profiles set generation_token=p_token,generation_expires_at=now()+interval '2 minutes' where id=p_user;
 insert into public.generation_requests(user_id) values(p_user);
end; $$;
create or replace function public.finish_generation(p_user uuid,p_token uuid,p_request uuid,p_session uuid,p_persona text,p_type text,p_level text,p_chaos integer,p_prompt text,p_content text,p_image text) returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.profiles; m uuid; c integer;
begin
 perform public.reset_daily_credits(p_user);
 select * into p from public.profiles where id=p_user for update;
 if p.generation_token is distinct from p_token or p.generation_expires_at<now() then raise exception 'Generation expired. Please retry.'; end if;
 c:=case when p.premium_status and p.premium_expires_at>now() then 0 when p_type='image' then 2 else 1 end;
 if p.credits_balance<c then raise exception 'OUT_OF_CREDITS'; end if;
 if exists(select 1 from public.roast_sessions where id=p_session and user_id<>p_user) then raise exception 'Invalid session'; end if;
 insert into public.roast_sessions(id,user_id,persona_id,session_type,roast_level,chaos_level) values(p_session,p_user,p_persona,p_type,p_level,p_chaos) on conflict(id) do nothing;
 insert into public.messages(session_id,user_id,request_id,content,prompt,persona,input_type,credits_used,image_path) values(p_session,p_user,p_request,p_content,p_prompt,p_persona,p_type,c,p_image) returning id into m;
 update public.profiles set credits_balance=credits_balance-c,generation_token=null,generation_expires_at=null where id=p_user;
 insert into public.credit_transactions(user_id,type,amount,reference) values(p_user,p_type||'_roast',-c,p_request::text);
 return m;
end; $$;
create or replace function public.grant_verified_ad(p_user uuid,p_intent uuid,p_event text) returns void language plpgsql security invoker set search_path='' as $$
declare reward public.ad_rewards; n integer;
begin
 perform public.reset_daily_credits(p_user);
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
