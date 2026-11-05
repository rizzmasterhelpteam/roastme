// Run on an admin machine with server-side Supabase credentials. Never bundle these.
import { createClient } from "@supabase/supabase-js";
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, REVIEWER_EMAIL: email, REVIEWER_PASSWORD: password } = process.env;
if (!url || !key || !email || !password) throw new Error("Set Supabase admin credentials, REVIEWER_EMAIL and REVIEWER_PASSWORD in the environment.");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
// Refuse to overwrite an existing account or reset its password.
const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (created.error) throw new Error(created.error.message);
const id = created.data.user.id;
const grant = await db.from("premium_grants").insert({ user_id: id, reason: "Google Play review account", expires_at: null });
if (grant.error) throw new Error("Account created, but Premium grant failed: " + grant.error.message);
const profile = await db.from("profiles").update({ display_name: "Play Reviewer", premium_status: true, premium_expires_at: "9999-12-31T00:00:00Z", premium_plan: "reviewer" }).eq("id", id).select("premium_status,premium_plan").single();
if (profile.error || !profile.data.premium_status) throw new Error("Unable to verify reviewer Premium.");
console.log("Reviewer account created with permanent Premium. No invitation email sent.");
