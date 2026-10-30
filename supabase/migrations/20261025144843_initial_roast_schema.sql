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
