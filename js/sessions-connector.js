// sessions-connector.js — search past CC sessions as a memory tier (Phase 6.39)
// Reads bundled sessions-snapshot.json. Read-only; never writes.
let cache = null;

async function load() {
  if (cache) return cache;
  try { cache = await (await fetch('data/sessions-snapshot.json')).json(); } catch { cache = { sessions: [], total_prompts: 0 }; }
  return cache;
}

export async function search(query, max = 10) {
  const s = await load();
  const q = query.toLowerCase();
  const hits = [];
  for (const sess of s.sessions || []) {
    for (const p of sess.prompts || []) {
      if (p.t.toLowerCase().includes(q)) hits.push({ session: sess.sessionId, ts: p.ts, t: p.t });
      if (hits.length >= max * 3) break;
    }
    if (hits.length >= max * 3) break;
  }
  hits.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  window.__trace?.fire('connector', 'sessions.search', { q: query, hits: hits.length }, 'sessions-connector.js');
  return hits.slice(0, max);
}

export async function recent(hours = 24, max = 30) {
  const s = await load();
  const cutoff = Date.now() - hours * 3600 * 1000;
  const out = [];
  for (const sess of s.sessions || []) {
    for (const p of sess.prompts || []) {
      if (p.ts && new Date(p.ts).getTime() > cutoff) out.push({ session: sess.sessionId, ts: p.ts, t: p.t });
    }
  }
  out.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  return out.slice(0, max);
}

if (typeof window !== 'undefined') window.__sessions = { search, recent, load };
