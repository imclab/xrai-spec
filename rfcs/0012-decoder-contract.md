# RFC 0012: Decoder contract — pluggable consumers of XRAI SSE streams

- **Status:** Draft
- **Author:** @jamestunick
- **Date:** 2026-04-23
- **Target version:** v1.2 (additive)
- **Related:** **RFC 0009 (stream ingestion + SSE)**, RFC 0010 (archetypes), RFC 0011 (blueprints)
- **Prior art:** OpenTelemetry exporter/receiver contract, Unity Scriptable Render Pipeline, glTF loader ecosystem, LangGraph node graph, Houdini OBJ/SOP/DOP contract, MCP server contract

---

## Summary

Define the uniform contract every **decoder** of an XRAI sparse-semantic-encoding (SSE) stream implements: **subscribe(filter, timeline) → async iterator of deltas → produce some output**. Decoders are pluggable — renderers, simulators, AI agents, bridges, converters, generators, 3D viewers, game engines, shader/VFX systems, neural renderers. Each declares which ontology components it consumes and what it emits (pixels, a simulated world, a downstream stream, a converted file, tokens, actions, …).

## Motivation

- RFC 0009 defines a neutral semantic middle (SSE). Without a decoder contract, every consumer rebuilds its own subscription / filter / time-scrub / backpressure logic. Result: M+N collapses back to M×N in practice.
- The ecosystems that scaled (OpenTelemetry, glTF loaders, Unity SRP, LangGraph) all ship an explicit consumer contract. XRAI without one is a data bus with no sockets.
- A decoder contract is what makes **"anything can render, simulate, replay, or generate from the same stream"** actually true. A diffusion model, a shader, a Unity VFX Graph, a game-engine level-streamer, a testing harness, an LLM agent, and a PDF exporter are all "decoders" in this model — each consumes SSE, each produces something.

## Design

### Decoder = plug-in with a declared contract

```json
{
  "xrai_decoder_version": "1.2",
  "id": "unity-vfx-hologram",
  "kind": "renderer",
  "consumes": {
    "archetypes": ["Hologram", "Primitive", "Light"],
    "components": ["pose_6dof", "material_params", "audio_reactive_gain", "mesh_uri"],
    "wire_formats": ["application/vnd.xrai.sse+arrow", "application/vnd.xrai.sse+json"]
  },
  "produces": {
    "kind": "pixels",
    "target": "display://unity/color_buffer",
    "rate_hz": 90,
    "latency_budget_ms": 11
  },
  "capabilities": ["time_scrub", "live_subscribe", "partial_filter"],
  "provenance": { "runtime":"Unity 6000.2.14f1", "version":"0.1.0" }
}
```

### Uniform interface (any language)

Every decoder implements:

```ts
interface XraiDecoder<Out> {
  // Inspect what the decoder can do — the JSON manifest above.
  manifest(): DecoderManifest;

  // Subscribe to an SSE stream with an optional filter + timeline seek.
  //   filter examples:
  //     { entity_path_prefix: "/scene/anchor_1" }
  //     { archetype: ["Hologram"] }
  //     { component: ["pose_6dof"] }
  //   timeline.seek_to lets replay start at a specific (timeline, t).
  subscribe(
    stream: SseStream,
    opts: { filter?: Filter; seek_to?: TimelinePoint; live?: boolean }
  ): AsyncIterator<Delta>;

  // Consume deltas and produce the decoder's output.
  // For a renderer: draws pixels. For a simulator: steps the world.
  // For an agent: emits tool calls. For a converter: writes bytes.
  step(deltas: Delta[]): Promise<Out>;

  // Optional: emit an SSE stream back (bidirectional decoders — e.g. a sim
  // that feeds its state back as SSE; a neural generator that emits new
  // scene content). Forbidden for read-only decoders (renderers, viewers).
  emit?(): AsyncIterator<Delta>;
}
```

### Representation ladder (normative — every XRAI doc MUST have fallbacks)

An XRAI runtime MUST always be able to display any document at some tier, even if no high-fidelity decoder is installed. Tiers are ordered by decreasing reducibility: **T0 always works, T22 needs a GPU cluster.** A decoder declares the tier(s) it supports; the host picks the best available per device + bandwidth + user preference + trust. *Every* runtime ships T0–T6 as built-ins.

| Tier | Representation | Concretely |
|---|---|---|
| **T0** | 1-bit existence | `●` &middot; "this thing is, anything more is ornament" |
| **T1** | Binary / DNA-like symbol string | `ACGT` · `0010 1101` — sparse 1-char alphabet |
| **T2** | ASCII text label | `[tree]` / `entity:/scene/tree_1` |
| **T3** | L-system / grammar rule | `F→F[+F][-F]F` — recursive production |
| **T4** | Emoji / Unicode glyph | 🌳 🔮 📡 ◉ — one codepoint per entity |
| **T5** | Color-coded shape | filled triangle / disc / square in CSS |
| **T6** | 2D node graph / flowchart | boxes + arrows (force-graph, Mermaid) |
| **T7** | Timeline / scalar chart | Gantt · line · histogram · scrubber |
| **T8** | 3D primitive | cube / sphere / cone in-scene |
| **T9** | 2D image / sprite | raster PNG/JPG/WEBP |
| **T10** | 2D video / GIF | looping animation |
| **T11** | 3D mesh · glTF · USDZ | textured geometry |
| **T12** | 3D animation (rigged) | animated skinned mesh |
| **T13** | 360 image / equirectangular | spherical panorama |
| **T14** | 360 video | spherical video |
| **T15** | RGBD image | color + depth |
| **T16** | RGBD-stencil · MetaVido · hologram | Portals substrate (color+depth+stencil+audio) |
| **T17** | Rerun `.rrd` multimodal | Arrow columnar stream |
| **T18** | Schema · AI model · shader · VFX graph | executable representation |
| **T19** | Neural filter · neural video · neural world | AI-conditioned rendering (3D-GS, NeRF, diffusion) |
| **T20** | Big-data viz · N-dim graph | ECharts-GL · WebGPU hypergraph · 10k+ nodes |
| **T21** | Quantum · probability cloud | wavefunction · superposition · density matrix |
| **T22** | Simulation · universe · multiverse | full agent-driven physical world, counterfactual branches |

**Normative requirements:**

1. **T0–T6 are mandatory.** Every runtime (web, Unity, Python, Rust, embedded) SHIPS these tiers as zero-dep built-ins. Worst case any XRAI doc still shows as an ASCII outline + emoji + color-coded graph.
2. **Decoders declare tiers via `produces.tier`.** A decoder manifest now carries `produces.tier: [8, 11, 16]` — the host negotiates the best match.
3. **Down-tier projection MUST be lossy-but-readable.** A T16 hologram projected to T4 shows 🔮. A T22 universe simulation projected to T6 shows its top-level node graph. A T19 NeRF projected to T9 shows a rendered keyframe.
4. **Up-tier synthesis is optional + tagged with provenance.** An LLM generator (T4 emoji → T11 mesh) may guess; the synthesis MUST carry `provenance.inferred = true` and `A12 trust = T3-speculative` so downstream viewers can dim or flag it.
5. **Graceful-degradation path** for any entity: `entity.display_tiers = [T16, T11, T8, T4, T2]` — host picks the highest tier it can render given decoders + network + power budget.

**Why:** the transcript of the original XRAI exploration (2024/25 ChatGPT session) committed XRAI to being the "HTTP of spatial media" — a protocol that enables an ecosystem, not a file. HTTP works on a 2G phone AND on fiber. XRAI must work on a terminal AND on a render farm. Tiers are how. This also operationalizes the constitution's "sparse seeds → infinite richness" line: the same entity can be one emoji in a text chat *or* a full diffusion-rendered neural world, and both are valid XRAI.

### Tier → spec coverage (where each tier is implemented in the Portals monorepo)

The following table is **the canonical cross-reference** from representation tier to the spec that implements + owns it. When adding a new decoder, find the matching spec and add your decoder manifest there. When a spec changes its rendering approach, update its `produces.tier` list here.

| Tier | Canonical implementing spec | File(s) |
|---|---|---|
| T0 &middot; existence | RFC 0012 (all runtimes ship it) | `js/xrai-decoder.ts` built-in |
| T1 &middot; binary / DNA | RFC 0012 + [XRAI v2 §DNA](../../XRAI_FORMAT_SPECIFICATION_V2.md) | built-in |
| T2 &middot; ASCII label | RFC 0012 | built-in |
| T3 &middot; L-system / grammar | [spec 023 voxel-world](../../023-voxel-world-generator/spec.md) · [spec 004 save/load](../../004-scene-save-xrai-format/spec.md) | `Rule`-based sparse gen |
| T4 &middot; emoji / glyph | [spec 006 KB visualizer](../../006-kb-visualizer/spec.md) | typed glyph taxonomy |
| T5 &middot; color shape | [spec 006](../../006-kb-visualizer/spec.md) · [spec 025 brand-identity](../../025-brand-identity/spec.md) | palette + shape set |
| T6 &middot; node graph | [spec 006 KB visualizer](../../006-kb-visualizer/spec.md) · force-graph / Mermaid | web + Unity editor |
| T7 &middot; timeline / chart | [spec 018 wire-editor](../../018-wire-editor-modes/spec.md) · [spec 006](../../006-kb-visualizer/spec.md) | ECharts-GL scalar view |
| T8 &middot; 3D primitive | [spec 002 advanced composer](../../002-unity-advanced-composer/spec.md) · [spec 019 ecs composer](../../019-ecs-composer/spec.md) | Unity built-ins + URP |
| T9 &middot; 2D image | [spec 022 universal-asset-io](../../022-universal-asset-io/spec.md) | PNG/JPG/WEBP loader |
| T10 &middot; 2D video | [spec 022](../../022-universal-asset-io/spec.md) · [spec 014 web-integration](../../014-web-integration/spec.md) | HLS · WebRTC |
| T11 &middot; 3D mesh (glTF/USDZ) | [spec 022](../../022-universal-asset-io/spec.md) · [XRAI v2 §glTF-envelope](../../XRAI_FORMAT_SPECIFICATION_V2.md) | glTFast · Icosa |
| T12 &middot; 3D animation | [spec 022](../../022-universal-asset-io/spec.md) · [spec 026 vfx migration](../../026-vfx-parity-migration/spec.md) | Unity Animator |
| T13 &middot; 360 image | [spec 014 web-integration](../../014-web-integration/spec.md) | equirect viewer |
| T14 &middot; 360 video | [spec 014](../../014-web-integration/spec.md) · [spec 010 multiplayer](../../010-multiplayer-normcore/spec.md) | WebXR pipeline |
| T15 &middot; RGBD image | [spec 003 hologram-telepresence](../../003-hologram-telepresence/spec.md) · [spec 011 body/face/hand](../../011-body-face-hand-space-tracking-scanning/spec.md) | iPhone LiDAR · HueDepth |
| T16 &middot; RGBD-stencil · hologram | [spec 003 hologram-telepresence](../../003-hologram-telepresence/spec.md) · [spec 026 vfx migration](../../026-vfx-parity-migration/spec.md) | **MetaVido substrate · Portals canonical** |
| T17 &middot; Rerun rrd | [RFC 0009 §bridges](./0009-stream-ingestion-sparse-semantic-encoding.md) · sse-to-rerun decoder | Arrow IPC |
| T18 &middot; schema · shader · VFX graph | [spec 012 shadertoy-converter](../../012-shadertoy-converter/spec.md) · [spec 024 neural-filters](../../024-neural-filters/spec.md) · [spec 026 vfx-parity-migration](../../026-vfx-parity-migration/spec.md) | VFX Graph |
| T19 &middot; neural world (3D-GS / NeRF / diffusion) | [spec 024 neural-filters](../../024-neural-filters/spec.md) · [CVPR paper §4D-GS](../../../../CVPR_2026_IEEE_README.md) | SPAGController · Metal |
| T20 &middot; N-dim hypergraph | [spec 006 KB visualizer §WebGPU-ECharts](../../006-kb-visualizer/spec.md) · [RFC 0008](./) | 10k+ nodes |
| T21 &middot; quantum / probability cloud | [RFC 0013 A13 quantum regime](./0013-master-ontology-faceted-learning.md) · [spec 017 megabrain](../../017-megabrain-orchestration/spec.md) | future RFC |
| T22 &middot; universe · multiverse · sim | [spec 017 megabrain-orchestration](../../017-megabrain-orchestration/spec.md) · [spec 023 voxel-world](../../023-voxel-world-generator/spec.md) · [RFC 0013 A14=emergent](./0013-master-ontology-faceted-learning.md) | agent + sim loop |

**Ownership rule:** a tier's "canonical implementing spec" is the SSOT for that tier's conformance corpus (RFC 0003). When Portals ships a new decoder at a tier, its manifest links to the canonical spec. When a spec changes its decoder implementation, it updates the manifest, and the change propagates via the decoder registry — no broadcast rewrite needed.

**Cross-references (other XRAI-related specs):** [public SPEC v1.0](../SPEC.md) · [engineering SPEC v2](../../../XRAI_FORMAT_SPECIFICATION_V2.md) · [VIEWER_ARCHITECTURE](../VIEWER_ARCHITECTURE.md) · [save/load spec 004](../../004-scene-save-xrai-format/spec.md) · [CVPR paper](../../../../CVPR_2026_IEEE_README.md) · [constitution §XRAI Philosophy](../../../constitution.md).

### Decoder kinds (normative taxonomy)

| Kind | What it consumes | What it produces | Examples |
|---|---|---|---|
| **renderer** | geometry/material/transform components | pixels | force-graph, ECharts-GL, PlayCanvas, Needle, Unity URP/HDRP, Three.js, Unreal, Icosa, shader/VFX decoders |
| **neural renderer** | pose + latent + image components | pixels | 3D-GS, NeRF-on-the-fly, diffusion-conditioned (Stable-Video-3D), SDF generators |
| **simulator** | physics/agent/event components | world-state deltas (loopback) | Bullet/PhysX replay, LLM-in-the-loop sims, traffic sim, cloth sim |
| **replayer** | any | UI panel / time-scrub output | Rerun-style viewer, diff inspector, debug table |
| **generator** | small seed + ontology slots | *new* SSE deltas | L-system, WFC, procedural noise-field, LLM scene expander, diffusion generators |
| **agent** | agent/event/text components | tool calls, actions, plans | LangGraph nodes, MCP servers, RL policies, LeRobot actors |
| **bridge** | any | another protocol's stream | `sse → Rerun .rrd`, `sse → OpenTelemetry`, `sse → USD`, `sse → glTF`, `sse → MIDI` |
| **converter** | any | a file / blob | PDF exporter, snapshot PNG, `.xrai` JSON snapshot writer |
| **recorder** | any | an archived stream | Lance cold-store writer, S3 upload, IPFS pin |
| **probe** | any | metrics / assertions | conformance test harness (RFC 0003/0004), perf guard, schema validator |

A single decoder MAY implement multiple kinds (e.g., a sim that is also a generator). The manifest lists all.

### Registry + discovery

- `xrai://decoders/<id>.json` — public manifests (analogous to schema mappings).
- Runtimes can list locally-installed decoders at `xrai://decoders/_local`.
- New decoders land as code drops in `decoders/` (web) or Unity packages / Python pip / Rust crates. One manifest per decoder. Discovery by manifest search.

### Multi-decoder composition

A single SSE stream can be consumed by many decoders in parallel:

```
           ┌──► renderer(Unity URP)  ─► pixels
           │
SSE ──────►┼──► replayer(xra1.com)  ─► UI
           │
           ├──► agent(LLM)          ─► tool calls → emit? → SSE
           │                                           │
           └──► bridge(OpenTelem.)  ─► spans          │
                                                       ▼
                                                (merged back into stream)
```

Agents and generators are first-class because they can both consume AND emit. A loop is allowed as long as each emission is type-tagged with `provenance` so cycles can be detected + rate-limited (prior art: LangGraph cycle handling).

### Capabilities + negotiation

A decoder declares capabilities in its manifest. A host that orchestrates N decoders uses capabilities to:

- **time_scrub** — decoder can serve any `seek_to`; else only live tailing.
- **live_subscribe** — decoder can keep up at stream rate.
- **partial_filter** — decoder supports per-subscribe `filter`; else must receive full stream and filter locally.
- **replay_deterministic** — re-running the same inputs produces the same outputs (important for test + VFX deterministic capture).
- **gpu_accelerated** — can pipeline with other GPU decoders without readback.

Blueprints (RFC 0011) SELECT decoders by capability + kind.

### Error semantics

- A decoder MUST continue on unknown component (consume, mark metadata, pass through if emitting downstream).
- A decoder MUST NOT block the host on backpressure — if the decoder is slower than the stream, it MUST drop or downsample, never stall (Rerun pattern).
- A decoder that panics MUST isolate to its own process / worker — a failed decoder never takes down the SSE bus or other decoders.

### Conformance impact

For v1.2-conformance a decoder MUST:

1. Publish a manifest matching the schema above.
2. Implement the `subscribe + step` pair.
3. Honor SSE `delta_kind` semantics (add/update/remove/annotate).
4. Advertise its wire-format support.
5. Pass its kind's conformance corpus (renderer corpus = visual-diff tolerance per RFC 0004; agent corpus = tool-use replay determinism; bridge corpus = round-trip byte-identical for formats that guarantee it).

## Alternatives considered

### A — no contract, per-ecosystem glue code
What the status quo drifts to. Rejected: M×N problem returns.

### B — copy OpenTelemetry exporter/receiver shape verbatim
OT's shape assumes three fixed kinds (log, metric, span). We have ten+ kinds and arbitrary components. Rejected as-is, but wire conventions (resource/attributes/instrumentation-scope) inform our `provenance`.

### C — copy Unity SRP (Scriptable Render Pipeline) directly
Too render-centric. Doesn't model agents / generators / bridges. Rejected as the primary model, but the "feature resource graph" idea inspired our composition section.

### D — copy LangGraph node contract
Closer, but LangGraph is LLM-centric and lacks wire-format discipline for real-time high-Hz streams. Rejected as-is, but the bidirectional-node idea (`consumes + emits`) is directly borrowed.

### E — ship an interface with implementation
Rejected: an RFC should freeze the contract; reference implementations ship in follow-up PRs per language.

## Backwards compatibility

- All v1.0/1.1 consumers become "renderer" decoders with a trivially-synthesized manifest. Their existing behavior is unchanged.
- No breaking changes to the SSE stream shape (RFC 0009).

## Implementation plan

1. RFC merged. Decoder manifest schema + interface frozen.
2. Reference interfaces:
   - **TypeScript:** `js/xrai-decoder.ts` — base class + registry.
   - **C#:** `unity/Packages/.../XraiDecoder.cs` — matches Unity VFX Graph binding conventions.
   - **Python:** `py/xrai_decoder/` — async + PyArrow-native.
   - **Rust:** `crates/xrai-decoder` — re-exports per wire format.
3. First 6 reference decoders shipped alongside ontology-v1:
   - **renderer** `force-graph-web` (already effectively shipped; manifest wrapper).
   - **renderer** `unity-vfx-hologram` (exists in Portals; manifest wrap).
   - **bridge** `sse-to-rerun` (emit `.rrd` from SSE — directly reuses `rerun-main` under `_ref/`).
   - **bridge** `sse-to-opentelemetry` — emit OTLP spans from XRAI events.
   - **agent** `llm-scene-describer` — tool-use trace ↔ SSE.
   - **generator** `llm-scene-expander` — LLM grows a scene from a seed entity.
4. Conformance tests (RFC 0003 corpus extension) — per kind.
5. Blueprint (RFC 0011) gains a `decoders[]` selector so a view can pin specific decoders.

## Unresolved

- **Hot-swap semantics** — can a decoder be swapped mid-subscription without losing state? Propose: yes if both share a checkpoint interface; else re-subscribe from current `t`.
- **Sandboxing** — decoders from untrusted origins (e.g. a webpage loading an LLM agent decoder). Defer to an RFC 0012a security profile.
- **Cross-decoder resource sharing** — two GPU renderers sharing a frame buffer without readback. Defer; initial v1.2 assumes per-decoder isolation.

## Prior art (primary sources only)

- **OpenTelemetry exporter/receiver** — neutral middle + pluggable consumers pattern. [spec](https://github.com/open-telemetry/opentelemetry-specification)
- **Unity Scriptable Render Pipeline** — render feature resource graph, per-kind contracts.
- **glTF loader ecosystem** — single format, many consumers (Blender, Three.js, PlayCanvas, Needle, Godot, Unreal).
- **LangGraph** — bidirectional node contract (consumes + emits) for LLM agent graphs.
- **MCP (Model Context Protocol)** — server contract with tool/resource/prompt categories; we borrow the manifest style.
- **Houdini SOP / DOP / COP contract** — typed operator categories consume/produce specific data kinds.
- **Rerun Data Loaders** — external-data-loader contract (`rerun-loader-python-example-docx`, `…-tfrecord`). Local clones under `_ref/` via rerun-io symlink.
- **ROS nodes + rclcpp subscriber contract** — subscribe-by-topic semantics.

## Future work

- **RFC 0013** — neural-renderer decoder profile (3D-GS / NeRF / diffusion specifics).
- **RFC 0014** — agent decoder profile (LLM tool-use, RL actor, LeRobot policy).
- **RFC 0015** — generative decoder profile (procedural seeds, WFC, L-system).
- **RFC 0016** — federated decoders across trust boundaries.
- Decoder marketplaces / signed manifests / reputation.

## Adoption signals

- ≥10 third-party decoders published within 12 months.
- ≥1 decoder of each kind in the taxonomy ships in reference.
- A single SSE stream with 5+ parallel decoders demonstrated in a public talk / paper.
- LLM agents authoring scenes via emit-side decoders at ≥1 Hz end-to-end.
