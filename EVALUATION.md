# Evaluation

All numbers are computed by `server/src/agent/metrics.js` from the batch's final state
after a run, and scored against a naive "retry-everything" baseline. Figures shift on
each re-seed since the batch is regenerated — reproduce with **Re-seed → Run recovery**.

## Dataset

- **67 synthetic failed payments** per batch (configurable), **zero real PII**.
- Each carries Razorpay's real error schema (`code` / `step` / `reason`).
- Also tested: 3 hand-typed Sandbox card scenarios, real Razorpay-shaped webhook payloads
  (e.g. `international_transaction_not_allowed`, `gateway_technical_error`), and an
  adversarial concurrency suite.

### By failure type (from one run)

| reason | code / step | diagnosis → action | recovered |
|---|---|---|---|
| `mandate_afa_required` (RBI >₹15k) | BAD_REQUEST_ERROR / payment_authorization | Mandate fail → represent_mandate | 11 / 12 · ₹2,98,532 |
| `insufficient_funds` | BAD_REQUEST_ERROR / payment_authorization | Insufficient funds → delayed_retry | 11 / 19 |
| `payment_timed_out` | GATEWAY_ERROR / payment_initiation | Transient → smart_retry | 16 / 18 |
| `card_expired` | BAD_REQUEST_ERROR / payment_authentication | Bad card → update_card_link | 8 / 10 |
| `payment_risk_check_failed` | GATEWAY_ERROR / payment_authorization | Bad card → **stopped** | 0 / 6 (all safely blocked) |

## Metrics — Sentinel vs naive baseline

| Metric | Sentinel (AI) | Naive baseline |
|---|---|---|
| Recovery rate | **66.4%** | 50.4% |
| Money recovered | **₹3,74,547** | ₹2,84,042 |
| Retries fired | **38** | 161 |
| False-positive cost | ₹270 | ₹184 |

- **Improvement:** +16 percentage points (~+32% relative), **+₹90,505** extra recovered,
  **123 fewer wasted retries**, net benefit **+₹90,235**.
- The slight increase in communication cost (₹270 vs ₹184) is more than offset by the
  additional recovered revenue and the retries saved — the targeted interventions pay for
  themselves.

## Safety / correctness

- **100% of fraud cases stopped** — never contacted, never retried.
- **Unseen Razorpay reasons** classified correctly via the normaliser + LLM catch-all.
- **Idempotency under concurrency** — `concurrent-webhooks`, `stale-reservation`,
  `duplicate-executor` (`server/src/tests/adversarial.js`) prove exactly-once execution.

## Real vs modeled (honest framing)

- **Real** — confirmed by an actual Razorpay test link / webhook (`recoveredVia:
  "razorpay_paid"`). Demonstrable live: create a real test link → complete the test
  checkout → the case flips to Recovered for real.
- **Modeled** — batch outcomes from transparent per-class success constants, scored
  against the baseline.

The dashboard shows the split ("N real · M modeled") so nothing is presented as real when
it isn't. Baseline and Sentinel are computed from the **same** constants, so the
comparison is fair.
