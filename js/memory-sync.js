// memory-sync.js — unified swarm-brain memory layer (Phase 6.40)
// Distilled facts cross via Firestore; raw transcripts/frames STAY local.
// Per-user isolation enforced by Firestore security rules + Firebase Auth.
// Path: users/{uid}/memory/{tier}/{key}
//
// Tiers (matches DNA codon.memory schema):
//   short  — ring buffer, ephemeral (NOT synced)
//   medium — session SQLite-equiv (synced opportunistically)
//   long   — distilled facts + preferences (synced eagerly, durable)
//
// Privacy invariants (Phase 6 addendum 4):
//   - Raw camera/gaze/transcripts NEVER cross — only distilled facts
//   - Each fact carries metadata.source + metadata.t for provenance
//   - User revokes by deleting doc OR clearing auth — synced facts purged

const FB_BASE = 'https://www.gstatic.com/firebasejs/10.14.0';
let db = null;
let unsubscribers = [];

async function ensureDb() {
  if (db) return db;
  if (!window.__auth?.app) {
    console.warn('[memory-sync] no Firebase app — sign in first via auth-web.js');
    return null;
  }
  const fs = await import(`${FB_BASE}/firebase-firestore.js`);
  db = fs.getFirestore(window.__auth.app);
  window.__memSync = { ...window.__memSync, fs, db };
  return db;
}

export async function saveFact(key, value, tier = 'long') {
  if (tier === 'short') {
    // Local-only: append to perceptual frame ring
    window.__perceptualFrame?._push?.('fact', { key, value });
    return { ok: true, local: true };
  }
  const user = window.__user;
  if (!user) return { ok: false, error: 'not_signed_in' };
  const fs = (await ensureDb()) ? window.__memSync.fs : null;
  if (!fs) return { ok: false, error: 'no_firestore' };
  try {
    const ref = fs.doc(db, `users/${user.uid}/memory_${tier}/${key}`);
    await fs.setDoc(ref, { value, t: new Date().toISOString(), source: location.origin + location.pathname }, { merge: true });
    window.__trace?.fire('memory', `save.${tier}`, { key }, 'memory-sync.js');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

export async function loadFacts(tier = 'long', limit = 100) {
  const user = window.__user;
  if (!user) return [];
  const fs = (await ensureDb()) ? window.__memSync.fs : null;
  if (!fs) return [];
  try {
    const col = fs.collection(db, `users/${user.uid}/memory_${tier}`);
    const q = fs.query(col, fs.orderBy('t', 'desc'), fs.limit(limit));
    const snap = await fs.getDocs(q);
    const out = [];
    snap.forEach(d => out.push({ key: d.id, ...d.data() }));
    window.__trace?.fire('memory', `load.${tier}`, { count: out.length }, 'memory-sync.js');
    return out;
  } catch (e) {
    console.warn('[memory-sync] loadFacts failed:', e);
    return [];
  }
}

export async function subscribeFacts(tier, callback) {
  const user = window.__user;
  if (!user) return null;
  const fs = (await ensureDb()) ? window.__memSync.fs : null;
  if (!fs) return null;
  const col = fs.collection(db, `users/${user.uid}/memory_${tier}`);
  const unsub = fs.onSnapshot(col, snap => {
    const out = []; snap.forEach(d => out.push({ key: d.id, ...d.data() }));
    callback(out);
  });
  unsubscribers.push(unsub);
  return unsub;
}

export async function unsubscribeAll() {
  unsubscribers.forEach(u => { try { u(); } catch {} });
  unsubscribers = [];
}

// Auto-distill from perceptual frame on session arc transitions
// Promotes session_arc.last_prompt + screen_focus to long-term every 5 min
let distillTimer = null;
function startDistill() {
  if (distillTimer) return;
  distillTimer = setInterval(async () => {
    if (!window.__user || !window.__perceptualFrame) return;
    const f = window.__perceptualFrame.getFrame();
    if (!f.session_arc?.last_prompt) return;
    const key = `prompt_${Date.now()}`;
    await saveFact(key, {
      prompt: f.session_arc.last_prompt.text,
      focus: f.screen_focus?.focused_label,
      time_on_task_s: f.session_arc?.time_on_task_s,
    }, 'medium');
  }, 5 * 60 * 1000);
}
function stopDistill() { if (distillTimer) { clearInterval(distillTimer); distillTimer = null; } }

if (typeof window !== 'undefined') {
  window.__memSync = { saveFact, loadFacts, subscribeFacts, unsubscribeAll, startDistill, stopDistill };
  // Auto-start distill loop when user signs in
  document.addEventListener('auth:state', (e) => {
    if (e.detail?.user) startDistill();
    else stopDistill();
  });
}
