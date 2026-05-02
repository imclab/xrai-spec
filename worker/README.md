# xra1 LiveKit token Worker

Productionizes `scripts/mint-livekit-token.mjs` so xra1.com is self-serve.

## Deploy

```sh
cd specs/XXX-zero-to-one/xrai-website/worker
npm install -g wrangler         # one-time
wrangler login                  # one-time
wrangler secret put LIVEKIT_API_KEY      # paste from ~/.livekit/cli-config.yaml
wrangler secret put LIVEKIT_API_SECRET   # paste from ~/.livekit/cli-config.yaml
wrangler secret put LIVEKIT_URL          # e.g. wss://hologrm-0hxgauwz.livekit.cloud
wrangler deploy
```

Add the route in the Cloudflare dashboard: `xra1.com/api/livekit-token*` → `xra1-livekit-token`.

## Verify

```sh
curl 'https://xra1.com/api/livekit-token?room=test&identity=james'
# → { "token": "eyJ...", "url": "wss://...", "room": "test", "identity": "james", "ttl_min": 60 }
```

## Hardening (optional)

- Set `ALLOWED_ORIGIN` secret to `https://imclab.github.io` to lock CORS down.
- Add Cloudflare WAF rate limit on the route: 30 req/min per IP is generous.
- Rotate `LIVEKIT_API_SECRET` quarterly via `wrangler secret put`.

## Local dev

`wrangler dev` runs the worker on `http://localhost:8787`. Set the same secrets in `.dev.vars`. Then conf.html will fetch `/api/livekit-token` against the local worker if you proxy.
