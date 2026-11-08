-- Starting a fresh chat changes only that persona's active conversation.
-- Shared legacy session IDs must not clear other personas' notes or revisions.
create or replace function public.clear_persona_conversation(
  p_user uuid, p_session uuid, p_persona text
) returns void language sql security invoker set search_path = '' as $$
  delete from public.conversation_memories
    where user_id = p_user and session_id = p_session and persona = p_persona;
$$;
revoke all on function public.clear_persona_conversation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.clear_persona_conversation(uuid,uuid,text) to service_role;
