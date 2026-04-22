// xrai-core.js
// ─────────────────────────────────────────────────────────────────────────────
// Portable XRAI v1.0 core — no DOM, no bundler. Runs in:
//   • Browser (this site, PlayCanvas/Needle/Icosa web viewers)
//   • Node / Bun / Deno (MCP server, adapters build step)
//   • React Native / Hermes (Portals iOS app via `src/services/xrai-web-bridge.ts`)
//   • Unity (via UnityJS or bridged JSON — shape is identical)
//
// Responsibilities (tight):
//   1. XRAI v1.0 document shape (scene: anchors, entities, relations, events)
//   2. Adapter registry: `encode(source, input)` → XRAI doc
//   3. Graph-view projection: `toGraphView(doc)` for any node-link renderer
//   4. Validation gate (minimum — `xrai_version` + `scene`)
//
// What this module does NOT do — kept deliberately out of scope:
//   • Rendering (runtimes/* do that)
//   • Physics / simulation (runtime-specific)
//   • Networking (live-web.js / Portals LiveKitService.ts)
//
// Why single-file: every surface we target can `import` this one file via URL,
// filesystem, or RN bundle. No dependencies. No transpile step.
// ─────────────────────────────────────────────────────────────────────────────

export const XRAI_VERSION = '1.0';

/* ─── UUID (RFC 4122 v4) — works in browser, node, RN ───────────────────── */
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* ─── Document constructors ─────────────────────────────────────────────── */
export function newScene({ author = 'xrai.dev', origin = 'web', id = uuid() } = {}) {
  return {
    xrai_version: XRAI_VERSION,
    id,
    created_at: new Date().toISOString(),
    author: { type: 'human', id: author },
    origin: { app: origin, version: '1.0', scene: 'generic' },
    scene: { anchors: [], entities: [], relations: [], events: [] },
    metadata: {},
  };
}

export function entity(id, type, props = {}) {
  const { label, glyph, group, cluster, url, inlineMd, transform, params, ...rest } = props;
  return {
    id, type,
    ...(transform ? { transform } : {}),
    ...(params ? { params } : {}),
    ...(label ? { label } : {}),
    ...(glyph ? { glyph } : {}),
    ...(group ? { group } : {}),
    ...(cluster ? { cluster } : {}),
    ...(url ? { url } : {}),
    ...(inlineMd ? { inlineMd } : {}),
    ...rest,
  };
}

export function relation(from, to, type = 'links-to', props = {}) {
  return { id: `r_${from}__${to}_${type}`, type, from, to, ...props };
}

export function event(type, entityId, props = {}) {
  return {
    id: `e_${uuid().slice(0, 8)}`,
    t: props.t || new Date().toISOString(),
    type,
    entity: entityId,
    ...props,
  };
}

/* ─── Validation (minimum — tight by design) ───────────────────────────── */
export function validate(doc) {
  const errors = [];
  if (!doc || typeof doc !== 'object') errors.push('not an object');
  else {
    if (!doc.xrai_version) errors.push('missing xrai_version');
    if (!doc.scene) errors.push('missing scene');
    else {
      for (const key of ['anchors', 'entities', 'relations', 'events']) {
        if (doc.scene[key] && !Array.isArray(doc.scene[key])) {
          errors.push(`scene.${key} must be an array`);
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

/* ─── Adapter registry ─────────────────────────────────────────────────── */
const ADAPTERS = new Map();

export function registerAdapter(name, adapter) {
  if (typeof adapter !== 'function') throw new Error('adapter must be a function');
  ADAPTERS.set(name, adapter);
}
export function listAdapters() { return [...ADAPTERS.keys()]; }
export function getAdapter(name) { return ADAPTERS.get(name); }

export async function encode(name, input, opts = {}) {
  const fn = ADAPTERS.get(name);
  if (!fn) throw new Error(`adapter "${name}" not registered — have [${listAdapters().join(', ')}]`);
  const doc = await fn(input, opts);
  const v = validate(doc);
  if (!v.valid) throw new Error(`adapter "${name}" produced invalid XRAI: ${v.errors.join(', ')}`);
  return doc;
}

/* ─── Graph projection — renderer-agnostic {nodes, links} ──────────────── */
// Any renderer (3d-force-graph, ECharts, PlayCanvas, Unity-XRAI) can read this.
// Maps XRAI entities → nodes, relations → links; preserves semantics via `type`.
export function toGraphView(doc, { glyphFallback = '⬢', colorFor = null } = {}) {
  const ents = doc?.scene?.entities || [];
  const rels = doc?.scene?.relations || [];
  const nodes = ents.map(e => ({
    id: e.id,
    label: e.label || e.title || e.id,
    group: e.group || _groupFromType(e.type),
    glyph: e.glyph || _glyphFromType(e.type, glyphFallback),
    type: e.type,
    file: e.url || e.file || null,
    inlineMd: e.inlineMd || null,
    size: e.size || 7,
    cluster: e.cluster,
    ...(colorFor ? { color: colorFor(e.group || _groupFromType(e.type)) } : {}),
    // Preserve original entity for round-trip save
    _xrai: e,
  }));
  const links = rels.map(r => ({
    source: r.from || (r.participants && r.participants[0]),
    target: r.to   || (r.participants && r.participants[1]),
    type: r.type,
    _xrai: r,
  })).filter(l => l.source && l.target);
  return { nodes, links };
}

function _glyphFromType(type, fallback) {
  if (!type) return fallback;
  if (type.startsWith('object.') || type === 'person') return '●';
  if (type === 'place') return '⬡';
  if (type === 'concept') return '◆';
  if (type === 'file' || type === 'doc') return '▦';
  if (type === 'rfc') return '◇';
  if (type === 'example') return '○';
  if (type === 'runtime') return '▲';
  if (type === 'video') return '▶';
  if (type === 'structure') return '▤';
  return fallback;
}

function _groupFromType(type) {
  if (!type) return 'xrai';
  if (type === 'person') return 'person';
  if (type === 'place') return 'place';
  if (type === 'concept') return 'concept';
  if (type === 'rfc') return 'rfc';
  if (type === 'runtime') return 'runtime';
  if (type === 'example') return 'demo';
  if (type === 'video') return 'video';
  if (type === 'structure') return 'structure';
  if (type === 'file' || type === 'doc') return 'doc';
  return 'xrai';
}

/* ─── Merge — used when live / feed / adapter adds nodes to existing scene ─ */
export function merge(docA, docB) {
  const out = newScene({ origin: 'merge' });
  const seen = new Set();
  for (const d of [docA, docB]) {
    for (const e of (d?.scene?.entities || [])) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.scene.entities.push(e);
    }
    for (const r of (d?.scene?.relations || [])) out.scene.relations.push(r);
    for (const ev of (d?.scene?.events || [])) out.scene.events.push(ev);
    for (const a of (d?.scene?.anchors || [])) out.scene.anchors.push(a);
  }
  return out;
}

/* ─── HTTP fetch wrapper — tolerates node / RN (uses globalThis.fetch) ── */
export async function httpGet(url, { headers = {}, timeout = 10000 } = {}) {
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers, signal: ctrl?.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const ct = res.headers?.get ? res.headers.get('content-type') || '' : '';
    return ct.includes('application/json') ? res.json() : res.text();
  } finally { if (timer) clearTimeout(timer); }
}

/* ─── CommonJS interop (for MCP server / legacy node) ─────────────────── */
/* istanbul ignore next */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    XRAI_VERSION, uuid, newScene, entity, relation, event,
    validate, registerAdapter, listAdapters, getAdapter,
    encode, toGraphView, merge, httpGet,
  };
}
