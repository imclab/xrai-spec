# XRAI Examples

Working scenes you can paste into any v1.0-conformant runtime.

| File | What it shows | Lines |
|------|---------------|-------|
| [`01-minimal.xrai.json`](./01-minimal.xrai.json) | A single cube. Smallest valid scene. | 17 |
| [`02-voice-prompt.xrai.json`](./02-voice-prompt.xrai.json) | "A glowing blue sphere floating above a gold cube" — LLM-authored. | 42 |
| [`03-wired.xrai.json`](./03-wired.xrai.json) | Audio reactivity: cube scale binds to microphone bass. | 38 |
| [`04-hologram.xrai.json`](./04-hologram.xrai.json) | AR-native hologram emitter with depth-aware VFX. | 29 |

## Use

```bash
# Validate against the schema (when validator ships in v1.1)
xrai validate examples/01-minimal.xrai.json

# Render in Portals (Unity + RN reference runtime)
# App menu → Import XRAI → select file

# Render in Three.js adapter (coming week 2)
xrai-threejs examples/02-voice-prompt.xrai.json
```

## Contribute your own

Got a scene that shows a primitive or pattern not yet demonstrated? Open a PR:

1. Name: `NN-<slug>.xrai.json` (next available NN)
2. Keep it under 100 lines
3. Add a row to the table above
4. Include a short doc comment in the JSON header (see existing examples)

Avoid: scenes that depend on external GLB URLs (may go dead). Prefer primitives.
