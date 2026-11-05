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
