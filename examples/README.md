# XRAI Examples — Master Index

Working scenes you can paste into any v1.0-conformant runtime. **Canonical SSOT** for all `.xrai.json` documents in this monorepo. Higher-level project pointer: [`/docs/XRAI_INDEX.md`](../../../../docs/XRAI_INDEX.md). Machine-readable XRAI-of-XRAI: [`./INDEX.xrai.json`](./INDEX.xrai.json).

> **Authoring rule:** every new `.xrai.json` MUST add a row here in the same commit.

## Status legend

| Status | Meaning |
|---|---|
| ✅ visualized-live  | Loaded by [`../index.html`](../index.html) graph viewer (lines 774-777) — visible on the public site. |
| 🔗 visualized-link | Linked from [`../landing.html`](../landing.html) — clickable demo, not auto-graphed. |
| 🟡 authored        | Spec-conformant, conformance-validated, awaits viewer wiring. |
| 🗄  legacy         | Pre-v1.0 / format-bundle stage. Kept for archaeology. |

## Master matrix

| #  | File | Role | Status | Constitution lens | Paper / patent tie | Decoder targets |
|----|------|------|--------|-------------------|--------------------|-----------------|
| 01 | [`01-minimal.xrai.json`](./01-minimal.xrai.json) | Single cube. Smallest valid v1.0 scene. | ✅ visualized-live | Sight Triad: x-ray (smallest substrate). | RFC-0003 fixture #1. | Three.js · PlayCanvas · Unity · echarts · icosa · needle |
| 02 | [`02-voice-prompt.xrai.json`](./02-voice-prompt.xrai.json) | LLM-authored "blue sphere over gold cube" — voice→scene. | ✅ visualized-live | Pillar: Authorship. | Paper Proof #3 (composition pipeline). | All v1.0 runtimes |
| 03 | [`03-wired.xrai.json`](./03-wired.xrai.json) | Audio-reactive: cube scale binds to mic bass via `wire-binds` + `reacts-to-audio`. | ✅ visualized-live | Pillar: Format (relation semantics). | RFC-0004 relation types. | Unity · Three.js (audio tap) |
| 04 | [`04-hologram.xrai.json`](./04-hologram.xrai.json) | AR anchor + `object.hologram` + depth-aware VFX. | ✅ visualized-live | Pillar: Edge (ARKit). | Patent 021-pthi: anchor-bound spatial doc. | Unity · WebXR (planned) |
| 05 | [`05-procedural-world.xrai.json`](./05-procedural-world.xrai.json) | "mystical forest with floating lights" — goal-oriented procedural gen. | 🟡 authored | Sight Triad: infinite zoom (sparse intent → rich phenotype). | Paper Proof #1 (60 FPS) · patent SSE claim. | Unity world_gen + VFX Graph |
| 06 | [`06-ar-body-hand.xrai.json`](./06-ar-body-hand.xrai.json) | ARKit body22 + Holokit hands26 streamed as entity codons. | 🟡 authored | Pillar: Edge (vision). | Patent: streaming pose codons. | Unity skeletal binder |
| 07 | [`07-persistent-anchor.xrai.json`](./07-persistent-anchor.xrai.json) | Save/reload XRAI doc keyed by ARKit world-anchor UUID. | 🟡 authored | Pillar: Authorship · North Star: persistent worlds. | Patent: user-owned anchor-bound docs. | runtime.persistence + Unity |
| 08 | [`08-shared-spatial.xrai.json`](./08-shared-spatial.xrai.json) | LiveKit room broadcasts XRAI deltas; peers see remix in real time. | 🟡 authored | Pillar: Multiplayer · Sight Triad: across minds. | Spec 010 LiveKit transport. | runtime.multiplayer · LiveKit RN SDK |
| 09 | [`09-specs-map.xrai.json`](./09-specs-map.xrai.json) | Self-referential XRAI of the 27-spec graph. | 🔗 visualized-link | Sight Triad: god's-eye view (whole spec topology). | RFC-0013 ontology applied to spec corpus. | Force-graph viewer |
| 10 | [`10-project-map.xrai.json`](./10-project-map.xrai.json) | Whole-project map: triad essence + 5 pillars + code roots + endpoints. | 🔗 visualized-link | Constitution mirror (essence triad + 5 pillars verbatim). | Self-referential meta-doc. | Force-graph viewer |
| 11 | [`11-jarvis-system-dna.xrai.json`](./11-jarvis-system-dna.xrai.json) | End-to-end Jarvis + XRAI system as sparse DNA: codons + wiring + 12-h build sequence. **Self-describing** encode/decode rules in `metadata.encoding`. Now carries `agent.comfort_loop` + `codon.sentiment` + `codon.point_ray` + `codon.gaze_ray` + `runtime.reticle` + `agent.expressive_hands` + `codon.perceptual_frame` + `agent.perceptual_frame_keeper`. 28 entities · 50 relations. | 🟡 authored | All 5 pillars + Sight Triad + Wonder + Expressive Freedom (incl. Pointing/Gaze/Expressive + Perceptual Frame Invariant). | Paper Proofs #1 + #3 · patent SSE / decoder contract / faceted ontology / anchor-bound. | runtime.unity.bridge + world_gen + vfx + persistence + multiplayer + reticle |
| 12 | [`12-voxel-burst-prompt.xrai.json`](./12-voxel-burst-prompt.xrai.json) | "explode a galaxy of cyan voxels around me" — voice prompt → goal codon → seeded Keijiro-pattern voxel burst. Sparse intent → 2048 GPU voxels at 60 FPS. | 🟡 authored · **Jarvis use-cases subset** | § XRAI Philosophy: DNA → phenotype · § Wonder + Expressive Freedom | Paper Proof #1 (60 FPS perf) · patent SSE | Three.js · PlayCanvas · Unity VFX Graph |
| 13 | [`13-conducting-orchestration.xrai.json`](./13-conducting-orchestration.xrai.json) | "let me conduct the swarm" — per-finger pointing rays + open-hand arc + tempo envelope drive a 1200-particle agent swarm. Optional symphonic harp cue. No mouse, no menu. | 🟡 authored · **Jarvis use-cases subset** | § Doing Without Doing → Pointing/Gaze/Expressive addendum · § Wonder + Expressive Freedom | Patent: streaming pose codons + decoder contract | runtime.reticle + agent.expressive_hands + react.tempo |
| 14 | [`14-shared-hologram-conf.xrai.json`](./14-shared-hologram-conf.xrai.json) | Multiplayer holographic video conferencing — seating template + per-participant `object.hologram` (RGBD source/sink + audio + pose) + shared canvas. Same XRAI doc renders on web (Three.js point cloud), iOS (Unity VFX-Graph), visionOS (Apple Spatial Persona). | 🟡 authored · **Jarvis use-cases subset** | § Sight Triad → infinite zoom (across minds) · § Perceptual Frame Invariant | Apple WWDC24 session 10201 (verified) · Spec 010 LiveKit | live-web.js (v1) · LiveARKitFeeder.cs · LiveVFXBinder.cs · `SystemCoordinator` (visionOS) |
| —  | [`../../../../.xrai/xrai_format_bundle/sample.xrai.json`](../../../../.xrai/xrai_format_bundle/sample.xrai.json) | Pre-v1.0 sample (format-bundle stage). | 🗄 legacy | n/a | n/a | n/a |
| —  | [`../../../../.xrai/xrai-spec-repo-final/examples/sample.xrai.json`](../../../../.xrai/xrai-spec-repo-final/examples/sample.xrai.json) | Pre-v1.0 sample (spec-repo-final stage). | 🗄 legacy | n/a | n/a | n/a |

## Conformance fixtures (separate corpus)

Defined in [`../rfcs/0003-conformance-tests.md`](../rfcs/0003-conformance-tests.md). Validator: [`../runtimes/_conformance/validate_fixtures.cjs`](../runtimes/_conformance/validate_fixtures.cjs). Examples 01-04 are also the v1.0 conformance baseline.

## Encode / decode rules (one-screen)

SoT: [`../SPEC.md`](../SPEC.md) + [`../rfcs/0012-decoder-contract.md`](../rfcs/0012-decoder-contract.md) + [`../rfcs/0013-master-ontology-faceted-learning.md`](../rfcs/0013-master-ontology-faceted-learning.md). Every doc carries an encode/decode hint in its `metadata`. Doc 11 carries the **full** rule set inline (`metadata.encoding`) and is the recommended template for system-level XRAI authoring.

## Use

```bash
# Validate
node ../runtimes/_conformance/validate_fixtures.cjs

# Render in Three.js adapter
node ../runtimes/threejs/src/cli.js 01-minimal.xrai.json

# Render in Portals
# App menu → Import XRAI → select file
```

## Contribute

1. Name: `NN-<slug>.xrai.json` (next available NN — currently 12).
2. Validate against v1.0 schema.
3. **Add a row to the master matrix above in the same commit.**
4. Add an entity to [`./INDEX.xrai.json`](./INDEX.xrai.json).
5. Include a short doc comment in the JSON `metadata` header.

Avoid scenes that depend on external GLB URLs (may go dead). Prefer primitives + emitters.
