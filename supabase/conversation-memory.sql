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
  -- Parent deletion already cascades summaries. Auth's restricted cleanup role
  -- cannot update public tables; skip this work during FK-triggered cascades.
  if current_user = 'supabase_auth_admin' or pg_trigger_depth() > 1 then return old; end if;
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
