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

## Results

| Metric | Result |
| --- | --- |
| Recovery Rate | **66.4%** |
| Money Recovered | **₹3.75L** |
| Improvement vs Baseline | **+₹90,505** |
| Fraud Cases Safely Blocked | **100%** |
| Wasted Retries Prevented | **123** |
| Cases Evaluated | **67** |

_Measured against a naive retry-everything baseline._

---

## The Problem

Indian subscription businesses lose revenue every day due to **involuntary churn**:

- Insufficient funds
- Expired cards
- Gateway failures
- RBI e-mandate authentication failures
- Payment risk blocks

Most systems blindly retry failed payments. **Blind retries waste money, annoy customers, and still fail to recover revenue.**

---

## Real Problem Solved — RBI e-Mandate Failures

### ₹15,000+ Mandate Authentication Failures

When recurring payments require additional customer authentication, **retrying cannot solve the problem.** Sentinel detects these cases, classifies them correctly, and routes them into a **mandate recovery workflow** instead of wasting retries.

| Metric | Result |
| --- | --- |
| Cases Detected | 12 |
| Cases Recovered | 11 |
| Revenue Recovered | ₹2,98,532 |
| Recovery Rate | **91.7%** |

_Highest-performing recovery workflow in the batch._

---

## From Failed Payment to Recovered Revenue

Four steps. One intelligent recovery loop. **No manual chasing. No blind retries.**

```mermaid
flowchart LR
  D[Detect] --> Di[Diagnose] --> De[Decide] --> R[Recover]
  R -.-> D
```

---

## How Sentinel Works

```mermaid
flowchart TD
  A[Detect] --> B[Diagnose] --> C[Decide] --> P[Policy Check] --> E[Execute] --> V[Verify &amp; Audit]
```

- The **AI diagnoses**.
- The **policy engine decides** what is allowed.
- The **tools execute**.
- Every action is **audited**.

---

## System Architecture

<p align="center">
  <img src="client/public/architecture.jpg" alt="Sentinel system architecture — Detect, Diagnose &amp; Decide, Execute, Observe &amp; Learn" width="960">
</p>

### Components

- React + Vite Frontend
- Node.js + Express Backend
- SQLite + Prisma
- Claude → Gemini → Rules Fallback
- Razorpay Integration
- Twilio Voice
- WhatsApp Recovery
- Audit Layer

---

## AI Agent Design

### Diagnosis Engine

Claude → Gemini → Rules. Returns strict JSON:

```json
{
  "class": "...",
  "confidence": 0.92,
  "why": "...",
  "action": "..."
}
```

### Policy Engine

- Max 3 retries
- Max 3 contacts
- Never contact fraud
- Never touch paid cases
- TRAI calling window

### Tool Executor

**12 recovery tools.**

---

## Evaluation

### Measured, Not Marketed

| Metric | Sentinel | Baseline |
| --- | --- | --- |
| Recovery Rate | **66.4%** | 50.4% |
| Money Recovered | **₹3.75L** | ₹2.84L |
| Extra Revenue | **+₹90,505** | — |
| Retries Fired | **38** | 161 |
| Fraud Contacts | **0** | N/A |

### Dataset

- 67 failed payments
- Razorpay error schema
- 5 failure classes
- Realistic INR amounts
- Zero PII

---

## Example Recovery Story

### ₹48,000 Mandate Failure

| | |
| --- | --- |
| **Failure** | `mandate_afa_required` |
| **Diagnosis** | Mandate Re-Authentication Required |
| **Action** | `represent_mandate` |
| **Result** | Recovered |
| **Revenue** | ₹48,000 |

---

## Safety & Compliance

- Deterministic guardrails
- RBI-aware recovery flows
- TRAI call windows
- Fraud auto-block
- Idempotent execution
- Immutable audit trail

---

## Live Recovery Demo

Sentinel can generate a **real Razorpay test payment link**. When the payment is completed:

```mermaid
flowchart LR
  F[Failed] --> L[Recovery Link] --> P[Payment Completed] --> W[Webhook Received] --> R[Recovered]
```

Dashboard metrics update automatically.

---

## Repository Structure

```
SENTINEL/
├── client/       # React + Vite console (landing + dashboard)
├── server/       # Node + Express API, agent, tests
│   ├── prisma/   # SQLite schema
│   └── src/      # agent, config, seed, index, tests
└── *.md          # QUICKSTART · ARCHITECTURE · API · EVALUATION · CHANGELOG
```

---

## Quick Start

```bash
git clone https://github.com/Manvi0408/Sentinel.git
cd Sentinel
npm install
npm run setup
npm run seed
npm run dev
# open http://localhost:4100
```

Runs with **no keys** on the built-in rules engine. Add TEST-mode keys in
`server/.env` (copy from `server/.env.example`) to enable LLM diagnosis and real
Razorpay test links.

---

## Documentation

- [`QUICKSTART.md`](QUICKSTART.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`API.md`](API.md)
- [`EVALUATION.md`](EVALUATION.md)

---

## Key Insight

> **The reliability of an AI agent comes from what it is _not_ allowed to do.**

Sentinel puts the LLM behind a deterministic policy engine, making autonomous recovery **measurable, auditable, and safe.**
