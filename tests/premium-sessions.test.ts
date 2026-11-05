import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

test("Premium takeover cancels old generation; reviewer grants survive store expiry and stay private", async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;`);
  await db.exec(await readFile(new URL("../supabase/schema.sql", import.meta.url),"utf8"));
  const user=randomUUID(), first=randomUUID(), second=randomUUID(), lease=randomUUID();
  await db.query("insert into auth.users(id) values($1)",[user]);
  await db.query("insert into public.premium_grants(user_id,reason) values($1,'test grant')",[user]);
  await db.query("update public.profiles set premium_status=false,premium_expires_at=null where id=$1",[user]);
  const profile=await db.query<{premium_status:boolean,premium_plan:string}>("select premium_status,premium_plan from public.profiles where id=$1",[user]);
  assert.equal(profile.rows[0].premium_status,true);
  assert.equal(profile.rows[0].premium_plan,"reviewer");
  await db.query("select public.connect_premium_session($1,$2)",[user,first]);
  await db.query("select public.begin_generation($1,$2,1)",[user,lease]);
  await db.query("select public.connect_premium_session($1,$2)",[user,first]);
  assert.equal((await db.query<{generation_token:string}>("select generation_token from public.profiles where id=$1",[user])).rows[0].generation_token,lease,"same instance refresh preserves generation");
  await db.query("select public.connect_premium_session($1,$2)",[user,second]);
  const active=await db.query<{instance_id:string}>("select instance_id from public.premium_sessions where user_id=$1",[user]);
  assert.equal(active.rows[0].instance_id,second);
  assert.equal((await db.query<{generation_token:string | null}>("select generation_token from public.profiles where id=$1",[user])).rows[0].generation_token,null);
  await assert.rejects(db.query("select public.finish_generation($1,$2,$3,$4,'savage','chat','Spicy',30,'hello','reply',null)",[user,lease,randomUUID(),randomUUID()]),/Generation expired/);
  await db.query("select public.apply_store_subscription($1,false,'none',null,now())",[user]);
  assert.equal((await db.query<{premium_status:boolean}>("select premium_status from public.profiles where id=$1",[user])).rows[0].premium_status,true);
  await db.exec("set role authenticated");
  await assert.rejects(db.query("select * from public.premium_grants"),/permission denied/);
  await assert.rejects(db.query("select public.connect_premium_session($1,$2)",[user,first]),/permission denied/);
 } finally { await db.close(); }
});
