# API reference

Base URL: `http://localhost:4100` — all endpoints are prefixed with `/api`, return JSON,
and run in **test mode**. A live, styled version is at `/docs` in the running app.

## Read

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness + active engines (`{ mode: { razorpay, ai } }`) |
| GET | `/api/metrics` | Recovery rate, money recovered, real vs modeled, baseline comparison |
| GET | `/api/payments` | The recovery queue — every payment with `code/step/reason`, diagnosis, action, status |
| GET | `/api/payments/:id` | One case + its full audit timeline |
| GET | `/api/audit` | Immutable audit trail (also `/api/audit.csv`) |
| GET | `/api/degradation` | Recovery-rate health per failure segment |
| GET | `/api/promises` | Promise-to-pay tracker |
| GET | `/api/rules` | The deterministic stopping rules |
| GET | `/api/settings` | Recovery-rate model constants |
| GET | `/api/tools` | The agent's toolbelt |

## Act

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/run` | Run the recovery agent across the batch |
| POST | `/api/seed` | Generate a fresh synthetic batch (`{ count }`) |
| POST | `/api/simulate/event` | Fire a Razorpay-shaped failure event through the real path |
| POST | `/api/webhook/razorpay` | Receive real Razorpay events (HMAC-verified when a secret is set) |
| POST | `/api/tools/:name` | Invoke one agent tool |
| POST | `/api/payments/:id/checklink` | Poll a real test-mode link; flips to Recovered when paid |
| POST | `/api/tts` | Hindi text-to-speech (ElevenLabs) |
| POST | `/api/voice/chat` | Hinglish voice-agent reply |

## Config

| Method | Path | Purpose |
|---|---|---|
| PUT | `/api/rules` | Update the stopping rules |
| PUT | `/api/settings/model` | Update the recovery-rate constants |
| POST | `/api/rules/reset` · `/api/settings/model/reset` | Reset to defaults |

---

### Example — run the batch and read the scoreboard

```bash
curl -X POST http://localhost:4100/api/run
curl http://localhost:4100/api/metrics
```

```json
{
  "batch":   { "total": 67, "diagnosed": 67, "recoveredCount": 46 },
  "sentinel":{ "moneyRecovered": 374547, "recoveryRatePct": 66.4, "realRecoveredCount": 0, "modeledRecoveredCount": 46 },
  "baseline":{ "recoveryRatePct": 50.4 },
  "comparison":{ "extraRecovered": 90505, "retriesSaved": 123, "netBenefit": 90235 }
}
```

### Example — a real Razorpay `payment.failed` webhook

```json
{ "event": "payment.failed",
  "payload": { "payment": { "entity": {
    "amount": 4500000,
    "error_code": "BAD_REQUEST_ERROR",
    "error_step": "payment_authentication",
    "error_reason": "international_transaction_not_allowed" } } } }
```

→ ingested, classified **Bad card → `update_card_link`** (correctly no blind retry),
stored with the real `code/step/reason` verbatim.
