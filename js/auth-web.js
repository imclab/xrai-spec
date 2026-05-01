// auth-web.js — Firebase Web SDK Google sign-in for xra1.com (Phase 6.36)
// Reuses the same Firebase project as Portals iOS app (src/config/firebase.ts +
// src/services/auth.ts). User identity unlocks per-user channels on the
// jarvis-bus (6.32 → 6.38), Gmail/Drive consent prompts (6.37), and the
// unified swarm-brain memory layer (6.40).
//
// Config source (in priority order):
//   1. window.__FIREBASE_CONFIG (inline <script> on the page — preferred for prod)
//   2. localStorage.firebase_config (JSON string — DevTools-paste for prototype)
//   3. ?fb-config=<base64-json> URL param (one-shot share — never persisted)
//
// Scope: minimum (email + profile). Drive/Gmail/Calendar are added later as
// SEPARATE consent prompts per Phase 6 addendum 4 invariant #3.
//
// PROTOTYPE NOTE: pasting Firebase config in browser exposes apiKey but Firebase
// apiKey is intentionally public (it's a project identifier, not a secret).
// Per-user data isolation is enforced by Firestore security rules + Firebase
// Auth — NOT by hiding apiKey. Production path = same flow.
// ─────────────────────────────────────────────────────────────────────────────

const SDK_BASE = 'https://www.gstatic.com/firebasejs/10.14.0';
let app, auth, googleProvider;

function loadConfig() {
  if (typeof window !== 'undefined' && window.__FIREBASE_CONFIG) return window.__FIREBASE_CONFIG;
  try {
    const ls = localStorage.getItem('firebase_config');
    if (ls) return JSON.parse(ls);
  } catch {}
  try {
    const u = new URLSearchParams(location.search).get('fb-config');
    if (u) return JSON.parse(atob(u));
  } catch {}
  return null;
}

async function loadSdk() {
  // ESM imports from gstatic Firebase CDN
  const [{ initializeApp }, { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }] = await Promise.all([
    import(`${SDK_BASE}/firebase-app.js`),
    import(`${SDK_BASE}/firebase-auth.js`),
  ]);
  return { initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged };
}

export async function init() {
  const cfg = loadConfig();
  if (!cfg) {
    console.warn('[auth-web] no Firebase config — set localStorage.firebase_config = JSON.stringify({...}) or window.__FIREBASE_CONFIG');
    return null;
  }
  const sdk = await loadSdk();
  app = sdk.initializeApp(cfg);
  auth = sdk.getAuth(app);
  googleProvider = new sdk.GoogleAuthProvider();
  // Minimum scope: email + profile. Drive/Gmail come as SEPARATE addScope calls in 6.37.
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  // Surface user state on window + dispatch event for any listeners
  sdk.onAuthStateChanged(auth, (user) => {
    window.__user = user ? {
      uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL,
      idToken: null, // populated on demand below
    } : null;
    window.__trace?.fire('auth', user ? 'signed_in' : 'signed_out', { uid: user?.uid }, 'auth-web.js');
    document.dispatchEvent(new CustomEvent('auth:state', { detail: { user: window.__user } }));
  });
  window.__auth = { app, auth, sdk, googleProvider, signIn, signOut: () => sdk.signOut(auth), getIdToken };
  return window.__auth;
}

export async function signIn() {
  if (!auth) await init();
  if (!auth) throw new Error('Firebase config missing');
  const sdk = window.__auth.sdk;
  const result = await sdk.signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function getIdToken(forceRefresh = false) {
  return auth?.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null;
}

// ─── Per-scope OAuth (Phase 6.37) — separate consent prompts per Apple-style invariant ───
// Each scope is requested in isolation. Result OAuth access_token is cached
// in sessionStorage (revoked on tab close). Drive/Gmail/Calendar each call
// requestScope(...) before their first API call.
export async function requestScope(scopes) {
  if (!auth) await init();
  if (!auth) throw new Error('Firebase config missing');
  const sdk = window.__auth.sdk;
  const provider = new sdk.GoogleAuthProvider();
  for (const s of scopes) provider.addScope(s);
  provider.setCustomParameters({ prompt: 'consent', include_granted_scopes: 'true' });
  const result = await sdk.signInWithPopup(auth, provider);
  const credential = sdk.GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;
  if (!accessToken) throw new Error('no access_token returned — check Firebase OAuth client config');
  try { sessionStorage.setItem('google_access_token', accessToken); sessionStorage.setItem('google_scopes', scopes.join(' ')); } catch {}
  window.__trace?.fire('auth', 'scope_granted', { scopes }, 'auth-web.js requestScope');
  return accessToken;
}
export function getAccessToken() { try { return sessionStorage.getItem('google_access_token'); } catch { return null; } }

if (typeof window !== 'undefined') {
  // Auto-init when config is present
  init().catch((e) => console.warn('[auth-web] init failed:', e));
}
