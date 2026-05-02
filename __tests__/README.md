# xrai-website browser visual tests

Laser-focused smoke tests for the public XRAI website surfaces. Boots a
plain `python3 -m http.server` against the site root and runs Chromium-only
checks against `conf.html` (hologram conferencing), `jarvis.html` (agent),
`index.html` (graph viewer).

## Run

```sh
cd specs/XXX-zero-to-one/xrai-website
npm install
npm run test:browser:install   # one-time; downloads Chromium
npm run test:browser
```

Output JSON lands at `__tests__/results/last.json` for CI.

## Coverage

- `conf.spec.js` — Three.js stage mount, control panel, `?room=` round-trip,
  jarvis-web.js lazy load.
- `jarvis.spec.js` — brand renders, no page errors on `index.html` (LiveKit
  token + gemini-key network noise filtered).

## Adding a test

Drop `*.spec.js` into this folder. Use `page.goto('/<file>.html')`. Page
errors fail tests by default — whitelist via regex if expected (see
`jarvis.spec.js` `index.html` filter).

## CI gate

Wire as a non-blocking gate first (warn on fail). Promote to blocking once
green for 3 consecutive runs.
