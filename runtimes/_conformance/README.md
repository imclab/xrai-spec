# XRAI Conformance Test Corpus

**Spec:** RFC 0003 (see `../../rfcs/0003-conformance-tests.md`).

**Purpose:** give external runtimes a mechanical pass/fail target for "XRAI-compatible" claims. Feeds `scripts/governance-readiness.sh § Criterion 2` (≥ 3 runtimes passing → unblocks BDFL→foundation transfer).

## Current status

| Runtime | v1.0 | v1.1 | Adapter path | Result |
|---|---|---|---|---|
| Three.js | ✅ 4/4 | — | `runtimes/threejs/src/index.js` | [`results/threejs.ok`](./results/threejs.ok) |
| Unity (Portals) | ✅ shipping | — | `unity/Assets/Scripts/Bridge/SceneComposer.cs` | (reference — self-validating) |
| PlayCanvas | — | — | `runtimes/playcanvas/` (stub) | pending |
| Unreal | — | — | `runtimes/unreal/` (stub) | pending |
| WebXR | — | — | `runtimes/webxr/` (stub) | pending |
| visionOS RealityKit | — | — | `runtimes/visionos/` (stub) | pending |

## How to run (v0 — pre-RFC-0003 harness)

```bash
cd specs/XXX-zero-to-one/xrai-website
for f in examples/*.xrai.json; do
  node runtimes/threejs/src/cli.js "$f" || echo "FAIL: $f"
done
# Expected: 4× "✓ parsed 1.0 doc ... — N entities ..." lines, no FAIL lines.
```

Exit 0 across all fixtures + drop a `results/<runtime>.ok` file. Formal harness + v1.1 fixtures ship with RFC 0003 implementation.

## Fixtures

### v1.0 (currently in `../../examples/`)

| Fixture | Exercises |
|---|---|
| `01-minimal.xrai.json` | single cube; smallest valid doc |
| `02-voice-prompt.xrai.json` | LLM-authored; parent-of relation; emitter component |
| `03-wired.xrai.json` | audio-reactive wire-source + reacts-to-audio relation |
| `04-hologram.xrai.json` | AR anchor + hologram entity + tracks relation |

### v1.1 (RFC 0003 adds)

Coming with RFC 0003 merge:
- `020-recurring-event.xrai.json` (RFC 0001 temporal scheduling)
- `021-causal-chain.xrai.json` (RFC 0001 causal graph)
- `022-counterfactual-branch.xrai.json` (RFC 0001 branches)
- `023-coauthorship-hyperedge.xrai.json` (RFC 0002 n-ary)
- `024-clinical-report-hyperedge.xrai.json` (RFC 0002 asymmetric roles)

## Contributing a new runtime

1. Implement `loadXRAI(doc, engine, opts)` + optional `exportXRAI(scene)`.
2. Write a CLI that reads an XRAI JSON on stdin (or file arg), exits 0 on parse success.
3. Run all fixtures in `../../examples/`.
4. On all pass: write `results/<your-runtime>.ok` with metadata (see `results/threejs.ok` for template).
5. PR against `xrai` repo with runtime + results file.

Linked from: `../../README.md` Implementation surface, `rfcs/0003-conformance-tests.md`, `scripts/governance-readiness.sh`.
