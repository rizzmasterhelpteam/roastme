# Roast Me AI

A mobile-first Next.js app with six illustrated personalities, roast chat, text and image roasts, six-turn persona battles, saved history, exportable PNG cards, daily credits, account linking, reporting, and account deletion. The desktop layout expands into a workspace with a navigation sidebar and roast controls.

## Run locally

```powershell
npm ci
npm run dev
```

Open http://localhost:3000. With no Supabase configuration, development automatically uses a clearly labeled demo: sample responses, server-memory credits and history, and real UI interactions. Demo data resets on server restart. The demo is not a live AI service and is not durable across server instances. Production fails closed unless configured or explicitly started with `DEMO_MODE=true` for a preview.

## Enable the live backend

1. Copy `.env.example` to `.env.local` and set the Supabase URL, public anon/publishable key, service-role key, OpenRouter key, Google key, and app URL. Set `DEMO_MODE=false`.
2. Create a Supabase project and run `supabase/schema.sql` in its SQL editor **once on a new project**. Alternatively apply the supplied initial migration with the Supabase CLI. Do not run both copies. Existing projects require review before applying this schema.
3. Enable anonymous sign-ins, Google OAuth, and manual identity linking in Supabase Auth. Set the Google OAuth client configuration and the Supabase callback in Google Cloud. Enable email authentication and configure production SMTP.
4. In Supabase Auth URL configuration, set Site URL to your app origin and add `http://localhost:3000/auth/callback` plus your deployment's `/auth/callback` to allowed redirects.
5. Restart Next.js after changing environment variables. A guest account now lives in Supabase, receives 5 credits from a database trigger, and keeps the same ID when linked to a **new** Google/email identity.

An identity that already belongs to another account cannot be silently merged. The app displays the auth provider's error and preserves the guest identity. A verified operator-assisted account merge is a separate workflow.

OpenRouter's Chat Completions endpoint handles text generation and output safety classification using `deepseek/deepseek-v4-flash-0731`. Set the server-only `OPENROUTER_API_KEY` and optional `OPENROUTER_MODEL` (defaults to that pinned checkpoint). Requests disable reasoning (`none`) for roast generation and shortening, and use low reasoning for safety, with reasoning excluded from returned replies. OpenRouter routes only to providers that support the requested parameters. There is no OpenAI/Luna fallback. Gemini's `generateContent` endpoint handles inline image input via `GEMINI_API_KEY` (or legacy `GOOGLE_API_KEY`) and `GOOGLE_MODEL`. Chaos remains controlled by the existing persona instructions. Images are restricted to JPG, PNG, or WebP, validated by content signature, and limited to 5 MB. Successful live photo roasts are stored in a private Supabase bucket and exposed through short-lived signed URLs.

## What works now

- `/` persona picker; `/persona/[id]` details and sample roasts; `/chat/[id]` conversations.
- `/text`, `/image`, `/battle`, `/battle/live` for the roast tools.
- `/history`, `/saved`, `/share/[id]` for saved content, search, feedback, reports, PNG download, clipboard, and native sharing where supported.
- `/onboarding`, `/sign-in`, `/link-account`, `/safety` for welcome and identity flows.
- `/rewards` daily claims; `/premium`, `/subscription` pricing and subscription state.
- `/profile`, `/settings`, `/delete-account`, `/about`, `/help`, `/guidelines`, `/terms`, `/privacy`.
- Four roast intensities and an absurdity slider, persisted locally. Haptic preference is persisted to the backend and used where browser support exists.

## Economics and security

Text, chat, or a full six-turn fictional battle costs 1 credit. Images cost 2. A per-user database lease serializes generations, checks credit eligibility and enforces 10 attempts per minute. The successful result, history record, ledger entry, and credit deduction commit in one Postgres transaction. Failures release the lease without charging. A two-minute lease expiry allows recovery if the server crashes. Request UUIDs provide idempotency; identical retried requests do not charge twice.

The free credit balance resets to five at 00:00 UTC each day, without carryover. The reset is applied atomically on the next account operation, and the client refreshes at midnight and when resumed. Verified ad credits are usable until the next reset. Premium eligibility is checked against the server-owned status and expiry timestamp. Clients cannot update balances, premium status, reward records, or billing data. All public tables have RLS; the authenticated role receives only owner-scoped reads. Service-only RPCs explicitly revoke execution from public, anon, and authenticated roles. Account deletion revokes refresh sessions, deletes private uploads, and removes the auth account with cascading application-data deletion. Every API request revalidates the user through Supabase Auth.

Live moderation checks input and output, supplemented by deterministic blocking and constrained persona instructions. Image generation also applies Gemini's provider safety behavior. Moderation is not a guarantee: review reported content and evaluate prompts before launch.

## Billing and rewarded ads

Android integrates Google Play Billing directly, with RSA receipt signatures and Google Play Developer API verification on Vercel. Google service credentials are required before checkout is enabled. Rewarded ads use the AdMob completion callback. These require your provider configuration; see `ANDROID.md`. The web checkout and ad endpoints remain unavailable until a web provider is connected. Premium requires verified purchase status; rewarded credits follow the configured SDK completion flow. Planned prices are $4.99/week and $15.99/month; a configured Android paywall reads actual localized store prices.

`src/lib/server/monetization.ts` defines the provider boundaries. Before enabling:

- Connect a web checkout provider, or Google Play Billing through an Android wrapper; verify receipts on the server.
- Process signed provider callbacks with a unique event/receipt ID. Apply subscription status only from a verified server event and reconcile expiry/cancellation/refunds.
- Connect a rewarded-ad SDK with server-side verification, bind its signed callback to the authenticated user and one-time reward intent, and grant +5 credits in an atomic database transaction with a unique provider event ID.
- Add provider-specific secret variables server-side. Never expose receipts or service-role keys through `NEXT_PUBLIC_*` variables.

Notification and audio toggles are visibly disabled until those features are connected. Dark theme is intentionally always on. Language is English. Priority processing is presented as available only when supported by the eventual backend/provider.

## Verify

```powershell
npm test
npm run typecheck
npm run build
# With the local server running:
npx playwright install chromium
npm run test:e2e
```

The database test runs the actual schema and PL/pgSQL functions in PGlite with stubbed Supabase `auth` and `storage` schemas. It verifies charges, failure cancellation, leases, RLS isolation, privilege denial, daily rewards, and cascading deletion. It does not replace verification on a connected Supabase project. Browser tests exercise desktop chat, save, feedback, reporting, PNG export, rewards, battle, mobile routes, image costs, moderation refusal, idempotency, out-of-credit behavior, and rejected forged rewards. Screenshots are kept in ignored `work/`.

## Deployment and Android

Import this repository into Vercel as a Next.js project and set the environment variables in that project's settings. Use `npm run build`; Next.js handles routing and server functions. Configure the Supabase redirects for the production domain. Do not set `DEMO_MODE=true` on the public production service. Requests are limited by server request-body size; the client should use photos under 3 MB on hosts with a 4.5 MB body limit, or adopt signed direct uploads before supporting the full 5 MB upload limit there.

The app also has a real Capacitor Android project with bundled UI, native sharing, encrypted sessions, PKCE deep links, direct Google Play Billing integration, AdMob server verification, and APK/AAB build scripts. See `ANDROID.md` for build commands, Android Studio's correct project folder, configuration, verification, and release signing. Store/AI/auth account configuration is still required before public distribution.

Before public launch, finalize the operator identity/support address, age eligibility, data retention, legal text, production CAPTCHA for anonymous auth, moderation operations, store metadata, and billing policies. `/privacy` and `/terms` explicitly identify their unfinished operator details; they are not a legal-compliance certification.

## Project map

```
src/app/                  App Router pages, API route, manifest, theme
src/components/           App shell, screen components, controls, UI primitives
src/lib/personas.ts       Persona metadata and shared state types
src/lib/server/           Authenticated persistence and provider adapters
supabase/                 Initial schema and CLI-created migration
tests/                    Postgres/security checks and browser workflows
public/personas.webp      Optimized generated persona atlas
design/                   Artwork source and generation prompt
```
