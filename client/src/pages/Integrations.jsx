import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { IconCheck, IconMic, IconPlug, IconInbox } from '../components/Icons.jsx';
import { RazorpayIcon, WhatsAppIcon } from '../components/BrandIcons.jsx';

function GeminiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4B63E6" d="M12 2c.5 4.9 4.6 9 9.5 9.5C16.6 12 12.5 16.1 12 21c-.5-4.9-4.6-9-9.5-9.5C7.4 11 11.5 6.9 12 2z" />
    </svg>
  );
}

export default function Integrations() {
  const [keys, setKeys] = useState({ razorpay: false, gemini: false });
  useEffect(() => {
    api.settings().then((d) => setKeys(d.keys || {})).catch(() => {});
  }, []);

  const items = [
    { name: 'Razorpay Payments', desc: 'Create test-mode payment links & re-present mandates.', connected: keys.razorpay, hint: 'RAZORPAY_KEY_ID / SECRET', Icon: RazorpayIcon },
    { name: 'WhatsApp', desc: 'Deliver recovery links & reminders on WhatsApp.', connected: true, hint: 'Business API (simulated)', Icon: WhatsAppIcon },
    { name: 'Voice (Hinglish)', desc: 'Place Hinglish recovery calls via the voice agent.', connected: true, hint: 'On-device speech engine', Icon: ({ size }) => <span className="text-[#8B5CF6]"><IconMic size={size || 20} /></span> },
    { name: 'Webhooks', desc: 'Receive payment.failed & payment.captured events.', connected: true, hint: '/api events (simulated)', Icon: ({ size }) => <span className="text-warn"><IconPlug size={size || 20} /></span> },
    { name: 'Google Gemini', desc: 'AI diagnosis, action choice & recovery copy.', connected: keys.gemini, hint: 'GEMINI_API_KEY', Icon: GeminiIcon },
  ];

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[10px] bg-accent-soft text-accent grid place-items-center"><IconPlug size={18} /></span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">Integrations</h1>
          <p className="text-[13px] text-muted">Add keys in <span className="font-mono">server/.env</span> to switch any channel from simulated to live.</p>
        </div>
      </div>

      {/* Connections bar */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline2">
          <div className="text-[13px] font-semibold">Connections</div>
          <span className="text-2xs text-faint">{items.filter((i) => i.connected).length}/{items.length} connected</span>
        </div>
        <div className="divide-y divide-hairline2">
          {items.map((it) => (
            <div key={it.name} className="flex items-start gap-4 px-5 py-4">
              <span className="w-11 h-11 rounded-xl bg-surface border border-hairline grid place-items-center shrink-0">
                <it.Icon size={22} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="text-[14px] font-semibold">{it.name}</div>
                  {it.connected ? (
                    <span className="chip bg-good-soft text-good border-good/20"><IconCheck size={12} /> Connected</span>
                  ) : (
                    <span className="chip bg-surface text-muted border-hairline">Simulated</span>
                  )}
                </div>
                <p className="text-[13px] text-muted mt-1 leading-relaxed">{it.desc}</p>
                <div className="text-2xs text-faint font-mono mt-2">{it.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
