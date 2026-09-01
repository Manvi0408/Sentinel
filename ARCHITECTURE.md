# Architecture

Sentinel is an **AI revenue-recovery agent**: it detects a failed payment, diagnoses
the *real* Razorpay reason, chooses one bounded recovery action, and executes it —
with a deterministic policy engine enforcing the boundaries and an immutable audit
trail recording every step.

It is **not** a single LLM prompt and **not** a trained model. It is an
LLM-reasoner-with-guardrails agent wrapped around structured payment data.

---

## Stack

| Layer | Tech |
|---|---|
| Client | React 18 + Vite + Tailwind CSS |
| Server | Node.js + Express (ESM) |
| Data | SQLite via Prisma |
| AI engine | Anthropic Claude → Google Gemini → deterministic rules (fallback chain) |
| Voice | Web Speech API + ElevenLabs TTS (Hinglish) |
| Payments | Razorpay (test mode) |

Everything is served from a **single origin** (`http://localhost:4100`) — the API and
the console share one server.

---

## The recovery flow (per payment)

```
Failed payment ─▶ Diagnose ─▶ Decide ─▶ Policy check ─▶ Execute ─▶ Verify + Log
   (detect)      (LLM/rules)  (1 action)  (guardrail)    (tools)    (audit trail)
```

1. **Detect** — a failed payment enters the queue carrying Razorpay's real error
   schema: `code` / `step` / `reason`.
2. **Diagnose** — the AI engine classifies the failure and returns a JSON verdict:
   `{ class, confidence, why, action, message, messageHinglish }`.
3. **Decide** — one bounded action is chosen for the class (never a free-for-all).
4. **Policy check** — a deterministic rule engine approves or blocks it.
5. **Execute** — if approved, the tool fires (real Razorpay test link, WhatsApp, etc.);
   if risky, it escalates instead.
6. **Verify + Log** — marks the case recovered/stopped and writes every step to the
   audit trail.

---

## AI engine (the reasoning layer)

`server/src/agent/aiEngine.js` probes once at startup and caches the first engine that
works: **Anthropic Claude → Gemini → built-in rules**. If no key is present (or quota is
exhausted), the deterministic rules engine runs everything — so the system works fully
offline and never crashes.

The model receives the **verbatim** Razorpay `code` / `step` / `reason` and is forced to
return strict JSON (`responseMimeType: application/json`).

### Why the LLM matters (rules vs LLM)

On a real Razorpay reason the rules table has never seen, rules-only falls through to a
default and **blind-retries**. The LLM reads the actual reason text and picks the correct
action:

```
reason: "transaction_amount_exceeds_limit"   (₹29,999 — not in the rules table)

RULES-ONLY  → Transient / smart_retry        ✗  blind retry (will fail again)
LLM (Gemini) → Bad card / update_card_link    ✓  routes customer to fix the method
```

**Rules = safe floor. LLM = generalises to Razorpay's long tail.** Both are bounded by
the same policy engine.

---

## Cost & latency management

At Razorpay scale a heavy LLM prompt on *every* failed payment is expensive and slow, so
the reasoning layer is tiered cheapest-first:

1. **Startup probe, not per-call** — `aiEngine.js` probes the LLM **once** at boot and
   caches the working engine. A dead key or exhausted quota is discovered once, not on
   each of ~60 payments, so a broken key never adds latency to the batch.
2. **Rules-first cost gate (`LLM_GATE=exact`)** — an **unambiguous** failure (one that
   matched a known Razorpay `reason` verbatim — see `classifySource` in `config.js`) is
   diagnosed by the **zero-cost, sub-millisecond rules engine** and **never touches the
   LLM**. Only the ambiguous long tail (keyword/heuristic matches, never-seen reasons)
   spends an LLM call — exactly the cases where the model earns its cost.
3. **Rules as the free fallback** — if the LLM is absent, over quota, or errors, the rules
   engine answers for free. The system degrades in cost, never in availability.

The gate is **opt-in** (default off) so the full-batch demo still shows the LLM diagnosing
every case; flip `LLM_GATE=exact` in `server/.env` to see the production cost profile,
where the LLM fires only on the ambiguous minority.

---

## Policy engine (the guardrail)

The AI only *diagnoses* — it has no autonomous execution power. A code-defined policy
engine (`server/src/agent/stoppingRules.js`) enforces the boundaries **before any action
fires**:

- **Retry caps** — at most 3 silent retries and 3 customer contacts per payment.
- **Fraud & paid** — never contact a fraud-flagged or already-paid case.
- **Calling window** — voice calls only 9am–9pm (TRAI-aligned), else downgrade to WhatsApp.
- **Drop-if-recovered** — anything that left the funnel is dropped.

Read/edit at runtime via `GET/PUT /api/rules`.

---

## Error taxonomy (Razorpay-native)

Every failure carries `code` / `step` / `reason`, stored verbatim, and is normalised onto
five internal classes that drive the action:

| reason | code | step | action |
|---|---|---|---|
| `insufficient_funds` | BAD_REQUEST_ERROR | payment_authorization | delayed retry + link |
| `card_expired` | BAD_REQUEST_ERROR | payment_authentication | card-update link (no retry) |
| `payment_timed_out` | GATEWAY_ERROR | payment_initiation | smart retry |
| `payment_risk_check_failed` | GATEWAY_ERROR | payment_authorization | stop / escalate |
| `mandate_afa_required` | BAD_REQUEST_ERROR | payment_authorization | re-present mandate (RBI > ₹15k) |

Any reason not in the table is mapped by keyword/step heuristics, with the LLM as the
catch-all (`server/src/config.js` → `normalizeRazorpayReason`).

---

## Agent toolbelt (12 tools)

`server/src/agent/tools.js`:

`get_customer` · `get_payment_status` · `get_invoice` · `get_failed_payment_reason` ·
`get_recovery_history` · `create_payment_link` · `send_whatsapp` · `place_call` ·
`retry_payment` · `record_promise_to_pay` · `stop_recovery` · `escalate_to_human`

---

## Razorpay API integration

**What runs today (test mode).** The executor (`server/src/agent/execute.js`) instantiates
the official `razorpay` SDK only when `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are present,
and calls the **Payment Links API** — `paymentLink.create(...)` — to mint a **real
`rzp.io` test-mode link** for card-update / recovery / delayed-retry actions. Inbound
`payment_link.paid` / `payment.captured` webhooks are **HMAC-SHA256 signature-verified**
against `RAZORPAY_WEBHOOK_SECRET` over the raw request body — and routed through the same
`runOnce` idempotency lock — before a case is flipped to Recovered.
No keys → the same actions run in clearly-labelled **simulated** mode; no code path ever
moves real money.

**Production API mapping (how each action maps to a specific Razorpay product).** The
bounded action set is deliberately 1:1 with a Razorpay capability, so the same agent wires
onto production APIs without changing its decision logic:

| Diagnosis → action | Razorpay API in production |
|---|---|
| Gateway timeout → smart retry | **Smart Optimizer / intelligent routing** to re-route the retry via a healthier gateway |
| Card expired → update-card link | **Payment Links** + **Tokenisation** to re-collect on a fresh instrument |
| Insufficient funds → delayed retry + link | **Orders / Payment Links**, retried near payday |
| Mandate AFA (>₹15k) → re-present mandate | **Recurring / e-mandate** re-presentment + AFA authentication link |
| Fraud risk → stop & escalate | no charge API is called — the case is blocked and escalated |

Only the test-mode Payment Links path is wired in this build; the rest of the column is the
production integration each bounded action is designed to plug into.

---

## Idempotency & exactly-once execution

Firing the same retry twice can **double-charge a customer**, so every money action goes
through a unique-key reservation lock (`server/src/agent/guard.js`):

- **The lock is the database.** A `UNIQUE` constraint on `RecoveryExecution.idempotencyKey`
  means exactly one caller can create the row for a given key; every concurrent duplicate
  hits the constraint and **reads the already-reserved result instead of executing again**.
- **`runOnce(key, paymentId, fn)`** — wins the lock → runs the tool once → caches the
  result; loses the lock → returns the cached result **without firing**. So even if the AI
  loops, a webhook is redelivered, or a process crashes and retries, the customer is
  charged **at most once**.
- **Crash safety.** A reservation left `reserved` past `STALE_MS` (a process that died
  mid-action) is swept and degraded to `STOP_AND_ESCALATE` rather than hanging or silently
  re-firing.
- **Proven under concurrency.** `server/src/tests/adversarial.js` exercises
  `concurrent-webhooks`, `duplicate-executor`, and `stale-reservation` and asserts
  exactly-once (`npm --prefix server test`).

---

## Real vs modeled outcomes (honest labelling)

- **Real** — confirmed by an actual Razorpay test-mode payment link or webhook. The Voice
  agent → real link → `paid` webhook → `markRecovered` path is genuinely real.
- **Modeled** — batch outcomes drawn from transparent per-class success constants, scored
  against a naive baseline.

Every recovery is tagged (`recoveredVia`) and surfaced as "N real · M modeled" in the
dashboard — nothing is passed off as real when it isn't.
