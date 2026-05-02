// livekit-token.js — Cloudflare Worker for /api/livekit-token (T1464).
//
// Productionizes the local mint script (scripts/mint-livekit-token.mjs) so
// xra1.com is self-serve: anyone clicking conf.html → join gets a JWT without
// pasting one. Same JWT shape, same LK server URL, just hosted.
//
// Deploy:
//   1. Set secrets via wrangler:
//        wrangler secret put LIVEKIT_API_KEY
//        wrangler secret put LIVEKIT_API_SECRET
//        wrangler secret put LIVEKIT_URL          # wss://<project>.livekit.cloud
//   2. Route /api/livekit-token/* to this worker in Cloudflare dashboard.
//
// Request:
//   GET /api/livekit-token?room=<id>&identity=<name>&ttl=<minutes>
// Response:
//   { token, url, room, identity, ttl_min }
//
// CORS: open by default (xra1.com is public). Tighten with ALLOWED_ORIGIN env
// var if you want to lock to specific domains.

const TTL_MIN_DEFAULT = 60;
const TTL_MIN_MAX = 24 * 60;

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// HS256 JWT sign — Web Crypto API (Workers runtime).
async function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj) => btoa(JSON.stringify(obj))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = `${enc(header)}.${enc(payload)}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sigB64}`;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(env) });

    const url = new URL(req.url);
    if (!url.pathname.endsWith('/livekit-token')) {
      return new Response('not found', { status: 404, headers: corsHeaders(env) });
    }

    const apiKey = env.LIVEKIT_API_KEY;
    const apiSecret = env.LIVEKIT_API_SECRET;
    const lkUrl = env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !lkUrl) {
      return Response.json(
        { error: 'worker not configured — set LIVEKIT_API_KEY/SECRET/URL secrets' },
        { status: 500, headers: corsHeaders(env) }
      );
    }

    const room = url.searchParams.get('room') || 'xrai-demo';
    const identity = url.searchParams.get('identity') || `web-${Math.random().toString(36).slice(2, 7)}`;
    const ttlMin = Math.min(Number(url.searchParams.get('ttl') || TTL_MIN_DEFAULT), TTL_MIN_MAX);

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: apiKey, sub: identity, nbf: now, exp: now + ttlMin * 60,
      video: { roomJoin: true, room, canPublish: true, canSubscribe: true },
    };
    const token = await signJwt(payload, apiSecret);

    return Response.json(
      { token, url: lkUrl, room, identity, ttl_min: ttlMin },
      { headers: { 'Cache-Control': 'no-store', ...corsHeaders(env) } }
    );
  },
};

