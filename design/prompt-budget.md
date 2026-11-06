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
