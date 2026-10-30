# Android build

Open **`E:\playconsole projects\Roast Me Ai\android`** in Android Studio, not the web repository root. This is a real Gradle Android project with Capacitor 8, bundled React assets, Android SDK 36, Java 21, and minimum Android 7 (API 24). The app identifier is `ai.roastme.app`.

## Build and run

```powershell
npm ci
npm run android:debug
npm run android:open
```

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`. Install it with Android Studio Run, or `adb -s YOUR_DEVICE install -r android/app/build/outputs/apk/debug/app-debug.apk`. Accept the install prompt on the device if required. A device refusing installation must be handled by its owner; do not bypass that restriction.

```powershell
npm run android:bundle
```

This creates `android/app/build/outputs/bundle/release/app-release.aab`. Release code and resources are shrunk with R8. This bundle is **unsigned** until you use your Play upload keystore through Android Studio's **Generate Signed Bundle / APK** flow. No production signing key is created or checked in by this project. Select **Android App Bundle**, use your own upload key, and retain it securely. Configure a real AdMob app ID in your local Gradle properties before publishing:

```properties
ADMOB_APP_ID=ca-app-pub-YOUR_PUBLISHER~YOUR_APP
```

The default AdMob app ID is Google's official Android test app ID. No rewarded ads are requested until a reward-unit ID and live server are configured. App ID/package name and product identifiers must match your Play Console, RevenueCat, and AdMob applications before the first store upload.

## Bundled UI and live API

The APK contains its own HTML, CSS, JavaScript, and optimized persona atlas. It is not a WebView loading an external website. Vite packages the existing screen components with native routing adapters; Next.js continues to host the web app and authenticated API. No server routes or server API secrets are included in the APK.

With `NEXT_PUBLIC_API_URL` empty, Android uses an explicitly labeled **on-device demo**: sample responses, daily demo credits, saved history, settings, and local reports. Data persists across restarts in app-private storage, and deletion clears that demo data. This mode never creates real entitlements, charges a card, or calls AI. Demo credits have no server-side value.

For live use, deploy the Next.js backend and set the following **before** `android:sync`:

```dotenv
NEXT_PUBLIC_API_URL=https://your-api.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-key
```

Set the server-only `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GOOGLE_API_KEY`, and `NEXT_PUBLIC_APP_URL` on the backend deployment. Configure `NATIVE_APP_ORIGINS=https://localhost`. API CORS permits only the known app/web origins, supports authorization preflights, and never enables credentialed wildcard access. Android calls use verified bearer tokens, not shared demo cookies. Cleartext HTTP and mixed content are disabled.

Run the complete `supabase/schema.sql` once for a new database. For a database already running the original schema, apply **only** `supabase/migrations/20261027124225_android_monetization.sql`. Do not replay the initial schema on an existing database.

## Native behavior

- Local first-open onboarding; hardware back dismisses a dialog or keyboard, navigates back, and minimizes at the root.
- Safe-area handling, dark status/navigation bars, keyboard-aware chat composer, larger touch targets, portrait/landscape and tablet layouts, and reduced-motion support.
- Native clipboard, haptics, network state, Android share sheet, app splash and flame launcher identity.
- Android's system file chooser for photos; no broad gallery/camera permission. Images up to 20 MB are resized to a maximum 1600-pixel edge and re-encoded on the device before upload, removing EXIF metadata and reducing bandwidth. Server upload validation still applies.
- Share cards are written only into the app's private cache and exposed via a narrowly scoped FileProvider URI. Android's share chooser can send them to a chat or a save target; the app does not silently write to public storage.
- Supabase sessions and PKCE verifiers are encrypted with AES-GCM using an Android Keystore key. Account history snapshots are encrypted for offline viewing after a successful live fetch. Backups are disabled; credentials never use plain Preferences. The demo uses Preferences separately.
- WebView debugging is enabled only for debuggable builds. Release navigation loads only bundled assets. A restrictive CSP blocks remote scripts and frames.

## Google and email sign-in

In Supabase Auth enable anonymous sign-in, Google, and manual identity linking. Add **`ai.roastme.app://auth/callback`** to allowed redirect URLs, in addition to the web callback. Use Supabase's standard Google provider callback in Google Cloud. Google OAuth opens in a browser Custom Tab instead of an embedded sign-in WebView. Native authentication uses PKCE and returns via the exact registered app scheme, host, and path. Duplicate callback delivery is coalesced into a single exchange.

Enable email auth, production SMTP, and your email redirect configuration. Linking a new identity retains the existing guest UUID and credits/history. Linking an identity already owned by another account still requires an explicit account-merge process.

## Google Play subscriptions through RevenueCat

1. Create weekly/monthly Play subscriptions and configure RevenueCat's Google Play connection and service credentials.
2. Configure a `premium` entitlement and a current offering containing weekly and monthly packages.
3. Set the APK's public `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` to the RevenueCat Android SDK key. This is a public SDK key, not the RevenueCat secret key.
4. Set server-only `REVENUECAT_SECRET_KEY`, `REVENUECAT_ENTITLEMENT`, `REVENUECAT_WEEKLY_PRODUCT`, and `REVENUECAT_MONTHLY_PRODUCT` to your actual entitlement/product IDs.
5. Set a strong `REVENUECAT_WEBHOOK_AUTH` value on the server and the identical Authorization header in RevenueCat's webhook configuration. Point that webhook to `/api/webhooks/revenuecat`.

The paywall loads localized prices from Google Play offerings. A successful SDK purchase or restore is **not sufficient** to activate Premium: the backend independently fetches RevenueCat's subscriber entitlement, validates configured products, expiry, refund and environment, then updates the profile atomically. Webhooks also fetch current provider state instead of trusting an old event payload. Out-of-order results cannot override a newer check. Production rejects sandbox purchases unless `ALLOW_SANDBOX_PURCHASES=true` is explicitly set for testing.

Restore and manage-subscription flows are wired. Management opens Google Play subscriptions. Validate the complete flow through a Play internal-testing track and licensed test account before charging real users. This cannot be verified without your store configuration.

## AdMob rewarded ads

1. Set your real Gradle `ADMOB_APP_ID`, APK public `NEXT_PUBLIC_ADMOB_REWARDED_ID`, and server `ADMOB_REWARDED_AD_UNIT`.
2. Configure an AdMob reward of **5** and server verification URL `/api/webhooks/admob` on your deployed backend.
3. Configure UMP privacy messaging in AdMob. Consent is requested and any required form is shown before initializing ad requests. The UI can open the native privacy-options form from Settings.

Each request creates a short-lived, owner-bound server intent. The SDK receives that intent as signed callback custom data. The client completion event never mints credits. The backend checks Google's rotating ECDSA key, the unchanged signed query, ad unit, amount, timestamp, user, intent ownership and expiry. A transaction grants +5 once for a unique provider transaction ID. Replays cannot mint more credits. Limits are 2 intents/minute and 10 verified ad rewards/day. An ad that fails or closes early does not grant credits. Pending verification is shown honestly and the balance updates on the next fetch.

## Verification

```powershell
npm test
npm run typecheck
npm run build
npm run native:build
# Browser regression, with npm run dev running:
npm run test:e2e
# Native emulator regression, with a debug APK already built:
$env:ANDROID_TEST_SERIAL='emulator-5556'
node scripts/verify-android.mjs
```

The emulator script refuses physical-device serials. It checks bundled navigation, text/photo costs, on-device photo processing, saved history, clipboard, the Keystore bridge, share-card preview, daily rewards, and layout. Set `ANDROID_TEST_SHARE=true` to additionally automate the system share sheet on a responsive emulator; this host's emulator intermittently stalled Android system UI during that extended check. Unit/database tests cover signature tampering, CORS origins, verified ad idempotency, owner binding, subscription ordering, RLS and credit charging. Real Google OAuth, RevenueCat purchases, AdMob delivery, and provider receipt verification still require their account credentials and test environments.

Before store release, finish the operator/support/legal details already described in the main README, data-safety declarations for the configured SDKs, account-deletion web URL, Play content rating and age targeting, and upload signing. A successful APK/AAB build is not store approval.

Daily reminders are scheduled locally on Android with one recurring slot per weekday. New installs use the installation time for the first 72 hours; after that, at least three days of app-open samples are needed before the usual hour is chosen. Open times are kept in app-private Preferences for up to 60 days and are not sent to the server. The device chooses from 14 messages when it schedules reminders; slots are refreshed as the app is opened. A user can disable reminders in Settings, which cancels the pending slots. Account deletion clears the local reminder history. Android 13+ requires notification permission, and Android may defer inexact alarms during battery-saving modes. No exact-alarm access is requested.
