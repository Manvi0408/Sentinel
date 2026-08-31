// Stopping rules — enforced when the tier is chosen AND re-checked immediately
// before anything fires. Every refusal names the exact rule so declining to act
// is as auditable as acting.
//
// A tier is either "auto_retry" (SILENT — never reaches the customer) or a
// CONTACT tier ("whatsapp" / "voice"). Only contact attempts count toward the cap.

const CONTACT_TIERS = new Set(['whatsapp', 'voice']);
export const isContactTier = (tier) => CONTACT_TIERS.has(tier);

// Statuses that mean the payment has LEFT the recovery funnel (nothing to do).
const LEFT_FUNNEL = new Set(['recovered', 'stopped']);

// Returns:
//   { allowed, rule, terminal, downgradeTo }
//   rule        — machine name of the rule that fired (for intervention_skipped)
//   terminal    — stop touching this payment for good
//   downgradeTo — set when a rule downgrades the tier (voice → whatsapp)
export function checkStoppingRules(payment, tier, rules, nowHour) {
  // Rule: already paid — never contact someone who has settled. Status is
  // re-read at execution time, not trusted from the decision.
  if (rules.neverContactPaid && payment.status === 'recovered') {
    return { allowed: false, rule: 'already_paid', terminal: true };
  }

  // Rule: no longer failed — anything that left the funnel is dropped.
  if (rules.dropIfNoLongerFailed && payment.status === 'stopped') {
    return { allowed: false, rule: 'no_longer_failed', terminal: true };
  }

  // Rule: fraud-flagged — no automated contact at all.
  if (rules.neverContactFraud && payment.fraudFlagged) {
    return { allowed: false, rule: 'fraud_flagged', terminal: true };
  }

  const contact = isContactTier(tier);

  // Rule: max 3 contact attempts — hard cap per payment. Silent auto-retries
  // never reach the customer, so they do not count here.
  if (contact && payment.contactAttempts >= rules.maxContactAttempts) {
    return { allowed: false, rule: 'max_contact_attempts', terminal: true };
  }

  // Silent auto-retries have their own (separate) cap.
  if (!contact && payment.retriesUsed >= rules.maxAutoRetries) {
    return { allowed: false, rule: 'max_auto_retries', terminal: true };
  }

  // Rule: 9am–9pm calling window (TRAI-aligned). Outside it the voice tier is
  // downgraded to WhatsApp when deciding, and deferred when executing.
  if (tier === 'voice') {
    const inWindow = nowHour >= rules.callWindowStart && nowHour < rules.callWindowEnd;
    if (!inWindow) return { allowed: true, rule: 'calling_window', downgradeTo: 'whatsapp' };
  }

  return { allowed: true, rule: 'passed' };
}
