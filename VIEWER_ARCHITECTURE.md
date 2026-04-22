# XRAI Viewer — hybrid architecture

**Goal:** one XRAI document renders consistently across every platform (iOS / Android / macOS / Windows / visionOS / Quest), through any of N rendering engines, with live multiplayer + XRAI file I/O + WebAR entry, all without vendor lock.

**Per-engine parity** is enforced by the 8 lock gates in [`RUNTIMES_EVALUATION.md`](./RUNTIMES_EVALUATION.md) — no engine lands in the default viewer until it passes conformance + O9 parity.

---

## Four layers

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DATA LAYER                 XRAI v1.0 JSON (canonical)       │
│                                Load/save via File API + fetch   │
├─────────────────────────────────────────────────────────────────┤
│  2. LAYOUT LAYER               Graph / hypergraph / scene       │
│     Options:                   d3-force · ECharts-GL ·          │
│                                WebGPU compute (experimental)    │
├─────────────────────────────────────────────────────────────────┤
│  3. RENDERING LAYER            Engine-per-target:               │
│                                3d-force-graph (web default) ·   │
│                                PlayCanvas (PBR + WebXR) ·       │
│                                Needle (Unity → web, visionOS) · │
│                                Icosa (AR viewer + Gallery) ·    │
│                                Three.js + WebGPU (perf)         │
├─────────────────────────────────────────────────────────────────┤
│  4. TRANSPORT LAYER            LiveKit (primary per spec 010) · │
│                                WebRTC DataChannels · WebSocket  │
└─────────────────────────────────────────────────────────────────┘
```

Each layer swaps independently. Changing the renderer doesn't change the data. Changing the transport doesn't change the layout.

---

## Engine-per-target matrix

| Target | Primary engine | Fallback | Rationale |
|---|---|---|---|
| **iOS Safari** (iPhone / iPad) | 3d-force-graph | PlayCanvas | WebGL works; WebXR unlocks when Apple ships Safari WebXR-AR |
| **Android Chrome** | PlayCanvas | 3d-force-graph | WebXR mature; PlayCanvas has best perf-per-watt on mid-tier Android |
| **macOS browser** | 3d-force-graph | WebGPU + Three.js | Best DPR / perf for data-dense graphs |
| **Windows browser** | Same as macOS | — | WebGPU has broad Win support via Chrome/Edge |
| **visionOS Safari** | Needle Engine | 3d-force-graph | Needle has native visionOS Safari WebXR-AR (the critical Apple-glasses hedge per spec 015) |
| **Meta Quest browser** | Needle OR PlayCanvas | — | Both support Quest WebXR; pick per user preference |
| **Portals native (iOS)** | Unity (canonical) | — | Via `portals://` URL scheme — opens the XRAI in the Portals app for full VFX pipeline |

**Icosa AR viewer** is a CONSUMER of XRAI, not an engine: our `object.glb` / `object.tilt` entities publish to Icosa Gallery; their viewer renders the glTF/tilt payload. XRAI adds the relational + temporal metadata on top. See [RUNTIMES.md § What Icosa IS and IS NOT](./RUNTIMES.md).

---

## Layout layer choice — 3d-force-graph today, ECharts-GL + WebGPU tomorrow

**Why 3d-force-graph for launch:**
- ~5KB minified, works everywhere with WebGL
- Battle-tested force simulation (d3-force internals)
- Trivial to embed via CDN — zero build step
- Natural fit for XRAI's hypergraph (extending to n-ary hyperedges per RFC 0002 is a future patch)

**Why ECharts-GL for scale:**
- Proven at 10K+ node graphs with interactive filtering/search
- GPU-accelerated via three.js backend
- Apache 2.0 licensed
- Excellent for the "god's-eye view of a research landscape" use case (spec 006 § Developers row)

**Why WebGPU for largest:**
- 100K+ node compute-shader force simulation is only practical on WebGPU
- Chrome + Safari 18 + Firefox (behind flag) have good support
- Enables real-time layout of XRAI scenes that don't fit in 3d-force-graph's budget

**Selection rule:** if `node count < 500` use 3d-force-graph. 500–10K → ECharts-GL. >10K → WebGPU compute (experimental, v1.2 target).

This matches **spec 006 KB Visualizer § Platform renderers:** R3F (mobile), 3d-force-graph (web), Needle (visionOS), ECharts-GL (analytics), Mermaid (docs) — adopting the existing decision.

---

## Multiplayer transport — LiveKit (spec 010)

Per **spec 010 Multiplayer Normcore → LiveKit decision (2026-03-05)** + **spec 003 Hologram Telepresence Phase 2**. LiveKit is the unified transport for cross-platform.

**How it plugs in:**
1. User clicks 👥 Invite — URL encodes `?room=<id>`
2. Second user visits URL → same room
3. LiveKit WebRTC DataChannel carries XRAI deltas (add_entity / update_transform / etc. — same bridge message types as spec 001)
4. Each client's renderer applies the delta locally
5. Renderer-agnostic — PlayCanvas client + Three.js client see the same scene

**Current state:** stub. Invite button + URL routing work; LiveKit transport lands with RFC (to be filed — v1.2 target).

**Security note:** all multiplayer deltas are validated against XRAI schema before apply. No arbitrary code execution path. See [SECURITY.md § Threat model](./SECURITY.md).

---

## XRAI file I/O

**Load (`📂 Load XRAI`):**
- File picker → local JSON → parse → re-init graph
- Minimum validation: `xrai_version` field must exist
- Unknown entity types preserved on round-trip (Postel's law, `SPEC.md § Conformance`)

**Save (`💾 Save XRAI`):**
- Current graph state (nodes + edges) serialized as XRAI v1.0 JSON
- `object.graph-node` entity type (v1.1 candidate — future RFC)
- `parent-of` relations map to visual edges
- Download via Blob URL — zero backend

**Round-trip guarantee:** Load → render → Save produces a semantically-equivalent XRAI document. Byte-identical is not guaranteed (formatting, key ordering may differ), but entity + relation sets match.

---

## Cross-platform viewing paths

| Platform | URL path | Renders via |
|---|---|---|
| `xrai.dev` (default) | `index.html` | 3d-force-graph |
| `xrai.dev?engine=echarts` | `runtimes/echarts/viewer.html` | ECharts-GL |
| `xrai.dev?engine=playcanvas` | `runtimes/playcanvas/viewer.html` | PlayCanvas |
| `xrai.dev?engine=needle` | `runtimes/needle/viewer.html` | Needle Engine |
| `xrai.dev?engine=icosa` | `runtimes/icosa/viewer.html` | Icosa AR (links out to Gallery) |
| **Portals app (iOS)** | `portals://xrai/open?src=<url>` | Unity VFX Graph (canonical) |

When a browser visits `xrai.dev` with a `portals://` URL scheme handler registered (after installing the Portals iOS app), the "📱 Open in Portals app" engine option routes there for full-fidelity rendering.

---

## Related specs in the Portals v4 monorepo

This viewer architecture reuses existing Portals specs — does not invent new requirements:

| Spec | What it covers | Relevance to viewer |
|---|---|---|
| [001 Unity-RN bridge](../001-unity-rn-bridge/spec.md) | 69 typed bridge message types | Same message types carry multiplayer deltas |
| [003 Hologram telepresence](../003-hologram-telepresence/spec.md) | LiveKit integration (Phase 2) | Multiplayer transport for XRAI viewer |
| [004 Scene save XRAI](../004-scene-save-xrai-format/spec.md) | Scene persistence | XRAI load/save semantics |
| [006 KB visualizer](../006-kb-visualizer/spec.md) | R3F / 3d-force-graph / Needle / ECharts-GL + hypergraph primitives | Direct reuse of engine-per-target decisions |
| [010 Multiplayer LiveKit](../010-multiplayer-normcore/spec.md) | Unified transport (spec frozen, LiveKit selected) | Multiplayer layer |
| [014 Web integration](../014-web-integration/spec.md) | Login-gated Viewer/Editor + RGBD hologram web viewer | `viewer.portals.app` (Portals-branded) + this `xrai.dev` (public MIT) share adapter patterns |
| [015 visionOS / Needle](../015-visionos-needle-avp/spec.md) | Needle for visionOS Safari WebXR | Primary engine for visionOS target |
| [022 Universal asset IO](../022-universal-asset-io/spec.md) | Federated asset search + Icosa Gallery | `object.glb` asset references render consistently across engines |

---

## RFCs this architecture implies (future)

- **RFC 0004** — Visual-diff conformance harness (cross-runtime parity measurement per [RUNTIMES_EVALUATION.md § O9](./RUNTIMES_EVALUATION.md))
- **RFC 0005** — Multiplayer delta protocol (formalize LiveKit XRAI-delta message shape)
- **RFC 0006** — `object.graph-node` entity type (for graph-as-document self-reference)
- **RFC 0007** — `portals://` URL scheme + deep-linking semantics

None block v1.0 launch. The viewer ships with stubs for each engine except `force-graph` (fully working). Later engines land as their adapter + conformance markers + parity screenshots drop.

---

## Adoption signals (what we measure)

| Signal | Target by | Meaning |
|---|---|---|
| Non-Portals runtime passes v1.0 conformance | end of Q3 2026 | XRAI parse is portable |
| External XRAI doc loaded via File-API | within 30d of launch | File I/O actually used |
| Cross-engine parity screenshots committed | Q3 2026 | RUNTIMES_EVALUATION O9 gate passing |
| Live multiplayer session (2+ clients) | Q4 2026 | LiveKit transport landed |
| Portals app opens via `portals://` deep-link | launch day | URL scheme registered |

---

## Meta: why a 3D force-graph landing ?

Because the format describes spatial hypergraphs, the landing page **is** an XRAI scene rendering itself. Self-referential. Dogfood. Every doc node is the doc it links to. Every edge is the cross-reference it represents.

When a visitor clicks a node and drills into SPEC.md, they're traversing the same graph structure the spec defines. The medium is the message.
