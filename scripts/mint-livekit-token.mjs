#!/usr/bin/env node
// mint-livekit-token.mjs — local dev token mint for conf.html.
//
// Reuses the SAME credential source as web/rgbd-viewer/vite.config.ts:
// reads ~/.livekit/cli-config.yaml (LiveKit CLI standard config — see
// https://docs.livekit.io/realtime/cli/). No per-repo .env files. If
// you run `lk project add` once with the LiveKit CLI, both this script
// and rgbd-viewer's vite plugin pick up the same creds.
//
// Use:
//   npm run lk:token -- --room=xrai-demo --identity=james
//     → JWT + share-url + server URL (printed)
//   npm run lk:token -- --room=xrai-demo --project=hologrm --url
//     → URL only, pipeable to `pbcopy` for sharing
//   npm run lk:token -- --room=xrai-demo --base=http://localhost:8765/conf.html
//     → URL targets your local dev server instead of the GH Pages site
import { AccessToken } from 'livekit-server-sdk';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Same parser as web/rgbd-viewer/vite.config.ts: minimal YAML, flat
// key/value + array-of-objects under `projects:`. Don't pull a YAML
// dep — the file shape is fixed by the LiveKit CLI.
function readLkConfig(wantProject) {
  const raw = readFileSync(join(homedir(), '.livekit', 'cli-config.yaml'), 'utf-8');
  const cfg = { projects: [] };
  let cur = {}, inProjects = false;
  for (const line of raw.split('\n')) {
    const t = line.trimEnd();
    if (t.startsWith('default_project:')) cfg.default = t.split(':').slice(1).join(':').trim();
    else if (t === 'projects:') inProjects = true;
    else if (inProjects && t.startsWith('    - name:')) {
      if (cur.name) cfg.projects.push(cur);
      cur = { name: t.replace('    - name:', '').trim() };
    } else if (inProjects && t.startsWith('      url:'))        cur.url = t.replace('      url:', '').trim();
    else if (inProjects && t.startsWith('      api_key:'))     cur.api_key = t.replace('      api_key:', '').trim();
    else if (inProjects && t.startsWith('      api_secret:'))  cur.api_secret = t.replace('      api_secret:', '').trim();
  }
  if (cur.name) cfg.projects.push(cur);
  const target = wantProject || cfg.default;
  return cfg.projects.find(p => p.name === target) || cfg.projects[0] || null;
}

const args = Object.fromEntries(process.argv.slice(2).flatMap(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [[m[1], m[2] ?? true]] : [];
}));

let project;
try { project = readLkConfig(args.project); }
catch (e) {
  console.error(`error: cannot read ~/.livekit/cli-config.yaml — ${e.message}`);
  console.error('       run "lk project add" (LiveKit CLI) to create it,');
  console.error('       or pass --key + --secret + --url for one-shot use.');
  process.exit(1);
}

const apiKey = args.key || project?.api_key;
const apiSecret = args.secret || project?.api_secret;
const lkUrl = args.url || project?.url;
if (!apiKey || !apiSecret || !lkUrl) {
  console.error('error: missing LiveKit creds. Available projects:',
    project ? `(default: ${project.name})` : '(none)');
  process.exit(1);
}

const room = args.room || 'xrai-demo';
const identity = args.identity || `web-${Math.random().toString(36).slice(2, 7)}`;
const ttlMin = Number(args.ttl || 60);
const baseUrl = args.base || 'https://imclab.github.io/xra1/conf.html';

const at = new AccessToken(apiKey, apiSecret, { identity, ttl: `${ttlMin}m` });
at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
const jwt = await at.toJwt();

// conf.html honors ?url= to override the hardcoded server URL — necessary
// because the user's LiveKit project (hologrm-0hxgauwz) is NOT the same
// as the legacy hardcoded portals-dev.livekit.cloud.
const shareUrl = `${baseUrl}?room=${encodeURIComponent(room)}&token=${encodeURIComponent(jwt)}&url=${encodeURIComponent(lkUrl)}`;

if (args['url-only']) { console.log(shareUrl); process.exit(0); }

console.log(`project:  ${project.name}`);
console.log(`server:   ${lkUrl}`);
console.log(`room:     ${room}`);
console.log(`identity: ${identity}`);
console.log(`ttl:      ${ttlMin}m`);
console.log();
console.log(`join url: ${shareUrl}`);
console.log();
console.log('share that URL — clicking it joins directly (no JWT paste needed).');
