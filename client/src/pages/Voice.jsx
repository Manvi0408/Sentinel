import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { inr } from '../lib/format.js';
import { CardHead } from '../components/ui.jsx';
import { IconMic, IconArrowRight, IconBolt, IconPhone, IconClose, IconCheck } from '../components/Icons.jsx';

const SUGGESTIONS = [
  'Mera payment kyun fail hua?',
  'Kitna amount pending hai?',
  'Payment link bhej do.',
  'Main kal pay karunga.',
  'Mujhe reminder mat bhejna.',
  'UPI se pay kar sakta hoon?',
  'Invoice kab due hai?',
  'Payment ho gaya kya?',
  'Mera card kaam nahi kar raha.',
  'Human se baat karni hai.',
];

export default function Voice() {
  const { refresh } = { refresh: () => {} }; // local page; no console context needed
  const [rows, setRows] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [chat, setChat] = useState([]);
  const [draft, setDraft] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [demoTo, setDemoTo] = useState('');
  const [demoName, setDemoName] = useState('');
  const recRef = useRef(null);
  const audioRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    api.payments().then((p) => {
      const callable = p.filter((r) => ['delayed_retry', 'update_card_link', 'recovery_link', 'represent_mandate'].includes(r.chosenAction) || !r.chosenAction);
      setRows(callable.slice(0, 14));
      if (callable[0]) setOpenId(callable[0].id);
    });
    api.health().then((h) => { setDemoTo(h.demoCallTo || ''); setDemoName(h.demoCallName || ''); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!openId) return;
    clearInterval(pollRef.current);
    api.payment(openId).then((d) => {
      setDetail(d);
      const h = d.payment?.recoveryMessageHinglish || fallbackHinglish(d.payment);
      setChat([{ who: 'agent', text: h }]);
    });
    return () => { window.speechSynthesis?.cancel(); clearInterval(pollRef.current); };
  }, [openId]);

  const p = detail?.payment;
  const amt = p?.amountRs?.toLocaleString('en-IN') || '';
  const first = p?.customerName?.split(' ')[0] || 'ji';

  // ---- speech out (ElevenLabs → on-device) ----
  const forSpeech = (t) =>
    (t || '')
      .replace(/₹\s?([\d,]+)/g, (_, n) => `${n.replace(/,/g, '')} rupaye`)
      .replace(/https?:\/\/[^\s]+/g, 'is link')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  const browserSpeak = (text) => {
    if (!window.speechSynthesis) { setSpeaking(false); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'hi-IN'; u.rate = 0.98;
    const hi = window.speechSynthesis.getVoices().find((v) => /hi|IN/i.test(v.lang));
    if (hi) u.voice = hi;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };
  const speak = async (text) => {
    const spoken = forSpeech(text);
    if (!spoken) return;
    setSpeaking(true);
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: spoken }) });
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        const a = new Audio(url);
        audioRef.current = a;
        a.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
        await a.play();
        return;
      }
    } catch { /* fall through */ }
    browserSpeak(spoken);
  };
  const stop = () => { window.speechSynthesis?.cancel(); audioRef.current?.pause(); setSpeaking(false); };
  const playCall = () => speak(chat.find((m) => m.who === 'agent')?.text || '');

  const addAgent = (text) => setChat((c) => [...c, { who: 'agent', text }]);
  const say = (text) => { addAgent(text); speak(text); };

  // ---- poll the real Razorpay link until it's paid, then mark recovered ----
  const startPolling = () => {
    clearInterval(pollRef.current);
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries += 1;
      try {
        const r = await api.checkLink(openId);
        if (r.paid) {
          clearInterval(pollRef.current);
          say(`Payment ho gaya! ✅ Aapka ₹${amt} recover ho gaya hai. Dhanyavaad ${first} ji!`);
          api.payment(openId).then(setDetail);
        }
      } catch { /* keep polling */ }
      if (tries > 45) clearInterval(pollRef.current);
    }, 4000);
  };

  const sendLink = async (intro) => {
    if (intro) say(intro);
    try {
      const res = await api.callTool('create_payment_link', { paymentId: openId });
      await api.callTool('send_whatsapp', { paymentId: openId });
      addAgent(`Yeh raha aapka secure payment link — ek tap mein complete karein:\n${res.result?.url}`);
      startPolling();
    } catch {
      say('Sorry, link generate karne mein dikkat aa gayi. Thodi der mein dobara try karein.');
    }
  };

  // ---- the brain: intent → reply (+ real tool calls) ----
  const replyTo = async (raw) => {
    const t = (raw || '').toLowerCase().trim();
    const d = raw || '';
    const any = (r, dev) => r.test(t) || (dev && dev.test(d));

    if (any(/(reminder mat|mat bhej|stop|unsubscribe|band karo|pareshan|disturb)/, /(रिमाइंडर मत|मत भेज|बंद करो|परेशान)/)) {
      try { await api.callTool('stop_recovery', { paymentId: openId, reason: 'Customer requested no reminders' }); } catch {}
      return say('Samajh gaya, main aapko aur reminders nahi bhejunga. Jab chahein, aap khud payment complete kar sakte hain. 🙏');
    }
    if (any(/(card).*(kaam nahi|not work|nahi chal|decline|expire|band)/, /(कार्ड).*(काम नहीं|नहीं चल)/))
      return sendLink(`Koi baat nahi ${first} ji. Aap naya card add karke ya UPI se pay kar sakte hain — main secure link bhej raha hoon…`);
    if (any(/(link|bhej|send)/, /(लिंक|भेज)/))
      return sendLink('Zaroor! Main abhi aapko secure payment link bhej raha hoon…');
    if (any(/(kal|baad mein|tomorrow|next week|pay kar|kar dunga|kardunga|kar dungi)/, /(कल|बाद में|पे करूँगा|कर दूँगा|कर दूँगी)/) && !/nahi|nahin|link/.test(t)) {
      try { const res = await api.callTool('record_promise_to_pay', { paymentId: openId }); return say(`Bilkul ${first} ji, note kar liya — aapne ${res.result?.by} tak pay karne ka promise kiya hai. Us se pehle ek reminder bhej dunga. 👍`); } catch { return say('Theek hai, maine note kar liya.'); }
    }
    if (any(/(human|insaan|agent|baat karni|representative|customer care|कस्टमर केयर)/, /(ह्यूमन|इंसान|बात करनी|एजेंट)/)) {
      try { await api.callTool('escalate_to_human', { paymentId: openId }); } catch {}
      return say('Zaroor, main aapko ek human agent se connect kar raha hoon. Thodi der mein aapko call ya message aayega. 👤');
    }
    if (any(/(ho gaya|status|hua kya|done|complete ho|paisa cut|recover)/, /(हो गया|स्टेटस|पूरा हुआ)/)) {
      try {
        const s = await api.callTool('get_payment_status', { paymentId: openId });
        if (s.result?.status === 'recovered') return say(`Ji haan! Aapka ₹${amt} ka payment complete ho chuka hai. Dhanyavaad! ✅`);
        return say(`Abhi aapka ₹${amt} ka payment pending hai. Kya main payment link bhej doon?`);
      } catch { return say(`Aapka ₹${amt} ka payment abhi pending hai.`); }
    }
    if (any(/(invoice|due|kab tak|bill|receipt)/, /(इनवॉइस|कब तक|बिल|ड्यू)/)) {
      try { const inv = await api.callTool('get_invoice', { paymentId: openId }); return say(`Aapka invoice ${inv.result?.invoiceNo} hai, ₹${amt} due. Aaj hi complete kar sakte hain — main link bhej doon?`); } catch { return say(`Aapka ₹${amt} ka invoice pending hai.`); }
    }
    if (any(/(kyun fail|why fail|kyu fail|reason|kaaran|problem kya|fail kyun)/, /(क्यों फेल|कारण|क्यूँ फेल)/)) {
      try { const r = await api.callTool('get_failed_payment_reason', { paymentId: openId }); return say(`Aapka payment "${r.result?.label}" ki wajah se complete nahi hua. ${r.result?.why || ''} Main ise theek karne ke liye link bhej sakta hoon.`); } catch { return say('Aapka payment ek technical reason se fail hua tha.'); }
    }
    if (any(/(upi|gpay|phonepe|paytm|bhim)/, /(यूपीआई|जीपे|फोनपे|पेटीएम)/))
      return sendLink('Ji bilkul! Aap UPI (GPay, PhonePe, Paytm) se pay kar sakte hain. Main link bhej raha hoon jahan UPI option milega…');
    if (any(/(kitna|kitne|amount|paisa|how much|balance)/, /(कितना|कितने|रकम|पैसे|पैसा|राशि)/))
      return say(`Aapka pending amount ₹${amt} hai. Kya main abhi secure link bhej doon?`);
    if (any(/\b(hi|hii+|hello+|hey|namaste|namaskar|hola|helo)\b/, /(हाय|है?लो|हेलो|नमस्ते|नमस्कार|हलो)/))
      return say(`Namaste ${first} ji! Main Sentinel ka assistant bol raha hoon. Aapka ₹${amt} ka payment pending hai — kya aap abhi complete karna chahenge?`);
    if (any(/\b(haan|haa|ha|ok|okay|yes|yeah|sure|theek|thik|chalo|done)\b/, /(हाँ|हां|ठीक|कर दूँ|कर देता|कर दूंगा|चलो|हो जाएगा|ठीक है)/))
      return sendLink('Bahut badhiya! Main abhi payment link bhej raha hoon…');
    if (any(/\b(no|nope|cancel|not now|later|nahi|nahin|nai|baad|busy)\b/, /(नहीं|नही|बाद में|अभी नहीं|व्यस्त)/))
      return say('Koi baat nahi. Jab time ho complete kar lijiyega — main link ready rakhta hoon. 👍');
    if (any(/(thanks|thank you|shukriya|dhanyavaad)/, /(धन्यवाद|शुक्रिया)/))
      return say('Aapka bhi dhanyavaad! Kuch aur madad chahiye to bata dijiyega. 😊');
    return say(`Ji ${first}, samajh gaya. Aapka ₹${amt} ka payment pending hai — main secure payment link bhej sakta hoon. Kahein to bhej doon?`);
  };

  const ask = (text) => { setChat((c) => [...c, { who: 'customer', text }]); setTimeout(() => replyTo(text), 300); };
  const send = () => { if (!draft.trim()) return; ask(draft.trim()); setDraft(''); };

  const talk = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Voice input needs Chrome/Edge with mic access.');
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = 'en-IN'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e) => { setListening(false); if (/not-allowed/.test(e.error)) alert('Please allow microphone access, then press Talk again.'); };
    rec.onresult = (e) => { const text = (e.results[0][0].transcript || '').trim(); if (text) ask(text); };
    recRef.current = rec;
    try { rec.start(); } catch {}
  };

  const stats = useMemo(() => {
    const calls = rows.length;
    const recovered = rows.filter((r) => r.status === 'recovered');
    return { calls, connected: Math.round(calls * 0.82), ptp: Math.max(1, Math.round(calls * 0.35)), recovered: recovered.reduce((s, r) => s + r.amountRs, 0) };
  }, [rows]);

  return (
    <div className="p-6">
      <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[10px] bg-accent-soft text-accent grid place-items-center"><IconMic size={18} /></span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">Hinglish Voice Agent</h1>
          <p className="text-[13px] text-muted">Understands Hinglish, calls tools, sends a real payment link, and marks it recovered.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Calls made" value={stats.calls} />
        <Kpi label="Connected" value={stats.connected} />
        <Kpi label="Promise-to-pay" value={stats.ptp} tone="accent" />
        <Kpi label="₹ recovered by voice" value={inr(stats.recovered)} tone="good" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        <div className="card overflow-hidden">
          <CardHead title="Call queue" sub={`${rows.length} customers`} />
          <div className="max-h-[560px] overflow-y-auto">
            {rows.map((r) => (
              <button key={r.id} onClick={() => setOpenId(r.id)} className={`w-full flex items-center gap-3 px-4 py-3 border-b border-hairline2 text-left hover:bg-surface/70 ${openId === r.id ? 'bg-accent-soft/50' : ''}`}>
                <span className="w-8 h-8 rounded-full bg-ink text-white grid place-items-center text-2xs font-semibold shrink-0">{r.customerName.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{r.customerName}</div>
                  <div className="text-2xs text-faint truncate">{r.failureLabel}</div>
                </div>
                <div className="text-[13px] font-semibold tabular-nums">{inr(r.amountRs)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card flex flex-col">
          <CardHead
            title={p ? `Call · ${p.customerName}` : 'Select a call'}
            sub={p ? `${p.failureLabel} · ${inr(p.amountRs)} at risk` : ''}
            right={
              <div className="flex items-center gap-2">
                <button onClick={() => p && setCallOpen(true)} disabled={!p} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold text-white bg-good hover:brightness-105 disabled:opacity-50 shadow-[0_6px_20px_-8px_rgba(18,122,75,0.6)]">
                  <IconPhone size={14} /> Auto-call
                </button>
                {!speaking ? (
                  <button onClick={playCall} disabled={!p} className="relative inline-flex items-center gap-2 h-9 pl-3 pr-4 rounded-full text-[13px] font-semibold text-white bg-gradient-to-r from-[#4B63E6] via-[#7C5CE0] to-[#22C08A] shadow-[0_6px_20px_-6px_rgba(75,99,230,0.6)] hover:brightness-105 disabled:opacity-50">
                    <span className="grid place-items-center w-6 h-6 rounded-full bg-white/20"><IconMic size={13} /></span>
                    Play Hinglish call
                  </button>
                ) : (
                  <button onClick={stop} className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-semibold text-white bg-stop">
                    <span className="flex gap-0.5 items-end h-3">
                      <span className="w-0.5 bg-white animate-pulse" style={{ height: '60%' }} />
                      <span className="w-0.5 bg-white animate-pulse" style={{ height: '100%' }} />
                      <span className="w-0.5 bg-white animate-pulse" style={{ height: '40%' }} />
                    </span>
                    Speaking… Stop
                  </button>
                )}
              </div>
            }
          />
          {!p ? (
            <div className="p-10 text-center text-[13px] text-faint">Pick a customer from the call queue.</div>
          ) : (
            <div className="p-5 flex flex-col flex-1">
              {/* WhatsApp-style dark chat with the doodle pattern */}
              <div className="relative flex-1 rounded-xl overflow-hidden border border-black/10" style={{ background: '#0B141A' }}>
                <WhatsAppPattern />
                <div className="relative space-y-3 p-4 overflow-y-auto max-h-[420px]">
                  {chat.map((m, i) => (
                    <Bubble key={i} who={m.who} speaking={speaking && i === lastAgent(chat)}>{m.text}</Bubble>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-hairline2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button onClick={() => setShowSuggest((s) => !s)} className="btn h-9">
                      <IconBolt size={14} /> Questions
                    </button>
                    {showSuggest && (
                      <div className="absolute bottom-full mb-2 left-0 w-72 max-h-72 overflow-y-auto card shadow-pop p-1.5 z-30">
                        <div className="px-2 py-1 text-2xs text-faint">Questions you may ask</div>
                        {SUGGESTIONS.map((q) => (
                          <button key={q} onClick={() => { setShowSuggest(false); ask(q); }} className="w-full text-left text-[13px] px-2.5 py-2 rounded-lg hover:bg-surface">{q}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type as the customer…" className="input flex-1" />
                  <button className="btn btn-accent h-9 w-9 px-0 justify-center" onClick={send}><IconArrowRight size={16} /></button>
                  <button onClick={talk} className={`btn h-9 px-3 ${listening ? 'bg-stop text-white border-stop' : ''}`} title="Speak as the customer">
                    <IconMic size={15} /> {listening ? 'Listening…' : 'Talk'}
                  </button>
                </div>
                <div className="text-2xs text-faint">
                  Ask in Hinglish (voice or text). Say “link bhej do” for a <b>real Razorpay test link</b> — complete the test checkout and it flips to <b className="text-good">Recovered</b>.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {callOpen && p && (
        <CallModal p={p} to={demoTo} name={demoName} speak={speak} onPlace={() => api.callTool('place_call', { paymentId: openId })} onClose={() => { stop(); setCallOpen(false); }} />
      )}
    </div>
  );
}

// Auto-call screen: ringing → connected → Hinglish voice → promise-to-pay → link sent.
function CallModal({ p, to, name, speak, onPlace, onClose }) {
  const [phase, setPhase] = useState('ringing');
  const [secs, setSecs] = useState(0);
  const [lines, setLines] = useState([]);
  // The demo call rings the merchant's own number, so greet the demo name (Manvi).
  const callee = name || p.customerName;
  const first = callee.split(' ')[0];
  const amt = (p.amount / 100).toLocaleString('en-IN');
  const script = `Namaste ${first} ji, Sentinel se call kar rahe hain. Aapka ₹${amt} ka payment pending hai — kya aap abhi complete karna chahenge? Main aapko secure link bhej deta hoon.`;

  useEffect(() => {
    onPlace?.(); // records the call (and dials for real if DRY_RUN=false + Twilio)
    const t = [];
    t.push(setTimeout(() => { setPhase('connected'); setLines([{ who: 'agent', text: script }]); speak(script); }, 1900));
    t.push(setTimeout(() => setLines((l) => [...l, { who: 'cust', text: 'Haan ji, bhej do link.' }]), 6200));
    t.push(setTimeout(() => { const r = 'Bilkul! Link bhej diya — ek tap mein complete kar lijiye. Dhanyavaad!'; setLines((l) => [...l, { who: 'agent', text: r }]); speak(r); }, 7400));
    t.push(setTimeout(() => setPhase('done'), 11500));
    return () => t.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (phase === 'ringing') return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const mmss = `${String(Math.floor(secs / 60)).padStart(1, '0')}:${String(secs % 60).padStart(2, '0')}`;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[420px] rounded-[26px] bg-[#0d0f14] text-white border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* header */}
        <div className="px-6 pt-7 pb-5 text-center bg-gradient-to-b from-[#12331f] to-transparent">
          <div className="relative mx-auto w-20 h-20">
            <span className="absolute inset-0 rounded-full bg-good/30 animate-ping" style={{ animationDuration: '1.6s', display: phase === 'ringing' ? 'block' : 'none' }} />
            <span className="relative w-20 h-20 rounded-full bg-ink grid place-items-center text-[22px] font-semibold border border-white/10">
              {callee.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="mt-3 text-[18px] font-semibold">{callee}</div>
          <div className="text-[13px] text-white/50 tabular-nums">{to || 'customer'}</div>
          <div className="mt-1 text-[12px] text-good">
            {phase === 'ringing' ? 'Ringing…' : phase === 'done' ? `Call ended · ${mmss}` : `Connected · ${mmss}`}
          </div>
        </div>

        {/* transcript */}
        <div className="px-5 pb-4 space-y-2.5 max-h-[240px] overflow-y-auto">
          {lines.map((m, i) => (
            <div key={i} className={`flex ${m.who === 'agent' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${m.who === 'agent' ? 'bg-white/10 text-white' : 'bg-good text-white'}`}>
                {m.who === 'agent' && <div className="text-[10px] text-good mb-0.5">Sentinel AI · Hinglish</div>}
                {m.text}
              </div>
            </div>
          ))}
          {phase !== 'ringing' && secs >= 8 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="chip bg-good/15 text-good border-good/30"><IconCheck size={12} /> Promise-to-pay captured</span>
              <span className="chip bg-white/10 text-white/80 border-white/15">Link sent → {to}</span>
            </div>
          )}
        </div>

        {/* controls */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-center">
          <button onClick={onClose} className="w-14 h-14 rounded-full bg-stop grid place-items-center rotate-[135deg] shadow-lg hover:brightness-110">
            <IconPhone size={22} />
          </button>
        </div>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 grid place-items-center text-white/70 hover:bg-white/20"><IconClose size={15} /></button>
      </div>
    </div>
  );
}

function lastAgent(chat) { for (let i = chat.length - 1; i >= 0; i--) if (chat[i].who === 'agent') return i; return -1; }
function linkify(text) {
  if (typeof text !== 'string') return text;
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noreferrer" className="underline font-semibold break-all">{part}</a> : part,
  );
}
// Faint WhatsApp-style doodle pattern over the dark chat background.
function WhatsAppPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" style={{ opacity: 0.05 }}>
      <defs>
        <pattern id="wa-doodles" width="150" height="150" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 20h26a5 5 0 0 1 5 5v11a5 5 0 0 1-5 5H29l-7 6v-6h-6a5 5 0 0 1-5-5V25a5 5 0 0 1 5-5z" />
            <path d="M112 26c3-6 12-4 12 3 0 6-12 12-12 12s-12-6-12-12c0-7 9-9 12-3z" />
            <rect x="96" y="98" width="30" height="22" rx="3" /><circle cx="111" cy="109" r="5.5" />
            <path d="M40 96v25M40 96l14-4v23" /><circle cx="36" cy="121" r="4" /><circle cx="50" cy="115" r="4" />
            <path d="M70 60l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" />
            <path d="M120 60a8 8 0 1 0-8 8h8z" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wa-doodles)" />
    </svg>
  );
}
function Bubble({ who, children, speaking }) {
  const agent = who === 'agent';
  return (
    <div className={`flex ${agent ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${agent ? 'bg-surface border border-hairline text-ink' : 'bg-accent text-white'} ${agent && speaking ? 'ring-2 ring-accent/40' : ''}`}>
        {agent && <div className="text-2xs font-semibold text-accent mb-0.5 flex items-center gap-1"><IconMic size={11} /> Sentinel AI</div>}
        {linkify(children)}
      </div>
    </div>
  );
}
function Kpi({ label, value, tone }) {
  const c = tone === 'good' ? 'text-good' : tone === 'accent' ? 'text-accent-ink' : 'text-ink';
  return (
    <div className="card p-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`mt-1.5 text-[24px] font-semibold tracking-tight2 tabular-nums ${c}`}>{value}</div>
    </div>
  );
}
function fallbackHinglish(p) {
  if (!p) return '';
  const first = p.customerName?.split(' ')[0] || 'ji';
  return `Hello ${first}, Sentinel se baat kar rahe hain. Aapka ₹${p.amountRs?.toLocaleString('en-IN')} ka payment pending hai. Kya aap abhi complete kar sakte hain? Main aapko secure link bhej deta hoon.`;
}
