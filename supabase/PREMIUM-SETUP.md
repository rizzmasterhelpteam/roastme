# Premium sessions and review access

Apply `premium-sessions.sql` to an existing database before deploying the API. Fresh databases use the appended section in `schema.sql`.

The existing profile entitlement is shared between web and Android using the Supabase user ID. A newly loaded signed-in page/WebView calls `premium/connect` with a random instance ID. This replaces the account's active instance. Requests from the old Premium instance fail with HTTP409, and the UI locks on its next five-second status check or when it becomes visible. Refreshing status never claims the session. Explicit "Use Premium here" or loading a new page claims it again. App/OS windows are not forcibly closed.

The session and promotional grant tables are service-role-only with RLS. A new instance cancels the old generation lease so an in-flight result cannot be committed after takeover. Reviewer grants use the same Premium generation rules and account rate limits; there is no password or email bypass in app code. A profile trigger preserves valid grants when store subscriptions expire. Remove the grant before intentionally revoking a review entitlement.

Reviewer sign-in: Continue with email → Sign in with a password. Enter the credentials recorded privately in Play Console, accept terms, and sign in. Do not commit reviewer credentials.

Ad privacy: Android updates Google UMP consent at launch for free users and checks consent again before rewarded ads. UMP determines applicable regions, including the EEA, UK and Switzerland; it can allow limited ads after refusal where supported. Privacy choices remain in Settings. The operator must publish the European regulations message for the actual Android AdMob application under AdMob → Privacy & messaging. Test regional flows with Google test devices/geography before release. No custom blanket consent banner is added to the web app, which currently uses essential auth/preferences and has no web ad SDK. This integration is not a claim of complete GDPR compliance.
