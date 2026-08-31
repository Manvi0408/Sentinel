import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { inr, ACTION_LABEL, fmtTime, confPct } from '../lib/format.js';
import { StatusBadge, ClassTag } from './ui.jsx';
import { IconClose, IconCheck, IconStop, IconBolt } from './Icons.jsx';

// Step visual mapping for the vertical timeline.
function stepMeta(e) {
  if (e.step === 'ingest') return { dot: 'bg-faint', label: 'Failed · ingested' };
  if (e.step === 'diagnose') return { dot: 'bg-accent', label: 'Diagnosed' };
  if (e.step === 'decide') return { dot: 'bg-accent', label: 'Intervention chosen' };
  if (e.step === 'stopping_check') {
    if (e.outcome === 'stopped') return { dot: 'bg-stop', label: 'Stopping rule · STOP' };
    if (e.outcome === 'skipped') return { dot: 'bg-warn', label: 'Stopping rule · cooldown' };
    return { dot: 'bg-good', label: 'Stopping rules passed' };
  }
  if (e.step === 'execute') return { dot: 'bg-ink', label: 'Executed' };
  if (e.step === 'outcome')
    return e.outcome === 'success'
      ? { dot: 'bg-good', label: 'Outcome · recovered' }
      : { dot: 'bg-faint', label: 'Outcome' };
  return { dot: 'bg-faint', label: e.step };
}

export default function Drawer({ id, onClose }) {
  const [data, setData] = useState(null);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    if (!id) return;
    setData(null);
    setLang('en');
    api.payment(id).then(setData).catch(() => {});
  }, [id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!id) return null;
  const p = data?.payment;
  const events = data?.events || [];
  const msg = p ? (lang === 'en' ? p.recoveryMessage : p.recoveryMessageHinglish) : '';

  return (
    <>
      <div className="fixed inset-0 bg-ink/20 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 w-[520px] max-w-full bg-canvas border-l border-hairline shadow-drawer z-50 flex flex-col">
        {/* header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-hairline shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[10px] bg-accent-soft text-accent grid place-items-center">
              <IconBolt size={16} />
            </span>
            <div>
              <div className="text-[14px] font-semibold leading-tight">Recovery detail</div>
              <div className="text-2xs text-faint font-mono">{id}</div>
            </div>
          </div>
          <button className="btn h-8 w-8 px-0 justify-center" onClick={onClose}>
            <IconClose size={16} />
          </button>
        </div>

        {!p ? (
          <div className="p-6 text-[13px] text-faint">Loading…</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* summary */}
            <div className="p-5 border-b border-hairline2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[28px] font-semibold tracking-tight2 tabular-nums">{inr(p.amountRs)}</div>
                  <div className="text-[13px] text-muted mt-0.5">
                    {p.customerName} · <span className="text-faint">{p.customerEmail}</span>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <Field label="Failure reason" value={p.failureLabel} />
                <Field label="Diagnosis" value={<ClassTag cls={p.diagnosisClass} />} />
                <Field label="Confidence" value={confPct(p.confidence)} />
                <Field
                  label="Chosen action"
                  value={ACTION_LABEL[p.chosenAction] || '—'}
                />
                <Field label="Retries used" value={`${p.retriesUsed}`} />
                <Field label="Messages sent" value={`${p.messagesSent}`} />
              </div>
              {p.stopReason && (
                <div className="mt-3 rounded-[10px] border border-stop/20 bg-stop-soft px-3 py-2 text-2xs text-stop flex items-center gap-2">
                  <IconStop size={14} /> Stopped: {p.stopReason}
                </div>
              )}
            </div>

            {/* agent's why */}
            {p.diagnosisWhy && (
              <div className="p-5 border-b border-hairline2">
                <SectionLabel>Why the agent decided this</SectionLabel>
                <p className="text-[13px] text-ink leading-relaxed mt-1.5">{p.diagnosisWhy}</p>
                <div className="mt-2 text-2xs text-faint">
                  Diagnosed by {p.diagnosisSource === 'gemini' ? 'Google Gemini' : 'deterministic rules engine'}
                </div>
              </div>
            )}

            {/* generated recovery message */}
            {msg && (
              <div className="p-5 border-b border-hairline2">
                <div className="flex items-center justify-between">
                  <SectionLabel>Recovery message</SectionLabel>
                  <div className="flex items-center gap-1 rounded-[9px] border border-hairline p-0.5 bg-surface">
                    <LangBtn active={lang === 'en'} onClick={() => setLang('en')}>English</LangBtn>
                    <LangBtn active={lang === 'hi'} onClick={() => setLang('hi')}>Hinglish</LangBtn>
                  </div>
                </div>
                <div className="mt-2 rounded-[12px] border border-hairline bg-surface p-3.5 text-[13px] leading-relaxed text-ink">
                  {msg}
                </div>
                {p.paymentLinkUrl && (
                  <div className="mt-2 text-2xs text-muted">
                    Payment link: <span className="font-mono text-accent-ink">{p.paymentLinkUrl}</span>
                  </div>
                )}
              </div>
            )}

            {/* timeline */}
            <div className="p-5">
              <SectionLabel>Recovery timeline</SectionLabel>
              <ol className="mt-3 relative">
                <span className="absolute left-[7px] top-1 bottom-1 w-px bg-hairline" />
                {events.map((e) => {
                  const meta = stepMeta(e);
                  return (
                    <li key={e.id} className="relative pl-6 pb-4 last:pb-0">
                      <span className={`absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 border-white ${meta.dot} grid place-items-center`}>
                        {e.outcome === 'success' && <IconCheck size={9} className="text-white" />}
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-ink">{meta.label}</span>
                        <span className="text-2xs text-faint tabular-nums shrink-0">{fmtTime(e.ts)}</span>
                      </div>
                      <p className="text-2xs text-muted mt-0.5 leading-relaxed">{e.decision}</p>
                      {e.wave > 0 && (
                        <span className="inline-block mt-1 text-[10px] text-faint">wave {e.wave}</span>
                      )}
                    </li>
                  );
                })}
                {events.length === 0 && (
                  <li className="text-[13px] text-faint pl-6">No events yet — run the recovery batch.</li>
                )}
              </ol>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-[10px] border border-hairline bg-canvas px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
      <div className="text-[13px] text-ink mt-0.5">{value}</div>
    </div>
  );
}
function SectionLabel({ children }) {
  return <div className="text-2xs font-semibold uppercase tracking-wide text-faint">{children}</div>;
}
function LangBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`h-6 px-2 rounded-[7px] text-2xs font-medium transition ${
        active ? 'bg-canvas text-ink shadow-card' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
