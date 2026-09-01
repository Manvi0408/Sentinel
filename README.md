<p align="center">
  <img src="client/public/banner.jpg" alt="Sentinel — AI Revenue Recovery" width="900">
</p>

<h1 align="center">Sentinel — AI Revenue Recovery</h1>

<p align="center">
  <em>Razorpay Hackathon · Track 03 — AI Revenue Recovery</em><br/>
  <em>Catch revenue before it's gone. Win it back — automatically, and safely.</em>
</p>

---

**Sentinel is an AI agent that recovers revenue lost to failed payments — it detects a failure, diagnoses the _real_ reason, chooses one bounded recovery action, and executes it, with a deterministic policy engine enforcing every boundary and an immutable audit trail recording every step.**

## <u>Problem & user value</u>

Indian subscription/D2C founders and finance teams lose a continuous stream of revenue to **involuntary churn** — payments that fail on insufficient funds, expired cards, gateway timeouts, and the RBI **>₹15,000 e-mandate (AFA)** wall. Today they rely on their processor's blind "retry every 24h" logic and a human manually chasing CSV exports. That wastes money (retrying dead cards, gateway fees), annoys good customers, and still leaks recoverable revenue. **The user is the founder/RevOps lead who wants failed payments won back automatically and safely — without a human in the loop for every case.**

## <u>The agent — solution & engineering</u>

The solution is an **agent, not a prompt**. For each failed payment it runs: **Detect → Diagnose → Decide → Policy-check → Execute → Verify+Log.**

- **Diagnosis** is done by an LLM (Claude → Gemini fallback) over the **verbatim Razorpay `code / step / reason`**, returning strict JSON `{class, confidence, why, action, message}`. A **deterministic rules engine** is the always-on fallback, so it works offline and never crashes.
- **The key design choice: the AI only diagnoses — it has no execution power.** A code-defined **policy engine** enforces the boundaries before anything fires: max 3 retries, max 3 contacts, never touch fraud-flagged/paid cases, TRAI 9am–9pm calling window. This is what makes an autonomous money-moving agent *safe*.
- **12 real tools** (create Razorpay test link, WhatsApp, call, retry, promise-to-pay, escalate…), with **idempotent execution** (a unique-key reservation lock) proven under concurrency (`concurrent-webhooks`, `stale-reservation`, `duplicate-executor` tests) so duplicate webhooks can't double-charge.

## <u>Baseline vs. advanced (measured improvement)</u>

- **Baseline:** naive "retry-everything" (blind 24h retries, no diagnosis, no links) → **50.4%** recovery.
- **Advanced (Sentinel):** LLM diagnosis + policy engine + bounded actions → **66.4%** recovery, **₹3.75L recovered**, **+₹90,505 vs baseline**, **123 fewer wasted retries**, **100% of fraud cases safely blocked**, on a **67-case** batch. (~+16pp, ~+32% relative.)
- One concrete win of the advanced over rules-only: on an unseen reason `transaction_amount_exceeds_limit`, rules-only **blind-retries** (wrong); the LLM reads it and picks **update-card link** (no retry). Rules = safe floor, LLM = generalises to the long tail — both bounded by the same policy engine.

## <u>Results</u>

| Metric | Result |
| --- | --- |
| Recovery Rate | **66.4%** |
| Money Recovered | **₹3.75L** |
| Improvement vs Baseline | **+₹90,505** |
| Wasted Retries Prevented | **123** |
| Fraud Cases Safely Blocked | **100%** |
| Cases Evaluated | **67** |

**Measured on a batch of failed payments using Razorpay failure schemas.**

## <u>End-to-end quality</u>

It's a working full-stack app (React + Node/Express + SQLite/Prisma), not slideware. It runs **live Razorpay test-mode recoveries**: the agent creates a **real `rzp.io` test payment link**, and when the test checkout is paid, a webhook flips the case to **Recovered for real**. Outcomes are **honestly labelled "real vs modeled"** — the dashboard shows the split so nothing modeled is passed off as real.

## <u>Reproducibility</u>

Clean-environment path in `QUICKSTART.md`: `git clone → npm install → cp server/.env.example server/.env → npm run setup → npm run seed → npm run dev` (opens `localhost:4100`). To reproduce the headline result: **Re-seed → Run recovery on batch**, then read `/api/metrics` (baseline and advanced are computed from the same constants, so the comparison is fair). Docs: `ARCHITECTURE.md`, `API.md`, `EVALUATION.md`.

## <u>Biggest failure mode & hot take</u>

**Failure mode:** the agent's most dangerous instinct was *over-trusting the model* — on quota loss or a never-seen reason it would default to a blind retry, wasting money and spamming customers.
**Hot take:** *the reliability of an agent comes from what it's **not** allowed to do.* Put the LLM behind a deterministic policy engine (model diagnoses, code enforces), make execution idempotent, and **label real vs. modeled outcomes** so you never fool yourself. That's the difference between a demo and something you'd trust with money.

---

## Quick start

Requires **Node 18+** (built on Node 22).

```bash
# from the repo root
npm install            # installs root + server + client
npm run setup          # prisma generate + create the SQLite DB
npm run seed           # seed a fresh synthetic batch (~60 payments)
npm run dev            # runs API (:4100) + React console (:5173) together
```

Then open **http://localhost:5173**, click **Open console**, and hit
**Run recovery on batch**.

> **Ports:** the API runs on **4100** (4000 is often taken). The Vite dev server
> proxies `/api` → `:4100`. Change with `PORT` in `server/.env`.

**Everything works with no keys** — Sentinel runs in *simulated* mode with a
deterministic rules engine. To go live, copy `server/.env.example` →
`server/.env` and add keys:

```bash
RAZORPAY_KEY_ID=rzp_test_xxx      # payment-link actions create REAL test-mode links
RAZORPAY_KEY_SECRET=xxx
GEMINI_API_KEY=xxx                # Gemini does diagnosis + action + copy
```

---

## The console

1. **Overview** — hero *Money recovered* + recovery-rate %, KPI tiles (money at
   risk, interventions sent, retries saved vs baseline, false-positive cost),
   and the Sentinel-vs-baseline comparison bar.
2. **Recovery queue** — every payment: amount, customer, failure reason,
   diagnosis, confidence, chosen action, status. Click a row → detail drawer.
3. **Recovery detail** (drawer) — vertical timeline `Failed → Diagnosed →
   Stopping-rule check → Intervention chosen → Executed → Outcome`, the agent's
   "why", and the generated recovery message with an **English / Hinglish**
   toggle.
4. **Audit trail** — timestamped log of every decision/action/outcome, with
   **Export CSV**.
5. **Rules** — the stopping rules, shown and editable.
6. **Settings** — key status + the recovery-rate model constants (editable).

Header buttons **Run recovery on batch** and **Re-seed batch** are on every page.

---

## The agent loop

```
INGEST → DIAGNOSE → DECIDE → STOPPING RULES → EXECUTE → MEASURE + LOG
```

1. **Ingest** — seed ~60 synthetic failed/at-risk payments (see below).
2. **Diagnose** — classify each failure into one of five classes with a
   confidence score and a short "why". Uses **Gemini** when a key is present,
   otherwise the deterministic **rules engine** (identical output shape).
   Every Gemini result is validated and the action is forced to match the class
   — the model can never talk Sentinel into retrying a dead card.
3. **Decide** — pick **one bounded action** per class:

   | Class | Action | Notes |
   | --- | --- | --- |
   | Transient (gateway timeout / bank down) | **Smart retry** after cooldown | |
   | Insufficient funds | **Delayed retry + reminder** | retry near payday |
   | Bad card (expired/invalid) | **Send card-update link** | **never retried** |
   | Mandate fail | **Re-present mandate** | within limits |
   | Abandoned checkout | **Send recovery link** | |

4. **Stopping rules** — checked before **every** action (see below).
5. **Execute** — Razorpay test-mode call, wrapped so it runs simulated when keys
   are absent. Payment-link actions create a **real Razorpay test-mode link**
   when keys exist; retries/re-presents are modelled (there's no live gateway
   transaction to re-drive on synthetic data).
6. **Measure + log** — every step becomes a timestamped `AuditEvent`; metrics
   are recomputed.

Recovery runs in **waves**. Each wave advances a virtual clock by the cooldown,
so every action on a payment is at least `cooldownHours` after its previous one
— the cooldown is real and visible in each payment's timeline.

---

## System Architecture

<p align="center">
  <img src="client/public/architecture.jpg" alt="Sentinel system architecture — Detect, Diagnose &amp; Decide, Execute, Observe &amp; Learn" width="960">
</p>

The system runs as four stages end-to-end:

1. **Detect** — Razorpay webhooks, payment logs, subscriptions and invoices feed a
   risk-detection engine that queues at-risk payments and a context builder assembles
   the full case (customer history, attempts, device, plan).
2. **Diagnose & Decide** — a diagnosis agent (LLM → rules fallback) classifies the
   failure and a decision engine picks **one** action from a bounded set; the
   **stopping-rules guardrail** allows or suppresses it (max messages/retries, quiet
   hours, do-not-contact, risk limits) before anything fires.
3. **Execute** — the action executor drives the real Razorpay/channel integrations, the
   customer interaction is tracked, and the outcome tracker updates recovery impact.
4. **Observe & Learn** — every decision, action and outcome is written to an immutable
   audit trail, exported to reports, and fed back to improve diagnosis and decisions.

_Security & compliance: PII encrypted in transit and at rest, keys backend-only,
immutable audit logs, RBAC for access._

---

## Stopping rules (editable on the Rules page)

Enforced before every single action, with every block written to the trail:

- **Max 3 retries per payment** — never hammer one payment.
- **Never retry a hard decline** — expired/bad cards get a card-update link, never a retry.
- **2-hour cooldown** — minimum gap between two actions on the same payment.
- **Max 2 messages per customer** — the anti-spam guardrail.
- **Stop on success** — once recovered, do nothing further.

When a rule is hit the payment moves to **Stopped** with the exact reason
recorded (e.g. _"Retry limit reached (3/3)"_, _"Hard decline (bad card) —
retrying is never allowed"_).

---

## Seed data (synthetic — stated plainly)

`server/src/seed.js` generates ~60 payments carrying Razorpay's real error schema
(`code` / `step` / `reason`) across five failure classes (`insufficient_funds`,
`card_expired`, `payment_timed_out`, `payment_risk_check_failed`,
`mandate_afa_required`), Indian names, and realistic INR ticket sizes.
**This data is entirely synthetic** — no real customers and no real money.

Sentinel includes **threshold-triggered mandate re-authentication** flows; the
demo dataset uses ₹15,000+ mandate cases to **illustrate RBI-style AFA recovery
scenarios**. (RBI's additional-factor-authentication rules for card/e-mandate
auto-debits have category-specific thresholds; the demo models the classic
₹15,000 trigger to showcase the flow — it is **not** a claim that all Indian
mandates fail above ₹15,000.)

It exists so the agent has a batch to recover across. Re-seed any time from the header.

---

## How "money recovered" is measured

All amounts are computed in `server/src/agent/metrics.js` from the batch's final
state after a run.

- **Money recovered** = sum of `amount` for every payment that ended in status
  `recovered`. **Recovery rate %** = recovered ÷ total-at-risk.
- **Outcomes** in simulated mode are drawn from the **per-class success-rate
  constants** on the Settings page — *clearly labelled as a model, not live
  gateway results.* With Razorpay keys, payment links are real test-mode links;
  the conversion outcome is still modelled on synthetic customers.
- **False-positive cost** — the honest counter-metric. Every action taken on a
  payment that ultimately did **not** recover is charged:
  - a wasted **message** = `costPerMessage + goodwillPenalty` (it cost money *and* annoyed a customer for nothing),
  - a wasted **retry** = `gatewayFeePerRetry`.
  Sentinel's stopping rules keep this low; it's shown, not hidden. The slight
  increase in communication cost (e.g. **₹270 vs the baseline's ₹184**) is **more
  than offset** by the additional recovered revenue (**≈ +₹90,505**) and **123
  fewer wasted retries** — the targeted interventions pay for themselves.
- **Transient-failure logging** — transient gateway failures (e.g.
  `gateway_technical_error`, `payment_timed_out`) are classified and logged even
  when a recovery outcome isn't immediately observed, preserving the telemetry
  for future optimization.
- **Baseline ("retry everything")** — the naive strategy: blindly retry every
  payment up to 3× with **no diagnosis and no links**. Computed as the
  **expected** outcome from the same per-class constants, so the comparison is
  fair. Retrying a dead card or an abandoned cart mostly/entirely fails, which
  is exactly why Sentinel wins.
- **Comparison** — *extra recovered* (Sentinel − baseline), *retries saved*
  (baseline − Sentinel), and **net benefit** = extra recovered − Sentinel's
  false-positive cost (proving the targeted interventions pay for themselves
  even after honestly charging for every wasted action).

Every constant is editable on the **Settings** page, so the money math is fully
transparent and reproducible.

---

## Tech

- **Frontend** — React + Vite + Tailwind (`client/`)
- **Backend** — Node.js + Express (`server/`)
- **DB** — SQLite via Prisma (`server/prisma/schema.prisma`)
- **AI** — Google Gemini for diagnosis + action + recovery copy, with a
  deterministic rules-engine fallback so it fully works offline
- **Payments** — Razorpay test mode + a simulated-mode wrapper

```
SENTINEL/
├── server/
│   ├── prisma/schema.prisma      # Payment, AuditEvent, Setting
│   └── src/
│       ├── config.js             # DEFAULT rules + model constants (all editable)
│       ├── seed.js               # synthetic batch generator
│       ├── agent/
│       │   ├── rules.js          # deterministic diagnosis + message copy
│       │   ├── gemini.js         # Gemini layer (validated, guarded)
│       │   ├── stoppingRules.js  # guardrails, checked before every action
│       │   ├── execute.js        # Razorpay wrapper + simulator
│       │   ├── runBatch.js       # the wave loop
│       │   └── metrics.js        # money recovered + baseline + FP cost
│       └── index.js              # Express API (no auth)
└── client/                       # React console (landing + 6 pages)
```

---

## API (no auth — single hardcoded merchant "Acme Store · test mode")

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | merchant + which engines are live |
| `POST` | `/api/seed` | re-seed a synthetic batch |
| `POST` | `/api/run` | run the recovery agent over the batch |
| `GET` | `/api/metrics` | Overview numbers |
| `GET` | `/api/payments` · `/api/payments/:id` | queue + detail (with events) |
| `GET` | `/api/audit` · `/api/audit.csv` | audit trail + CSV export |
| `GET`/`PUT` | `/api/rules` | view / edit stopping rules |
| `GET`/`PUT` | `/api/settings` · `/api/settings/model` | keys status + model constants |

---

_Synthetic batch · Razorpay test mode · every money action is explainable,
bounded, and logged._
