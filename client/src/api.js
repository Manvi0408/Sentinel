// Tiny fetch wrapper for the Sentinel API.
const j = async (r) => {
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json();
};

export const api = {
  health: () => fetch('/api/health').then(j),
  metrics: () => fetch('/api/metrics').then(j),
  payments: () => fetch('/api/payments').then(j),
  payment: (id) => fetch(`/api/payments/${id}`).then(j),
  audit: () => fetch('/api/audit').then(j),
  rules: () => fetch('/api/rules').then(j),
  settings: () => fetch('/api/settings').then(j),

  simulateEvent: (body) =>
    fetch('/api/simulate/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then(j),

  degradation: () => fetch('/api/degradation').then(j),
  promises: () => fetch('/api/promises').then(j),
  seedPromises: () => fetch('/api/promises/demo', { method: 'POST' }).then(j),
  simulate: (overrides) =>
    fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrides || {}),
    }).then(j),

  tools: () => fetch('/api/tools').then(j),
  checkLink: (id) => fetch(`/api/payments/${id}/checklink`, { method: 'POST' }).then(j),
  callTool: (name, args) =>
    fetch(`/api/tools/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {}),
    }).then(j),

  seed: (count = 60) =>
    fetch('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    }).then(j),
  run: () => fetch('/api/run', { method: 'POST' }).then(j),
  saveRules: (body) =>
    fetch('/api/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(j),
  resetRules: () => fetch('/api/rules/reset', { method: 'POST' }).then(j),
  saveModel: (body) =>
    fetch('/api/settings/model', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(j),
  resetModel: () => fetch('/api/settings/model/reset', { method: 'POST' }).then(j),
};
