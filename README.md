# Sentinel — AI Revenue Recovery

> **Razorpay Hackathon · Track 03 — AI Revenue Recovery**
> _Find revenue slipping away and win it back._

Sentinel is an agent that **detects payments at risk, diagnoses _why_ each one
failed, chooses the single right recovery action, executes it against Razorpay
test-mode APIs (or a clearly-labelled simulator), enforces stopping rules, and
shows the money it actually recovered across a whole batch** — with a full,
exportable audit trail and an honest comparison against a naive
"retry-everything" baseline.

It targets the **"Payment degradation → root cause → recovery action"** and
**"Failed-subscription recovery"** directions.

---

## What it proves (the track's bar)

The track asks: _"Don't just identify the problem. Show measured money
recovered across a batch, with compliant escalation, stopping rules, and an
audit trail."_ Sentinel demonstrates every part on screen:

| Requirement | Where you see it |
| --- | --- |
| **Measured money recovered across a BATCH** | Overview hero + `Run recovery on batch` runs the whole ~60-payment batch and reports `₹ recovered / recovery-rate %`. |
| **Compliant escalation (no spam)** | Stopping rules cap messages per customer and retries per payment; blocks are logged. |
| **Stopping rules** | Rules page — editable; enforced before **every** action. |
| **Full audit trail** | Audit page — every decision/action timestamped, **exportable as CSV**. |
| **Honest metrics incl. false-positive cost** | Overview KPI "False-positive cost", priced from wasted messages + retries. |
| **Comparison vs "retry everything"** | Overview "Sentinel vs retry-everything baseline" bars + deltas. |

---

## Design

A clean **white console inspired by [Attio](https://attio.com)** — Inter type,
1px hairline borders (`#ECECEC`), ~10px rounded corners, one restrained indigo
accent, soft shadows, data-dense but airy tables. No auth, no dark theme.

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
