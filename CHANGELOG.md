# Improvement Changelog

Every entry is a meaningful iteration, the **evidence** that came out of it, and the
**decision** that evidence drove next. Baseline → advanced.

---

### v1 — Baseline: deterministic rules engine + naive "retry-everything"
- **Built:** a rules engine that maps a failure reason → diagnosis class → one bounded
  action, plus a naive "blindly retry every payment up to 3×" baseline to measure against.
- **Evidence:** on the synthetic batch the naive baseline recovered **~50%**, wasting
  retries on dead cards and abandoned carts it could never win.
- **Decision:** a fixed table can't tell *why* a payment failed — bring in a reasoner.

### v2 — LLM diagnosis (Claude → Gemini → rules fallback)
- **Built:** `aiEngine.js` probes once at startup and picks the first working engine;
  the LLM classifies from the verbatim failure text and returns strict JSON.
- **Evidence:** on a reason **not** in the rules table (`transaction_amount_exceeds_limit`)
  rules-only blind-retried (✗); the LLM classified **Bad card → update-card link** (✓).
- **Decision:** the LLM generalises to the long tail — but an autonomous model must not be
  allowed to *act* freely with money.

### v3 — Deterministic policy engine (the guardrail)
- **Built:** `stoppingRules.js` — retry caps (3/3), never-contact-fraud/paid, TRAI 9am–9pm
  calling window — enforced **before** any tool fires. The AI diagnoses; code decides.
- **Evidence:** fraud (`payment_risk_check_failed`) cases went from being retried to
  **100% safely blocked**; false-positive cost stayed low (₹270).
- **Decision:** reliability comes from what the agent is *not* allowed to do — keep the
  policy engine as the single choke point.

### v4 — Razorpay-native error taxonomy + normaliser
- **Built:** store the real `code / step / reason` verbatim; `normalizeRazorpayReason()`
  maps ~40 real Razorpay reasons (+ keyword/step heuristics) onto the internal classes,
  with the LLM as the catch-all.
- **Evidence:** a real webhook `international_transaction_not_allowed` was classified
  correctly (Bad card → no blind retry) instead of collapsing to a default.
- **Decision:** the system now survives real Razorpay data, not just the synthetic 5 —
  make the batch data carry the same schema.

### v5 — Idempotent execution + adversarial concurrency tests
- **Built:** a unique-key reservation lock (`guard.js`) so exactly one caller executes a
  recovery; tests `concurrent-webhooks`, `stale-reservation`, `duplicate-executor`.
- **Evidence:** duplicate/concurrent "paid" webhooks no longer double-execute — exactly-once.
- **Decision:** safe enough to wire a **real** money path next.

### v6 — Real test-mode recovery + "real vs modeled" labelling
- **Built:** the agent creates a **real Razorpay test payment link**; `/checklink` polls
  Razorpay and flips the case to Recovered on `paid`. Each recovery is tagged
  `recoveredVia: razorpay_paid` (real) vs `modeled`.
- **Evidence:** the dashboard now shows "N real · M modeled" — no modeled outcome is passed
  off as real.
- **Decision:** report honestly; measure the advanced system against the baseline.

### v7 — Measured improvement (honest scoreboard)
- **Built:** `metrics.js` computes recovery rate, money recovered, false-positive cost, and
  a **fair** comparison to the naive baseline (same per-class constants).
- **Evidence (advanced vs baseline, 67-case batch):**
  **66.4% vs 50.4%**, **₹3.75L recovered**, **+₹90,505**, **123 fewer wasted retries**,
  **100% fraud blocked**.
- **Decision:** the advanced agent beats the baseline on every axis that matters — recover
  more, waste fewer retries, never act unsafely.

---

## Biggest failure mode → lesson
The agent's most dangerous instinct was **over-trusting the model** — on quota loss or a
never-seen reason it would default to a blind retry. The fix that generalised: **put the
LLM behind a deterministic policy engine (model diagnoses, code enforces), make execution
idempotent, and label real vs. modeled outcomes** so you never fool yourself. Reliability
came from constraints, not from a bigger prompt.
