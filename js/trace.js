// trace.js — runtime trace recorder for x-ray-vision view of the agent flow.
// Constitution: § Sight Triad → x-ray vision · Wonder + Expressive Freedom.
// Spec: 029 tasks.md Phase 6.22 (under-the-hood module browser).
//
// Every module dispatches `trace:event` on document with:
//   { layer, step, t, payload, source }
// Inspector's TRACE tab renders the last N events as a flowing sequence.

const MAX_EVENTS = 200;

class TraceRecorder {
  constructor() {
    this.events = [];
    this.listeners = new Set();
    document.addEventListener('trace:event', (e) => this._record(e.detail));
  }
  _record(d) {
    if (!d) return;
    const evt = { ...d, t: d.t || new Date().toISOString() };
    this.events.push(evt);
    if (this.events.length > MAX_EVENTS) this.events.shift();
    this.listeners.forEach(fn => { try { fn(evt); } catch {} });
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  recent(n = 60) { return this.events.slice(-n); }
  clear() { this.events.length = 0; this.listeners.forEach(fn => { try { fn(null); } catch {} }); }
}

// Convenience: any module can call window.__trace.fire(layer, step, payload)
export function fire(layer, step, payload, source) {
  document.dispatchEvent(new CustomEvent('trace:event', {
    detail: { layer, step, payload, source, t: new Date().toISOString() },
  }));
}

// ─── Optional cross-surface federation (Phase 6.32) ─────────────────────────
// Connect to jarvis-bus and mirror events both ways. Anonymous + LAN-only by
// default; auth comes after Phase 6.36 ships Firebase Google login.
//
// Usage: window.__trace.wsRelay('ws://localhost:8766')
//        window.__trace.wsRelay('ws://localhost:8766', { channel: 'trace', id: 'web-jarvis' })
async function wsRelay(url, opts = {}) {
  const channel = opts.channel || 'trace';
  const id = opts.id || ('web-' + Math.random().toString(36).slice(2, 8));
  // Phase 6.38: attach Firebase ID token if user signed in (via auth-web.js)
  let token = opts.token || null;
  if (!token && window.__auth?.getIdToken) {
    try { token = await window.__auth.getIdToken(); } catch {}
  }
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  const ws = new WebSocket(`${url}?channel=${encodeURIComponent(channel)}&id=${encodeURIComponent(id)}${tokenParam}`);
  ws.addEventListener('open',  () => window.__trace?._record({ layer: 'bus', step: 'connected', payload: { url, id, channel }, source: 'trace.js wsRelay' }));
  ws.addEventListener('error', () => window.__trace?._record({ layer: 'bus', step: 'error',     payload: { url }, source: 'trace.js wsRelay' }));
  ws.addEventListener('close', () => window.__trace?._record({ layer: 'bus', step: 'closed',    payload: { url }, source: 'trace.js wsRelay' }));
  ws.addEventListener('message', (e) => {
    try { const wrap = JSON.parse(e.data); if (wrap.from === id) return; window.__trace?._record({ ...wrap.msg, _peer: wrap.from }); } catch {}
  });
  // Forward local events to the bus (skip ones already from peers to avoid loops)
  window.__trace?.on(evt => { if (!evt || evt._peer) return; if (ws.readyState === 1) ws.send(JSON.stringify(evt)); });
  return ws;
}

if (typeof window !== 'undefined') {
  window.__trace = new TraceRecorder();
  window.__trace.fire = fire;
  window.__trace.wsRelay = wsRelay;
  // Auto-connect when ?bus=ws://… is in URL
  const busUrl = new URLSearchParams(location.search).get('bus');
  if (busUrl) try { wsRelay(busUrl); } catch (e) { console.warn('[trace] auto wsRelay failed:', e); }
}
export const __trace = typeof window !== 'undefined' ? window.__trace : null;
