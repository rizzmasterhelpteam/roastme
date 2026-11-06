-- Follow-up for projects that applied the first memory migration before this fix.
create or replace function public.invalidate_conversation_memory() returns trigger
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
