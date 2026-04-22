# Building + running XRAI reference implementations

Two shipping reference implementations today:

1. **`runtimes/threejs/`** — MIT-licensed Three.js adapter for v1.0 public JSON
2. **`mcp-server/`** — spatial MCP server (8 tools, `@h3m/spatial-intelligence-mcp`)

Both are Node-based. Each has its own README with full detail; this file is the short operator view.

---

## Quick test: Three.js adapter

Validates a v1.0 XRAI document parses correctly. No browser required — headless CLI.

```bash
cd runtimes/threejs
npm install        # one-time — installs three as devDependency
node src/cli.js ../../examples/01-minimal.xrai.json
# expected: ✓ parsed 1.0 doc ... — 1 entities, 0 relations, 0 events
```

Test all 4 v1.0 fixtures:

```bash
cd runtimes/threejs
for f in ../../examples/*.xrai.json; do
  node src/cli.js "$f" || echo "FAIL: $f"
done
# expected: 4 ✓ lines, 0 FAIL lines
```

Programmatic use:

```javascript
import * as THREE from 'three';
import { loadXRAI, exportXRAI } from '@xrai/threejs-adapter';

const doc = await fetch('scene.xrai.json').then(r => r.json());
const { scene, entities } = loadXRAI(doc, THREE, {
  onGlbPending: (obj, ent) => { /* caller resolves object.glb refs */ },
  onAnimation: (obj, anim) => { /* caller drives per-frame animation */ },
});
threejsScene.add(scene);

// Round-trip preserves unknown fields (Postel)
const roundTripped = exportXRAI(scene);
```

See `runtimes/threejs/README.md` for the full mapping table (XRAI types → Three.js primitives) + coordinate-system notes.

---

## Quick test: Spatial MCP server

Gives any MCP-compatible agent (Claude Desktop, Cursor, Cline, OpenAI agents, Gemini-with-shim) the ability to author + query XRAI scenes.

```bash
cd mcp-server
npm install
npm run build      # runs tsc → dist/
npm start          # launches MCP server over stdio
```

Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "spatial-intelligence": {
      "command": "npx",
      "args": ["-y", "@h3m/spatial-intelligence-mcp"]
    }
  }
}
```

Claude Code:

```bash
claude mcp add spatial-intelligence npx @h3m/spatial-intelligence-mcp
```

Then ask Claude things like: *"Compose a spatial scene with a glowing blue sphere floating above a gold cube."* — the MCP server emits XRAI; downstream runtimes (Unity / Three.js) render.

---

## Conformance harness

Run every shipped adapter against every v1.0 fixture, update `.ok` / `.fail` markers per runtime:

```bash
# From Portals monorepo root (this script lives there)
./scripts/xrai_conformance_run.sh              # full run
./scripts/xrai_conformance_run.sh --runtime threejs --verbose
```

Markers drop in `runtimes/_conformance/results/<runtime>.ok`. These feed `scripts/governance-readiness.sh § Criterion 2` (≥ 3 passing runtimes = unlock BDFL → foundation transfer).

---

## Adding a new runtime

1. Create `runtimes/<name>/` with:
   - `package.json` (if JS/TS) OR `Cargo.toml` / `pyproject.toml` / etc.
   - `src/cli.js` (or equivalent) implementing the conformance contract: read XRAI JSON from file arg or stdin, exit 0 on parse success
2. Write `runtimes/<name>/README.md` with mapping from XRAI entities/relations to your engine's primitives
3. Run `scripts/xrai_conformance_run.sh --runtime <name>` — auto-drops `.ok` or `.fail` marker
4. See `runtimes/_conformance/README.md` for the harness contract + `runtimes/threejs/` as reference

Target per-runtime: 8/8 lock gates in `RUNTIMES_EVALUATION.md`. Reach all 8 → eligible to flip 🔴 → 🟢 in the shipping matrix.

---

## Local-dev monorepo layout (Portals source)

The staging source for this public site lives at `specs/XXX-zero-to-one/xrai-website/` in the Portals v4 monorepo (`github.com/ryanjbrant/portals_v4`). Updates flow:

```
portals_v4 (source of truth)
  └── specs/XXX-zero-to-one/xrai-website/   ← edit here
          └── scripts/xrai_repo_bootstrap.sh sync
                └── imclab/xra1 (public mirror)   ← published to xrai.dev
```

Bootstrap script usage (from Portals monorepo):

```bash
./scripts/xrai_repo_bootstrap.sh --dry-run               # preview
./scripts/xrai_repo_bootstrap.sh --no-dry-run            # mutate (push to public repo)
./scripts/xrai_repo_bootstrap.sh --no-dry-run --enable-pages   # + enable Pages
```

---

## Troubleshooting

**"Cannot find module 'three'"** — run `npm install` inside `runtimes/threejs/`. The adapter has `three@^0.160.0` as a dependency.

**"loadXRAI failed: missing xrai_version"** — your document isn't a valid XRAI v1.0 doc. Minimum required fields: `xrai_version`, `scene`. See `SPEC.md § Minimal example`.

**"✗ parsed failed"** — re-run with `--json` to see the normalized round-trip, compare to your input to find the field the parser dropped.

**MCP tool not discovered by Claude Desktop** — check `claude_desktop_config.json` JSON syntax (trailing commas kill the parser). Restart Claude Desktop after config changes.

**Pages URL serves old content** — GitHub Pages rebuild can lag ~60s after push. Check `gh api repos/imclab/xra1/pages/builds/latest --jq .status` — should be `built`.
