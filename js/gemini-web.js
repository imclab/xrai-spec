// gemini-web.js
// ─────────────────────────────────────────────────────────────────────────────
// Direct browser → Gemini API call. Used by jarvis-web.js answer pipeline.
// System prompt grounded in: codon.perceptual_frame + KB index + XRAI doc 11.
//
// Key source: localStorage.gemini_key  (paste in DevTools to enable)
// Model: gemini-2.5-flash (text mode for v1; switch to native-audio later)
//
// PROTOTYPE NOTE: shipping the key in browser network requests is NOT safe for
// production. Acceptable for localhost prototype. Production path = thin proxy
// behind /api/gemini that holds the key server-side. Tracked: spec 029 Phase 6.23.
// ─────────────────────────────────────────────────────────────────────────────

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const KEY_NAME = 'gemini_key';

let dnaCache = null;
let kbIndexCache = null;
let soulCache = null;

async function loadSoul() {
  if (soulCache !== null) return soulCache;
  try {
    const res = await fetch('jarvis/SOUL.md');
    soulCache = res.ok ? (await res.text()).slice(0, 3500) : '';
  } catch { soulCache = ''; }
  return soulCache;
}

async function loadDna() {
  if (dnaCache) return dnaCache;
  try {
    const res = await fetch('examples/11-jarvis-system-dna.xrai.json');
    if (!res.ok) return null;
    const doc = await res.json();
    // Distill to a compact context — labels + roles only
    const ents = (doc.scene?.entities || []).map(e => ({
      id: e.id, type: e.type, role: e.metadata?.role, decodes_to: e.metadata?.decodes_to?.slice(0, 120),
    }));
    dnaCache = {
      title: doc.metadata?.title,
      thesis: doc.metadata?.thesis,
      entities: ents,
      relation_count: (doc.scene?.relations || []).length,
    };
  } catch { dnaCache = null; }
  return dnaCache;
}

async function loadKb() {
  if (kbIndexCache) return kbIndexCache;
  try {
    const res = await fetch('data/kb-index.json');
    if (!res.ok) return null;
    kbIndexCache = await res.json();
  } catch { kbIndexCache = null; }
  return kbIndexCache;
}

function searchKb(query, kb, max = 5) {
  if (!kb?.entries) return [];
  const q = query.toLowerCase();
  const tokens = q.match(/[a-z][a-z-]{3,}/g) || [];
  if (!tokens.length) return [];
  return kb.entries
    .map(e => {
      let score = 0;
      const fname = e.file.toLowerCase();
      const sum = (e.summary || '').toLowerCase();
      tokens.forEach(t => { if (fname.includes(t)) score += 5; if (sum.includes(t)) score += 1; });
      return { e, score };
    })
    .filter(x => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(x => x.e);
}

export function hasKey() {
  try { return !!localStorage.getItem(KEY_NAME); } catch { return false; }
}

export async function askGemini(question, { frame } = {}) {
  const key = localStorage.getItem(KEY_NAME);
  if (!key) {
    return {
      ok: false,
      error: 'no_key',
      message: 'Set localStorage.gemini_key = "YOUR_KEY" in DevTools to enable the smart answer pipeline.',
    };
  }
  const [dna, kb, soul] = await Promise.all([loadDna(), loadKb(), loadSoul()]);
  const kbHits = kb ? searchKb(question, kb, 5) : [];
  const sys = [
    soul || 'You are jARvis. Empower the user above all else. Concise, grounded, honest.',
    '',
    '=== OPERATING RULES ===',
    'Answer concisely (≤2 sentences). Always ground answers in (a) screen_focus, (b) XRAI DNA, (c) KB entries.',
    'NEVER say "I don\'t have X in my index" — if unknown, say so plainly + offer to look it up + suggest a related entity from screen_focus or DNA.',
    '',
    `=== CURRENT PERCEPTUAL FRAME ===`,
    JSON.stringify(frame || { unavailable: 'frame_keeper not yet wired' }, null, 2),
    '',
    `=== XRAI SYSTEM DNA (doc 11 — what jARvis IS, architecturally) ===`,
    dna ? JSON.stringify(dna, null, 2).slice(0, 4500) : '(unavailable — doc fetch failed)',
    '',
    `=== KB ENTRIES MATCHING THIS QUESTION (top ${kbHits.length}) ===`,
    kbHits.length
      ? kbHits.map(h => `- ${h.file} (${h.tag}): ${h.summary}`).join('\n')
      : '(no KB matches; answer from DNA + perceptual frame)',
  ].join('\n');

  const body = {
    systemInstruction: { parts: [{ text: sys }] },
    contents: [{ role: 'user', parts: [{ text: question }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 220 },
  };

  try {
    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: 'api_error', status: res.status, message: json?.error?.message || res.statusText };
    }
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return { ok: false, error: 'empty_response', message: 'Gemini returned empty content.' };
    return { ok: true, text, kbHits: kbHits.map(h => h.file) };
  } catch (e) {
    return { ok: false, error: 'network', message: e?.message || String(e) };
  }
}

export const __gemini = { loadDna, loadKb, searchKb, hasKey };
