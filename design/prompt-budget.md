# Roast prompt input budget

The shared instructions are compressed without changing the selected model or reasoning level. Persona, latest-message referents, corrections, language/script, chaos scaling, reply length, safety boundaries and no-long-dash punctuation remain explicit.

Local counts use the pinned gpt-tokenizer o200k_base BPE encoding, plus a conservative framing allowance. This is a local planning budget, not an exact billing guarantee for every provider/model. API response usage is authoritative and is logged as numeric counts only (input, cached input, output and reasoning); message content is not added to usage logs.

- Generation input: at most 2,200 locally counted tokens.
- Safety input: at most 800 tokens, including the generated reply.
- Normal text/chat/battle: at most 3,000 locally counted input tokens across the two successful calls.
- Photo requests have an additional description safety call (up to800 tokens) and Gemini image processing; the 3,000 text budget is not the entire image pipeline's usage.

The latest user message and system rules are never truncated. Retain up to six recent exchanges as a chronological suffix. Drop oldest exchanges first. If an old reply is exceptionally large, keep its user message and a clearly marked head/tail excerpt when it fits. If mandatory new input cannot fit, reject with a shorten-message error and do not charge app credits. If a generated reply cannot fit the safety budget, return a retry error; never skip safety or silently truncate a new reply.

Offline measurement for Grandma/English/medium: the former full main input was 2,244 BPE content tokens at chaos30 and2,316 at chaos100; the new instruction content is646 and690 respectively. Across all personas, new English instruction content is614–690 tokens. API framing, latest input, history and safety content add to these figures. Typical fresh English exchanges are expected around900–1,100 total input tokens, but production usage must verify this.

Tests cover all personas, supported languages, three reply lengths and chaos boundaries; oversized Unicode input, preserved corrections, paired/ordered history, old-reply excerpts and explicit overflow handling.

## Follow-up continuity correction

All generation modes now use one shared message builder, including photos and battles. Queries isolate history by authenticated account, current chat session and persona, with deterministic ordering. Recent turns include both the full user message and its assistant reply. If the last reply is too large, fit a labelled excerpt at any character length (including token-heavy Unicode under500 characters). Never silently omit the entire immediately preceding exchange; if its user message cannot fit, return an explicit budget error instead. Older turns can still be removed to satisfy the same token budget.

Main-chat session pointers are scoped by account as well as persona and persisted on restoration. Legacy pointers are reused only when they occur in that account's returned history. A fresh conversation stays a separate session. Short follow-ups and recall requests explicitly use recent facts and corrections before adding humor. Usage logs expose the number of history turns sent, without message content.

## Compact conversation notes

Session-based generations now return a JSON envelope containing the visible reply and updated plain-text notes in the same medium-reasoning request. No extra summarizer request is added. Notes are capped at 200 locally counted BPE tokens and 1,200 characters, keeping whole fact lines. Notes and the memory instruction share the existing 2,200-token main-input budget; the 800-token output safety check remains separate. Notes add up to 200 output tokens, within the existing 2,048 completion-token limit shared with reasoning. API usage remains authoritative.

Retain explicit user facts, named subjects, active topic, corrections and referents. Never promote assistant inventions or jokes into facts; preserve fictional context. Exclude credentials, contact details, sensitive traits, internal/provider details and instructions. Latest dialogue overrides stale summaries. The summary enters as labelled untrusted user data before recent exchanges, never as a system instruction. The latest message and immediately preceding exchange retain priority if space runs out.

Guest notes live in browser/WebView localStorage, scoped by authenticated anonymous user ID, session and persona, with at most 12 chat summaries per account; notes older than 30 days are not reused. They are sent transiently with the next request and validated against an owned source message and session revision. Guests' chat messages still follow the existing server history policy; only their summaries are local. Signed-in summaries live in service-only `conversation_memories`, committed atomically with the reply and credits. Failed or cancelled generations cannot update notes. Existing conversations build summaries from the recent history available on their next successful reply; older unseen turns are not retroactively summarized.

An anonymous identity upgraded in place may import its own local notes on the next successful reply. Signing into a different account does not transfer the old guest's notes or history. Fresh-chat confirmation clears the previous summary and increments its revision before selecting a new session. Message deletion clears session summaries and increments the revision, invalidating stale guest envelopes, too. Account deletion cascades server notes; sign-out/account deletion clear local notes. Local storage failures do not prevent sending a roast, but local-only guest notes will not persist if storage is unavailable. Apply `supabase/conversation-memory.sql` before deploying this code; new-project installs include it in `schema.sql`.
