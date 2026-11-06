-- Run on a new Supabase project. All economic writes are service-role-only.
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 display_name text not null default 'Roast Rookie',
 credits_balance integer not null default 5 check (credits_balance >= 0),
 premium_status boolean not null default false,
 premium_expires_at timestamptz,
 premium_plan text,
 last_daily_claim date,
 streak integer not null default 0,
 generation_token uuid,
 generation_expires_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.personas (slug text primary key, name text not null, active boolean not null default true);
insert into public.personas(slug,name) values ('savage','Savage'),('grandma','Grandma'),('ceo','CEO'),('cat','Judgy Cat'),('robot','Robot'),('drama','Drama Queen');
create table public.roast_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 persona_id text not null references public.personas, session_type text not null,
 roast_level text not null, chaos_level integer not null, created_at timestamptz not null default now()
);
create index sessions_owner on public.roast_sessions(user_id,created_at desc);
create table public.messages (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.roast_sessions on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,
 request_id uuid not null, content text not null, prompt text not null, persona text not null,
 input_type text not null, credits_used integer not null, image_path text,
 feedback text check(feedback in ('like','dislike')), created_at timestamptz not null default now(), unique(user_id,request_id)
);
create index messages_owner on public.messages(user_id,created_at desc);
create table public.saved_roasts (user_id uuid references public.profiles on delete cascade, message_id uuid references public.messages on delete cascade, created_at timestamptz default now(), primary key(user_id,message_id));
create table public.image_uploads (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, storage_path text not null unique, file_type text not null, file_size integer not null, created_at timestamptz default now());
create table public.reports (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, message_id uuid references public.messages on delete set null, reason text not null, details text, status text not null default 'pending', created_at timestamptz default now());
create table public.credit_transactions (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, type text not null, amount integer not null, reference text, created_at timestamptz default now(), unique(user_id,reference));
create index transactions_owner on public.credit_transactions(user_id,created_at desc);
create table public.subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, provider text not null, provider_reference text unique, plan_type text not null, status text not null, expires_at timestamptz, created_at timestamptz default now());
create table public.ad_rewards (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, provider_event_id text unique, ad_network text not null, amount integer not null default 5, verification_status text not null default 'pending', created_at timestamptz default now());
create table public.user_settings (user_id uuid primary key references public.profiles on delete cascade, preferences jsonb not null default '{"notifications":false,"sound":false,"haptics":true,"dark":true,"language":"English"}'::jsonb);
create table public.generation_requests (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, created_at timestamptz not null default now());
create index requests_owner_time on public.generation_requests(user_id,created_at desc);

alter table public.profiles enable row level security;
alter table public.personas enable row level security;
alter table public.roast_sessions enable row level security;
alter table public.messages enable row level security;
alter table public.saved_roasts enable row level security;
alter table public.image_uploads enable row level security;
alter table public.reports enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ad_rewards enable row level security;
alter table public.user_settings enable row level security;
alter table public.generation_requests enable row level security;

create policy own_profile on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy read_personas on public.personas for select to authenticated using(active);
create policy own_sessions on public.roast_sessions for select to authenticated using((select auth.uid())=user_id);
create policy own_messages on public.messages for select to authenticated using((select auth.uid())=user_id);
create policy own_saved on public.saved_roasts for select to authenticated using((select auth.uid())=user_id);
create policy own_uploads on public.image_uploads for select to authenticated using((select auth.uid())=user_id);
create policy own_reports on public.reports for select to authenticated using((select auth.uid())=user_id);
create policy own_transactions on public.credit_transactions for select to authenticated using((select auth.uid())=user_id);
create policy own_subscriptions on public.subscriptions for select to authenticated using((select auth.uid())=user_id);
create policy own_ad_rewards on public.ad_rewards for select to authenticated using((select auth.uid())=user_id);
create policy own_settings on public.user_settings for select to authenticated using((select auth.uid())=user_id);
grant select on public.profiles,public.personas,public.roast_sessions,public.messages,public.saved_roasts,public.image_uploads,public.reports,public.credit_transactions,public.subscriptions,public.ad_rewards,public.user_settings to authenticated;
revoke insert,update,delete on all tables in schema public from anon,authenticated;
grant all on all tables in schema public to service_role;

create schema if not exists private;
create function private.initialize_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id) values(new.id);
 insert into public.user_settings(user_id) values(new.id);
 insert into public.credit_transactions(user_id,type,amount,reference) values(new.id,'initial',5,'initial');
 return new;
end; $$;
revoke all on function private.initialize_user() from public,anon,authenticated;
create trigger initialize_roast_user after insert on auth.users for each row execute function private.initialize_user();

-- Service-only RPC. Row locks serialize economic operations across server instances.
create function public.begin_generation(p_user uuid,p_token uuid,p_cost integer) returns void language plpgsql security invoker set search_path='' as $$
declare p public.profiles; n integer;
begin
 select * into p from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 if p.generation_token is not null and p.generation_expires_at>now() then raise exception 'A roast is already cooking. Try again shortly.'; end if;
 select count(*) into n from public.generation_requests where user_id=p_user and created_at>now()-interval '1 minute';
 if n>=10 then raise exception 'Take a breather. Try again in a minute.'; end if;
 if not (p.premium_status and p.premium_expires_at>now()) and p.credits_balance<p_cost then raise exception 'OUT_OF_CREDITS'; end if;
 update public.profiles set generation_token=p_token,generation_expires_at=now()+interval '2 minutes' where id=p_user;
 insert into public.generation_requests(user_id) values(p_user);
end; $$;
create function public.cancel_generation(p_user uuid,p_token uuid) returns void language sql security invoker set search_path='' as $$
 update public.profiles set generation_token=null,generation_expires_at=null where id=p_user and generation_token=p_token;
$$;
create function public.finish_generation(p_user uuid,p_token uuid,p_request uuid,p_session uuid,p_persona text,p_type text,p_level text,p_chaos integer,p_prompt text,p_content text,p_image text) returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.profiles; m uuid; c integer;
begin
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
create function public.claim_daily(p_user uuid) returns integer language plpgsql security invoker set search_path='' as $$
declare p public.profiles;
begin
 select * into p from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 if p.last_daily_claim=(now() at time zone 'UTC')::date then raise exception 'Your daily credits are already claimed. Come back tomorrow!'; end if;
 update public.profiles set credits_balance=credits_balance+5,last_daily_claim=(now() at time zone 'UTC')::date,streak=case when p.last_daily_claim=(now() at time zone 'UTC')::date-1 then p.streak+1 else 1 end where id=p_user;
 insert into public.credit_transactions(user_id,type,amount,reference) values(p_user,'daily_reward',5,'daily:'||((now() at time zone 'UTC')::date)::text);
 return p.credits_balance+5;
end; $$;
revoke all on function public.begin_generation(uuid,uuid,integer),public.cancel_generation(uuid,uuid),public.finish_generation(uuid,uuid,uuid,uuid,text,text,text,integer,text,text,text),public.claim_daily(uuid) from public,anon,authenticated;
grant execute on function public.begin_generation(uuid,uuid,integer),public.cancel_generation(uuid,uuid),public.finish_generation(uuid,uuid,uuid,uuid,text,text,text,integer,text,text,text),public.claim_daily(uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('roast-images','roast-images',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy own_image_read on storage.objects for select to authenticated using(bucket_id='roast-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Uploads/deletes use the authenticated server. No client write policies.
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

-- Supporting indexes for owner lookups and cascading account deletion.
create index if not exists image_uploads_owner on public.image_uploads(user_id);
create index if not exists messages_session on public.messages(session_id);
create index if not exists reports_message on public.reports(message_id);
create index if not exists reports_owner on public.reports(user_id);
create index if not exists sessions_persona on public.roast_sessions(persona_id);
create index if not exists saved_message on public.saved_roasts(message_id);
create index if not exists subscriptions_owner on public.subscriptions(user_id);

-- Apply before deploying the Premium session API. Service-role access only.
create table if not exists public.premium_sessions (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 instance_id uuid not null,
 connected_at timestamptz not null default now()
);
alter table public.premium_sessions enable row level security;
revoke all on public.premium_sessions from public, anon, authenticated;
grant all on public.premium_sessions to service_role;

create table if not exists public.premium_grants (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 reason text not null,
 expires_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.premium_grants enable row level security;
revoke all on public.premium_grants from public, anon, authenticated;
grant all on public.premium_grants to service_role;

create or replace function public.connect_premium_session(p_user uuid, p_instance uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 if exists(select 1 from public.premium_sessions where user_id=p_user and instance_id<>p_instance) then
  -- A replaced client must not finish an in-flight Premium generation.
  update public.profiles set generation_token=null,generation_expires_at=null where id=p_user;
 end if;
 insert into public.premium_sessions(user_id,instance_id) values(p_user,p_instance)
 on conflict(user_id) do update set instance_id=excluded.instance_id,connected_at=now();
end; $$;
revoke all on function public.connect_premium_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.connect_premium_session(uuid,uuid) to service_role;

create or replace function public.preserve_premium_grant()
returns trigger language plpgsql security invoker set search_path='' as $$
declare grant_expiry timestamptz;
begin
 select coalesce(expires_at,'9999-12-31T00:00:00Z'::timestamptz) into grant_expiry
 from public.premium_grants where user_id=new.id and (expires_at is null or expires_at>now());
 if found then
  new.premium_status:=true; new.premium_expires_at:=grant_expiry; new.premium_plan:='reviewer';
 end if;
 return new;
end; $$;
revoke all on function public.preserve_premium_grant() from public,anon,authenticated;
drop trigger if exists preserve_premium_grant on public.profiles;
create trigger preserve_premium_grant before update on public.profiles
for each row execute function public.preserve_premium_grant();

-- Compact per-chat memory. Guest summaries stay on-device, never in this table.
alter table public.roast_sessions add column memory_revision integer not null default 0;
create index messages_conversation_recent on public.messages(user_id,session_id,persona,created_at desc,id desc);
create table public.conversation_memories (
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.roast_sessions(id) on delete cascade,
  persona text not null references public.personas(slug),
  notes text not null check (char_length(notes) <= 1200),
  source_id uuid not null references public.messages(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id, persona)
);
create index conversation_memories_session on public.conversation_memories(session_id);
create index conversation_memories_source on public.conversation_memories(source_id);
alter table public.conversation_memories enable row level security;
revoke all on public.conversation_memories from public, anon, authenticated;
grant all on public.conversation_memories to service_role;

-- A revision invalidates local guest notes too, even when an older message is deleted.
create function public.invalidate_conversation_memory() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  update public.roast_sessions set memory_revision = memory_revision + 1
    where id = old.session_id and user_id = old.user_id;
  delete from public.conversation_memories where session_id = old.session_id and user_id = old.user_id;
  return old;
end;
$$;
revoke all on function public.invalidate_conversation_memory() from public, anon, authenticated;
grant execute on function public.invalidate_conversation_memory() to service_role;
create trigger messages_invalidate_memory after delete on public.messages
  for each row execute function public.invalidate_conversation_memory();

create function public.clear_conversation_memory(p_user uuid, p_session uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.roast_sessions set memory_revision = memory_revision + 1
    where id = p_session and user_id = p_user;
  delete from public.conversation_memories where user_id = p_user and session_id = p_session;
end;
$$;
revoke all on function public.clear_conversation_memory(uuid, uuid) from public, anon, authenticated;
grant execute on function public.clear_conversation_memory(uuid, uuid) to service_role;

-- Preserve the existing credit/idempotency transaction; commit notes atomically with it.
create function public.finish_generation_with_memory(
  p_user uuid, p_token uuid, p_request uuid, p_session uuid, p_persona text,
  p_type text, p_level text, p_chaos integer, p_prompt text, p_content text,
  p_image text, p_notes text, p_revision integer, p_persist boolean
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare m uuid; revision integer;
begin
  m := public.finish_generation(p_user,p_token,p_request,p_session,p_persona,p_type,p_level,p_chaos,p_prompt,p_content,p_image);
  select memory_revision into revision from public.roast_sessions
    where id = p_session and user_id = p_user for update;
  -- Only the trusted backend can call this RPC. p_persist comes from auth.getUser,
  -- never from the request body or editable user metadata.
  if revision = p_revision and p_notes is not null and p_persist then
    if length(p_notes) = 0 then
      delete from public.conversation_memories where user_id = p_user and session_id = p_session and persona = p_persona;
    else
      insert into public.conversation_memories(user_id,session_id,persona,notes,source_id)
        values(p_user,p_session,p_persona,p_notes,m)
      on conflict(user_id,session_id,persona) do update
        set notes = excluded.notes, source_id = excluded.source_id, updated_at = now();
    end if;
  end if;
  return m;
end;
$$;
revoke all on function public.finish_generation_with_memory(uuid,uuid,uuid,uuid,text,text,text,integer,text,text,text,text,integer,boolean) from public, anon, authenticated;
grant execute on function public.finish_generation_with_memory(uuid,uuid,uuid,uuid,text,text,text,integer,text,text,text,text,integer,boolean) to service_role;
