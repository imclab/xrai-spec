// google-connectors.js — Gmail / Calendar / Drive (Phase 6.37)
// Direct Google REST API calls using OAuth access_token from auth-web.js.
// Each connector is OFF by default; first call triggers separate consent.
//
// Privacy invariants (per Phase 6 addendum 4):
//   - Each scope = separate consent prompt
//   - Tokens stay in sessionStorage (cleared on tab close)
//   - Raw email bodies / event details / file contents are returned to caller
//     but NEVER auto-cross the bridge / bus / federation
//   - User revokes a scope by clearing sessionStorage OR via account.google.com

import { requestScope, getAccessToken } from './auth-web.js';

const SCOPES = {
  calendar: 'https://www.googleapis.com/auth/calendar.readonly',
  gmail:    'https://www.googleapis.com/auth/gmail.readonly',
  drive:    'https://www.googleapis.com/auth/drive.readonly',
};

async function ensureScope(name) {
  const granted = (sessionStorage.getItem('google_scopes') || '').split(' ');
  if (granted.includes(SCOPES[name])) return getAccessToken();
  return requestScope([SCOPES[name]]);
}

async function gfetch(url, name) {
  const token = await ensureScope(name);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`google ${name} ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

// ─── Calendar — upcoming N events ────────────────────────────────────────────
export async function listEvents({ max = 10, hours = 168 } = {}) {
  const now = new Date(); const future = new Date(now.getTime() + hours * 3600 * 1000);
  const u = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  u.searchParams.set('timeMin', now.toISOString());
  u.searchParams.set('timeMax', future.toISOString());
  u.searchParams.set('maxResults', String(max));
  u.searchParams.set('singleEvents', 'true');
  u.searchParams.set('orderBy', 'startTime');
  const j = await gfetch(u, 'calendar');
  window.__trace?.fire('connector', 'calendar.list', { count: (j.items||[]).length }, 'google-connectors.js');
  return (j.items || []).map(e => ({
    id: e.id, summary: e.summary, start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date, location: e.location, attendees: (e.attendees||[]).length,
  }));
}

// ─── Gmail — search threads (subject + snippet only) ─────────────────────────
export async function searchGmail(query, max = 10) {
  const u = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  u.searchParams.set('q', query); u.searchParams.set('maxResults', String(max));
  const list = await gfetch(u, 'gmail');
  const ids = (list.messages || []).map(m => m.id);
  const out = [];
  for (const id of ids.slice(0, max)) {
    try {
      const m = await gfetch(new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`), 'gmail');
      const h = Object.fromEntries((m.payload?.headers || []).map(x => [x.name, x.value]));
      out.push({ id, snippet: m.snippet, subject: h.Subject, from: h.From, date: h.Date });
    } catch {}
  }
  window.__trace?.fire('connector', 'gmail.search', { q: query, hits: out.length }, 'google-connectors.js');
  return out;
}

// ─── Drive — search files (name + mime + modified) ──────────────────────────
export async function searchDrive(query, max = 10) {
  const u = new URL('https://www.googleapis.com/drive/v3/files');
  u.searchParams.set('q', `name contains '${query.replace(/'/g, "\\'")}'`);
  u.searchParams.set('pageSize', String(max));
  u.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName))');
  const j = await gfetch(u, 'drive');
  window.__trace?.fire('connector', 'drive.search', { q: query, hits: (j.files||[]).length }, 'google-connectors.js');
  return j.files || [];
}

if (typeof window !== 'undefined') {
  window.__google = { listEvents, searchGmail, searchDrive, requestScope, SCOPES };
}
