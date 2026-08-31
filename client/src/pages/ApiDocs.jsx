import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SentinelLogo from '../components/SentinelLogo.jsx';

const BASE = 'http://localhost:4100';

// Left-nav structure — groups → items (each item id matches a <Section id>).
const NAV = [
  { group: 'Getting started', items: [
    ['introduction', 'Introduction'],
    ['authentication', 'Authentication & keys'],
    ['base-url', 'Base URL'],
    ['errors', 'Error taxonomy'],
  ] },
  { group: 'Core objects', items: [
    ['payment-object', 'The payment object'],
    ['policy-engine', 'Policy engine'],
    ['llm-vs-rules', 'LLM vs rules'],
  ] },
  { group: 'Endpoints', items: [
    ['health', 'Health'],
    ['metrics', 'Metrics'],
    ['payments', 'List payments'],
    ['payment', 'Retrieve a payment'],
    ['run', 'Run recovery'],
    ['seed', 'Seed a batch'],
    ['simulate', 'Simulate an event'],
    ['webhook', 'Razorpay webhook'],
    ['audit', 'Audit trail'],
    ['degradation', 'Degradation'],
    ['promises', 'Promise-to-pay'],
    ['rules', 'Stopping rules'],
    ['tools', 'Agent tools'],
    ['voice', 'Voice agent'],
  ] },
];

export default function ApiDocs() {
  const [active, setActive] = useState('introduction');
  const mainRef = useRef(null);

  // scrollspy — highlight the section nearest the top of the viewport
  useEffect(() => {
    const ids = NAV.flatMap((g) => g.items.map(([id]) => id));
    const onScroll = () => {
      let best = ids[0], bestDist = Infinity;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const d = Math.abs(el.getBoundingClientRect().top - 96);
        if (d < bestDist) { bestDist = d; best = id; }
      }
      setActive(best);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-white text-[#1a1a1e]" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      {/* top bar */}
      <header className="sticky top-0 z-30 h-14 border-b border-black/[0.07] bg-white/90 backdrop-blur flex items-center px-5 gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <SentinelLogo size={28} radius={8} />
          <span className="font-bold text-[16px] tracking-tight">Sentinel</span>
        </Link>
        <span className="text-black/20">/</span>
        <span className="text-[14px] font-semibold">API Reference</span>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/" className="text-[13px] font-medium text-black/60 hover:text-black px-3 h-8 rounded-lg hover:bg-black/[0.04] grid place-items-center">Home</Link>
          <Link to="/app/overview" className="text-[13px] font-semibold text-white bg-[#4B63E6] hover:brightness-95 px-3.5 h-8 rounded-lg grid place-items-center">Open console</Link>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto flex">
        {/* left nav */}
        <aside className="hidden lg:block w-[248px] shrink-0 border-r border-black/[0.06] sticky top-14 self-start h-[calc(100vh-56px)] overflow-y-auto py-6 px-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-black/35 px-2 mb-2">API Docs</div>
          {NAV.map((g) => (
            <div key={g.group} className="mb-5">
              <div className="text-[14px] font-semibold text-black/85 px-2 mb-2">{g.group}</div>
              {/* sub-items nested under a light connector line */}
              <div className="ml-3 pl-3 border-l border-black/[0.10] space-y-0.5">
                {g.items.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => go(id)}
                    className={`relative w-full text-left text-[13px] px-2.5 h-8 rounded-lg transition-colors ${active === id ? 'bg-[#EEF1FE] text-[#3546b8] font-semibold' : 'text-black/55 hover:text-black hover:bg-black/[0.04]'}`}
                  >
                    {/* little horizontal tick into the vertical guide */}
                    <span className={`absolute -left-3 top-1/2 w-2.5 h-px ${active === id ? 'bg-[#4B63E6]/50' : 'bg-black/[0.10]'}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* content */}
        <main ref={mainRef} className="flex-1 min-w-0 px-6 lg:px-10 py-10">
          <span className="inline-block text-[11px] font-semibold px-2 py-1 rounded-md bg-[#EDEBFB] text-[#5b4bd6]">API Reference</span>

          <Section id="introduction" title="Introduction"
            code={<Code label="Base URL">{`${BASE}`}</Code>}>
            <P>The <b>Sentinel API</b> is organized around REST. It has predictable resource-oriented URLs, accepts JSON request bodies, returns JSON-encoded responses, and uses standard HTTP verbs and status codes.</P>
            <P>Everything runs in <b>test mode</b> — it never touches live banking networks or real money. Payments are synthetic (or Razorpay test-mode), and the agent's outcomes are either modeled or confirmed by a test-mode Razorpay webhook.</P>
            <P>The whole thing is served from a <b>single origin</b> (the API and the console share one server), so from the browser you can call these endpoints with relative paths like <Mono>/api/metrics</Mono>.</P>
          </Section>

          <Section id="authentication" title="Authentication & keys"
            code={<Code label=".env — add your own keys (never commit them)">{`# Razorpay (TEST mode only)
RAZORPAY_KEY_ID=<add your rzp_test_... key id here>
RAZORPAY_KEY_SECRET=<add your test secret here>
RAZORPAY_WEBHOOK_SECRET=<add your webhook secret here>

# AI engine (first that works wins)
ANTHROPIC_API_KEY=<add your Claude key here>
GEMINI_API_KEY=<add your Gemini key here>

# Voice (optional)
ELEVENLABS_API_KEY=<add your key here>`}</Code>}>
            <P>The Sentinel app itself is single-tenant (one demo merchant), so the browser-facing endpoints require <b>no auth token</b>.</P>
            <P>The <b>secrets it uses to reach Razorpay and the AI models</b> live server-side in a <Mono>.env</Mono> file — never in the client, never in git. Add your own values in the placeholders shown; the app reads them at startup.</P>
            <P>Preference order for the AI engine is <b>Claude → Gemini → built-in rules</b>. If no key is present, the deterministic rules engine runs everything, so the API still works fully offline.</P>
          </Section>

          <Section id="base-url" title="Base URL"
            code={<Code label="Example — with curl">{`curl ${BASE}/api/health`}</Code>}>
            <P>All endpoints are prefixed with <Mono>/api</Mono> and served from:</P>
            <P><Mono>{BASE}</Mono></P>
            <P>In production you would swap this for your deployed origin. Responses are always JSON; requests that send a body use <Mono>Content-Type: application/json</Mono>.</P>
          </Section>

          <Section id="errors" title="Error taxonomy (Razorpay-native)"
            code={<Code label="Failure shape on every payment">{`{
  "code":   "BAD_REQUEST_ERROR",   // top-level
  "step":   "payment_authorization",
  "reason": "insufficient_funds"    // programmatic
}`}</Code>}>
            <P>Every failed payment carries Razorpay's <b>real error schema</b> — <Mono>code</Mono>, <Mono>step</Mono>, <Mono>reason</Mono> — stored verbatim.</P>
            <P>Sentinel normalizes the full Razorpay reason set onto <b>five internal classes</b> that drive the recovery action:</P>
            <Table rows={[
              ['insufficient_funds', 'BAD_REQUEST_ERROR', 'payment_authorization', 'delayed retry + reminder'],
              ['card_expired', 'BAD_REQUEST_ERROR', 'payment_authentication', 'card-update link (never retry)'],
              ['payment_timed_out', 'GATEWAY_ERROR', 'payment_initiation', 'smart retry'],
              ['payment_risk_check_failed', 'GATEWAY_ERROR', 'payment_authorization', 'stop / escalate'],
              ['mandate_afa_required', 'BAD_REQUEST_ERROR', 'payment_authorization', 're-present mandate (RBI > ₹15k)'],
            ]} />
            <P>Any real reason the table doesn't list is mapped by keyword/step heuristics, and the LLM acts as the catch-all — so unfamiliar Razorpay reasons are still diagnosed correctly.</P>
          </Section>

          <Section id="payment-object" title="The payment object"
            code={<Code label="payment">{`{
  "id": "pay_mtd8...",
  "amountRs": 18534,
  "customerName": "Aarav Sharma",
  "code": "BAD_REQUEST_ERROR",
  "step": "payment_authorization",
  "reason": "mandate_afa_required",
  "diagnosisClass": "Mandate fail",
  "confidence": 0.88,
  "chosenAction": "represent_mandate",
  "status": "recovered",
  "retriesUsed": 1,
  "recoveredAmount": 1853400
}`}</Code>}>
            <P>A payment is the core object. It starts <Mono>at_risk</Mono>, gets a diagnosis, a bounded action, and ends <Mono>recovered</Mono> or <Mono>stopped</Mono>.</P>
            <List items={[
              ['status', 'at_risk · diagnosed · retrying · link_sent · recovered · stopped'],
              ['diagnosisClass', 'Transient · Insufficient funds · Bad card · Mandate fail · Abandoned'],
              ['chosenAction', 'smart_retry · delayed_retry · update_card_link · represent_mandate · recovery_link'],
              ['amount / amountRs', 'paise / rupees'],
            ]} />
          </Section>

          <Section id="policy-engine" title="Policy engine (the guardrail)"
            code={<Code label="Default stopping rules">{`{
  "maxContactAttempts": 3,
  "maxAutoRetries": 3,
  "callWindowStart": 9,
  "callWindowEnd": 21,
  "neverContactPaid": true,
  "neverContactFraud": true,
  "dropIfNoLongerFailed": true
}`}</Code>}>
            <P>The AI only <b>diagnoses</b> — it has no autonomous execution power. A deterministic, code-defined policy engine enforces the boundaries before any action fires:</P>
            <List items={[
              ['Retry caps', 'at most 3 silent retries and 3 customer contacts per payment'],
              ['Fraud & paid', 'never contact a fraud-flagged or already-paid case'],
              ['Calling window', 'voice calls only 9am–9pm (TRAI-aligned), else downgrade to WhatsApp'],
            ]} />
            <P>Read or edit these at <Mono>GET/PUT /api/rules</Mono>.</P>
          </Section>

          <Section id="llm-vs-rules" title="LLM vs rules — why the model matters"
            code={<Code label="Same input, both engines">{`reason: "transaction_amount_exceeds_limit"
code:   "BAD_REQUEST_ERROR"
step:   "payment_authorization"      // ₹29,999 — not in the rules table

RULES-ONLY → Transient / smart_retry      ✗  (blind retry — will fail again)
LLM (Gemini) → Bad card / update_card_link ✓  (reads "amount exceeds card limit",
                                              routes customer to fix the method)`}</Code>}>
            <P>The deterministic rules engine is the always-on <b>safety floor</b> — it maps the five known classes to a bounded action and guarantees the system works offline. But it only knows the reasons in its table.</P>
            <P>On a <b>real Razorpay reason it has never seen</b>, rules-only falls through to a default and <b>blind-retries</b> — wasteful and often wrong. The <b>LLM reads the actual <Mono>reason</Mono> text</b> and picks the correct action: for <Mono>transaction_amount_exceeds_limit</Mono> it declines to retry (a retry can't succeed) and sends a card-update link instead.</P>
            <P>That's the division of labour: <b>rules = safe floor, LLM = generalizes to Razorpay's long tail</b> — and <b>both are bounded by the same policy engine</b>, so even the model's choice can't bypass the guardrails. Every diagnosis records its <Mono>diagnosisSource</Mono> (<Mono>anthropic</Mono> / <Mono>gemini</Mono> / <Mono>rules</Mono>).</P>
          </Section>

          <Endpoint id="health" method="GET" path="/api/health"
            desc="Liveness + which engines are active (Razorpay mode, AI engine)."
            res={`{ "ok": true, "mode": { "razorpay": "live-test", "ai": "gemini" } }`} />

          <Endpoint id="metrics" method="GET" path="/api/metrics"
            desc="The scoreboard: money recovered, at-risk, recovery rate, and the honest comparison vs a naive 'retry-everything' baseline."
            res={`{
  "batch": { "total": 60, "diagnosed": 60, "recoveredCount": 41 },
  "sentinel": { "moneyRecovered": 486120, "recoveryRatePct": 68.3, "interventions": 74 },
  "baseline": { "recoveryRatePct": 22.4 },
  "comparison": { "extraRecovered": 291540, "retriesSaved": 88, "netBenefit": 284900 }
}`} />

          <Endpoint id="payments" method="GET" path="/api/payments"
            desc="The recovery queue — every payment with its Razorpay code/step/reason, diagnosis, chosen action, and status."
            res={`[
  { "id": "pay_...", "amountRs": 18534, "customerName": "Aarav Sharma",
    "code": "BAD_REQUEST_ERROR", "step": "payment_authorization",
    "reason": "mandate_afa_required", "diagnosisClass": "Mandate fail",
    "chosenAction": "represent_mandate", "status": "recovered" }
]`} />

          <Endpoint id="payment" method="GET" path="/api/payments/:id"
            desc="A single case with its full audit timeline (every step, timestamped)."
            res={`{ "payment": { "id": "pay_...", "code": "...", "step": "...", "reason": "...",
    "diagnosisWhy": "...", "recoveryMessage": "...", "recoveryMessageHinglish": "..." },
  "events": [ { "step": "ingest", "decision": "...", "ts": "..." }, ... ] }`} />

          <Endpoint id="run" method="POST" path="/api/run"
            desc="Run the recovery agent across the whole batch: diagnose → decide → policy-check → execute → log."
            req={`curl -X POST ${BASE}/api/run`}
            res={`{ "metrics": { "sentinel": { "recoveryRatePct": 68.3, "moneyRecovered": 486120 },
    "batch": { "total": 60 } } }`} />

          <Endpoint id="seed" method="POST" path="/api/seed"
            desc="Generate a fresh synthetic batch of failed payments (no real PII)."
            req={`curl -X POST ${BASE}/api/seed -H "Content-Type: application/json" -d '{ "count": 60 }'`}
            res={`{ "ok": true, "count": 60 }`} />

          <Endpoint id="simulate" method="POST" path="/api/simulate/event"
            desc="Fire a Razorpay-shaped failure event through the exact same path a live webhook takes — it gets detected, diagnosed and queued."
            req={`curl -X POST ${BASE}/api/simulate/event \\
  -H "Content-Type: application/json" \\
  -d '{ "type": "payment.failed",
        "reason": "insufficient_funds",
        "amount": 499900 }'`}
            res={`{ "ok": true, "detected": { "id": "pay_...", "diagnosisClass": "Insufficient funds",
    "action": "delayed_retry" } }`} />

          <Endpoint id="webhook" method="POST" path="/api/webhook/razorpay"
            desc="Receives real Razorpay events. Failure events (payment.failed, invoice.expired, subscription.halted) are ingested + diagnosed; paid/captured events mark the matching payment recovered. When RAZORPAY_WEBHOOK_SECRET is set, the x-razorpay-signature is HMAC-verified (spoofed requests get 401)."
            req={`# Razorpay sends this — real error fields are read verbatim
{ "event": "payment.failed",
  "payload": { "payment": { "entity": {
    "amount": 4500000,
    "error_code": "BAD_REQUEST_ERROR",
    "error_step": "payment_authentication",
    "error_reason": "international_transaction_not_allowed" } } } }`}
            res={`{ "ok": true, "detected": { "diagnosisClass": "Bad card", "action": "update_card_link" } }`} />

          <Endpoint id="audit" method="GET" path="/api/audit"
            desc="The immutable audit trail — every decision and action, timestamped. Also available as CSV at /api/audit.csv."
            res={`[ { "ts": "...", "paymentId": "pay_...", "step": "diagnose",
    "decision": "Diagnosed as Mandate fail (88%) — ...", "outcome": "Mandate fail" } ]`} />

          <Endpoint id="degradation" method="GET" path="/api/degradation"
            desc="Recovery-rate health per failure segment — fires the moment a segment starts slipping."
            res={`{ "segments": [ { "reason": "payment_timed_out", "rate": 0.71, "trend": "down" } ] }`} />

          <Endpoint id="promises" method="GET" path="/api/promises"
            desc="Promise-to-pay tracker — customers who committed to a date, tracked to kept / pending / overdue."
            res={`[ { "customerName": "...", "amountRs": 12499, "dueDate": "...", "status": "pending" } ]`} />

          <Endpoint id="rules" method="GET · PUT" path="/api/rules"
            desc="Read or update the deterministic stopping rules (the guardrails)."
            req={`curl -X PUT ${BASE}/api/rules -H "Content-Type: application/json" \\
  -d '{ "maxContactAttempts": 3, "maxAutoRetries": 3 }'`}
            res={`{ "ok": true, "rules": { "maxContactAttempts": 3, ... } }`} />

          <Endpoint id="tools" method="GET · POST" path="/api/tools · /api/tools/:name"
            desc="The agent's toolbelt (12 tools): get_customer, get_failed_payment_reason, create_payment_link, send_whatsapp, place_call, retry_payment, record_promise_to_pay, stop_recovery, escalate_to_human, ... List them, or invoke one directly."
            req={`curl -X POST ${BASE}/api/tools/create_payment_link \\
  -H "Content-Type: application/json" -d '{ "paymentId": "pay_..." }'`}
            res={`{ "ok": true, "tool": "create_payment_link", "result": { "short_url": "https://rzp.io/i/..." } }`} />

          <Endpoint id="voice" method="POST" path="/api/voice/chat · /api/tts"
            desc="The Hinglish voice agent. /voice/chat returns a display + Devanagari reply; /tts returns natural Hindi audio (ElevenLabs)."
            req={`curl -X POST ${BASE}/api/voice/chat -H "Content-Type: application/json" \\
  -d '{ "text": "kitna payment pending hai?" }'`}
            res={`{ "reply": "Aapka ₹12,499 ka payment pending hai...",
  "hindi": "आपका बारह हज़ार...", "source": "gemini" }`} />

          <div className="h-16" />
          <p className="text-[12.5px] text-black/40">Sentinel · AI Revenue Recovery — test-mode API. Never commit real keys.</p>
        </main>
      </div>
    </div>
  );
}

/* ---------- building blocks ---------- */
function Section({ id, title, children, code }) {
  return (
    <section id={id} className="scroll-mt-20 py-8 border-b border-black/[0.06] grid lg:grid-cols-2 gap-8 lg:gap-12">
      <div>
        <h2 className="text-[24px] font-bold tracking-tight mb-3">{title}</h2>
        <div className="space-y-3">{children}</div>
      </div>
      <div className="lg:pt-1">{code}</div>
    </section>
  );
}
function Endpoint({ id, method, path, desc, req, res }) {
  return (
    <section id={id} className="scroll-mt-20 py-8 border-b border-black/[0.06] grid lg:grid-cols-2 gap-8 lg:gap-12">
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-1 rounded-md" style={{ background: '#EAF1FE', color: '#2b62c9' }}>{method}</span>
          <span className="font-mono text-[13.5px] text-[#1a1a1e] break-all">{path}</span>
        </div>
        <p className="text-[14px] leading-relaxed text-black/65">{desc}</p>
      </div>
      <div className="space-y-3 lg:pt-1">
        {req && <Code label="Request">{req}</Code>}
        {res && <Code label="Response" tone="res">{res}</Code>}
      </div>
    </section>
  );
}
function Code({ label, children, tone }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { navigator.clipboard.writeText(String(children)); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* ignore */ }
  };
  return (
    <div className="rounded-xl overflow-hidden border border-white/10" style={{ background: '#0B1220' }}>
      <div className="flex items-center gap-2 px-3 h-9 border-b border-white/10">
        <span className="w-2 h-2 rounded-full" style={{ background: tone === 'res' ? '#4ADE80' : '#8AB4F8' }} />
        <span className="text-[11.5px] font-medium text-slate-300">{label}</span>
        <button onClick={copy} className="ml-auto text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-[12.5px] leading-relaxed" style={{ color: '#cdd6e4', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{children}</pre>
    </div>
  );
}
function P({ children }) { return <p className="text-[14.5px] leading-relaxed text-black/70">{children}</p>; }
function Mono({ children }) { return <code className="font-mono text-[13px] px-1 py-0.5 rounded bg-black/[0.05] text-[#3546b8]">{children}</code>; }
function List({ items }) {
  return (
    <div className="mt-1 space-y-1.5">
      {items.map(([k, v]) => (
        <div key={k} className="text-[13.5px] flex gap-2">
          <code className="font-mono text-[12.5px] text-[#3546b8] shrink-0">{k}</code>
          <span className="text-black/55">— {v}</span>
        </div>
      ))}
    </div>
  );
}
function Table({ rows }) {
  return (
    <div className="mt-2 rounded-lg border border-black/[0.08] overflow-x-auto">
      <table className="w-full text-[12px] font-mono">
        <thead><tr className="text-left text-black/45 border-b border-black/[0.06]">
          <th className="py-1.5 px-2 font-medium">reason</th><th className="py-1.5 px-2 font-medium">code</th><th className="py-1.5 px-2 font-medium">step</th><th className="py-1.5 px-2 font-medium">action</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-black/[0.04] last:border-0">
              <td className="py-1.5 px-2 text-[#3546b8]">{r[0]}</td><td className="py-1.5 px-2 text-black/60">{r[1]}</td><td className="py-1.5 px-2 text-black/60">{r[2]}</td><td className="py-1.5 px-2 text-black/50 font-sans">{r[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
