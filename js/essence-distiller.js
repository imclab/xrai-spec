// essence-distiller.js — peel any file/page down to its sparse XRAI essence.
// Constitution: § XRAI Philosophy "near infinite informational richness from sparse, elegant seeds."
// Spec: 029 Phase 6.22 (essence distiller).

import { askGemini, hasKey } from './gemini-web.js';

const CACHE_KEY = 'xrai.essence.cache.v1';

function getCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; } }
function setCache(c) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {} }

const PROMPT = (filename, content) => `
Distill the file below into its sparse conceptual essence as a tiny XRAI v1.0 document.

Rules:
- ≤ 6 entities, ≤ 8 relations.
- entity types from this closed list: object.primitive | object.glb | object.hologram | object.light | object.emitter | object.wire-source
- relation types: parent-of | wire-binds | reacts-to-audio | tracks
- Each entity needs a one-line metadata.role explaining what concept it captures.
- Return ONLY valid JSON, no commentary, no markdown fences.

File: ${filename}

Content (truncated to 6KB):
${content.slice(0, 6000)}
`.trim();

export async function distill(filename, fetcher) {
  const cache = getCache();
  if (cache[filename]) return { ok: true, essence: cache[filename], cached: true };
  if (!hasKey()) return { ok: false, error: 'no_key', message: 'Set localStorage.gemini_key to enable essence distillation.' };
  let content;
  try {
    content = await (fetcher ? fetcher() : fetch(filename).then(r => r.ok ? r.text() : Promise.reject(new Error(r.statusText))));
  } catch (e) { return { ok: false, error: 'fetch_failed', message: e.message }; }

  const result = await askGemini(PROMPT(filename, content), { frame: { source: 'essence-distiller' } });
  if (!result.ok) return result;
  // Try to parse the returned JSON (Gemini sometimes wraps in fences)
  let json = result.text.trim();
  json = json.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  let essence;
  try { essence = JSON.parse(json); } catch (e) { return { ok: false, error: 'parse_failed', message: e.message, raw: result.text }; }
  cache[filename] = essence;
  setCache(cache);
  return { ok: true, essence, cached: false };
}

export function renderInto(targetEl, essence) {
  const ents = essence?.scene?.entities || [];
  const rels = essence?.scene?.relations || [];
  const html = `
    <div style="font-size:10px;opacity:.55;margin-bottom:4px;">${ents.length} entities · ${rels.length} relations · v${essence?.xrai_version || '?'}</div>
    <div style="margin-bottom:6px;">
      ${ents.map(e => `<div style="padding:3px 6px;margin:2px 0;background:rgba(0,0,0,0.3);border-left:2px solid #F7FFA8;border-radius:3px;font-size:11px;">
        <div style="color:#F7FFA8;"><b>${escapeHtml(e.id)}</b> <span style="opacity:.55;font-size:10px;">${escapeHtml(e.type || '')}</span></div>
        <div style="opacity:.78;font-size:10px;">${escapeHtml(e.metadata?.role || '')}</div>
      </div>`).join('')}
    </div>
    <div style="font-size:10px;opacity:.55;border-top:1px dashed rgba(247,255,168,0.18);padding-top:4px;">relations:</div>
    ${rels.map(r => `<div style="font-size:10px;padding:1px 0;"><span style="color:#F7FFA8;">${escapeHtml(r.from)}</span> <span style="opacity:.55;">─${escapeHtml(r.type)}─▸</span> <span style="color:#F7FFA8;">${escapeHtml(r.to)}</span></div>`).join('')}
  `;
  targetEl.innerHTML = html;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export const __essence = { distill, getCache };
