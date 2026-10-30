# Live setup

Supabase: yvasapreydrajjitycnd (roastme ai).
Vercel: roastme, production https://roastme-gold.vercel.app.

Applied remote migrations: 20261030153315_initialize_roastme_app and 20261030153523_index_roast_foreign_keys. This new database was initialized from the consolidated schema.sql, followed by the supporting foreign-key indexes now included in that snapshot. Do not replay the older local migration chain on this initialized database.

12 public tables have RLS. Eleven owner/read policies expose permitted reads; generation_requests intentionally has no client policies or grants and is service-only. Credits, premium, generation leases, and rewards are backend-only writes. Private roast-images bucket accepts validated image uploads with 5MB maximum. Daily balance resets to 5 at the first operation after 00:00 UTC, without carryover.

GROQ_MODEL=openai/gpt-oss-120b writes all final text. GOOGLE_MODEL=gemini-2.5-flash only analyzes photos into a bounded JSON description. The description is moderated before Groq writes the persona roast; the final roast is moderated again. Analysis blocks and provider failures do not charge credits.

Vercel model names, app URL, native API origin and DEMO_MODE=false are configured. Owner will add GROQ_API_KEY and GOOGLE_API_KEY later. Live provider requests remain unverified until keys are supplied. Google OAuth is deferred. Guest sign-in must be enabled in Supabase Auth.

Both /profile and /settings open the combined account/preferences screen. Roast controls are collapsed initially; theme and haptics remain directly accessible.
