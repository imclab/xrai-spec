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

## Universal encode / decode (new)

Ships at `js/xrai-core.js` + `js/adapters/`. 12 adapters today — every one is a single `async (input) → xrai doc`:

| adapter | input | produces |
|---|---|---|
| `webpage` | URL or HTML | `object.web-container` + headings as subtree |
| `wikipedia` | article title | concept root + 24 linked concepts |
| `arxiv` | paper ID | concept + author people + abstract |
| `twitter` | `@handle` (+ bearer) | person root + up to 50 follows |
| `linkedin` | profile slug | person stub (OAuth required for full) |
| `calendar` | .ics text | event entities + temporal events |
| `github-repo` | `owner/repo` | code-repo + 80 file modules |
| `github-commits` | `owner/repo` | commits + history events |
| `code-deps` | package text | package + dependency nodes |
| `markdown-spec` | markdown | file root + section concepts |
| `test-workflow` | `{name,steps[]}` | suite + pass/fail events |
| `concept-graph` | free-form | concepts + edges |

Registered via `registerAdapter(name, fn)` — add your own by dropping a file in `js/adapters/` and importing it. Every adapter produces a valid v1.0 XRAI doc (round-trip-stable).

## Mini pipeline editor (new)

Lives at [`configs.html`](./configs.html). 2D SVG node editor, no deps. Nodes are **adapters · transforms · renderers · sinks**; wires carry XRAI docs between them. Pipelines save as `.pipeline.json`.

Surfaced in three places:
- **Web:** `configs.html` directly
- **Portals iOS app:** via `src/services/xrai/XraiWebBridge.ts` → embeds the configs URL in a `<WebView>` with postMessage bridge for docs
- **Unity editor:** Pipelines tab in `PortalsTestHub` (`Window > Portals > Test Hub`) → XRAI Modules foldout → watches `Temp/xrai-inbox/*.xrai.json` for pipeline output

## Portals iOS / Unity consumption

Same modules, three transports:

1. **ESM inline (iOS)** — `src/services/xrai/XraiWebBridge.ts` re-exports the core types and `newScene`/`validate`. RN screens can build XRAI docs without a WebView.
2. **WebView (iOS)** — `XraiWebBridge.webBridgeInject()` + `injectXraiDoc(doc)` let the RN app post docs into the live xrai.dev graph and receive pipeline results back.
3. **Unity Editor** — `XraiHubTab.cs` renders the Pipelines foldout with a URL bar + inbox watcher. Pipeline "sink" `download` files dropped in `Temp/xrai-inbox/` auto-load.

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

## WebGPU ECharts hypergraph — v2 upgrade path (research note)

**Inspiration:** Keijiro Takahashi's WebGPU experiments ([keijiro/WebGPU samples on GitHub](https://github.com/keijiro)) — particle audio-reactive systems, globe visualizations, and compute-shader force simulations. Plus the Portals sibling project [MetavidoVFX](https://github.com/imclab/metavidovfx) which pioneered the depth + stencil + audio + ML-pose shared compute substrate used in the CVPR paper.

**Target:** replace 3d-force-graph with a native WebGPU compute-shader force solver + ECharts `graphGL` styling, rendering typed glyphs as GPU-instanced sprites instead of per-node CanvasTexture sprites (current approach).

**Benefits of the upgrade:**

1. **100K+ node budget** — compute shaders calculate force iterations in parallel on the GPU. Current CPU-bound d3-force caps at ~2K interactive.
2. **Keijiro-style ambient field** — a WebGPU particle background that reacts to node hover/click (same audio-reactive pattern MetavidoVFX uses for holograms), giving the viewer the "jARvis HUD of the future" feel the brand calls for.
3. **Typed glyph textures** — a single sprite-atlas texture holds all 9 glyphs (▦ ◆ ◇ ○ ▲ ● ⬡ ⬢ ▤). GPU-instanced draws render 10K glyphs per frame with no CPU cost.
4. **Hyperedge geometry** — n-ary relations (RFC 0002) can be rendered as shaded polygons connecting N participants, instead of forcing binary-edge decomposition.
5. **Live feed integration** — Portals-app scene authoring streams XRAI deltas over LiveKit (spec 010); a WebGPU viewer can ingest + re-layout 60fps as scenes evolve.

**v1 status (this release):**
- Typed glyph taxonomy ✅ shipped (sprite-rendered via CanvasTexture, not WebGPU yet)
- Always-visible labels ✅
- Live feed hook ✅ stub (tries `/api/portals-feed.json` on load, silent-fail if 404)
- Per-type color coding ✅ from Portals canonical palette + spec 024 semantics
- WebGPU compute-shader force solver 🔴 v2 (future RFC)
- Keijiro-style particle ambient 🔴 v2
- Hyperedge rendering 🔴 blocked on RFC 0002 ship

**RFC candidates from this section:**
- **RFC 0004** — visual-diff conformance harness (parity measurement per RUNTIMES_EVALUATION O9)
- **RFC 0005** — multiplayer delta protocol (LiveKit XRAI-delta shape)
- **RFC 0006** — `object.graph-node` entity type (graph-as-document self-reference for save/load)
- **RFC 0007** — `portals://` URL scheme + deep-linking
- **RFC 0008** *(new)* — WebGPU ECharts hypergraph renderer (covers all 5 upgrade benefits above)

This matches **spec 006 KB Visualizer § Platform renderers:** R3F (mobile), 3d-force-graph (web), Needle (visionOS), ECharts-GL (analytics), Mermaid (docs) — adopting the existing decision.

---

## Input modalities — voice, hands, head, touch

Every viewer surface supports a layered input stack. Users opt in per modality.

| Modality | How | Where | Status |
|---|---|---|---|
| **Touch / mouse** | OrbitControls via 3d-force-graph | every browser | ✅ always on |
| **Voice** (`hey jarvis`) | Web Speech API `SpeechRecognition` + `speechSynthesis` → `resolveQuery` → camera fly + HUD | Chrome/Edge/Safari desktop + iOS Safari 14.5+ | ✅ `js/jarvis-web.js` |
| **Hand nav (webcam)** | MediaPipe HandLandmarker via CDN (dynamic import) → pinch → raycast + click; two-hand spread → zoom | desktop webcam only (fine-pointer check) | ✅ `js/hands-web.js` (opt-in) |
| **Hand nav (WebXR)** | WebXR hand-input API during immersive-ar/vr session | Quest browser, visionOS Safari once Apple unlocks WebXR-AR | 🚧 stub — activates inside immersive session |
| **Head pose** | WebXR `viewerSpace` transforms; drives LiveKit presence (avatar head) | Quest / visionOS native / AR Foundation on iOS | 🚧 multiplayer integration only |
| **Gaze** | Quest / visionOS eye-tracking (`'eye-gaze'` feature) | Quest Pro, Vision Pro | 🚧 experimental |

**Design principles:**

1. **Voice first, touch never removed.** Every voice command has a touch equivalent. Users on quiet trains or with disabilities are not second-class.
2. **Hand nav is additive.** Enabling hands never disables touch or voice. Pinch = click; touch-tap still works.
3. **Privacy signals are mandatory.** Mic on = visible dot. Camera on = live preview thumbnail. Never hide them.
4. **Latency budget:** wake-word detect < 100ms, pinch detect < 50ms, touch-tap < 16ms. All local; no server round-trip in the input path.

### Hand gestures (v0)

| Gesture | Effect |
|---|---|
| Pinch (thumb-tip to index-tip, one hand) | Click — raycasts to nearest node on screen |
| Two-hand spread → wider | Zoom out |
| Two-hand spread → narrower | Zoom in |
| Open-palm swipe horizontal | Orbit (future) |
| Point + hold | Hover preview (future) |

Inspired by Google AI Studio hand-tracking prototypes + Portals spec 007 (HoloKit iOS native + Sentis editor webcam). v1 adds per-fingertip particle trails per Keijiro WebGPU demos — lands with the WebGPU ECharts hypergraph renderer (RFC 0008).

---

## Multiplayer transport — LiveKit (spec 010)

Per **spec 010 Multiplayer Normcore → LiveKit decision (2026-03-05)** + **spec 003 Hologram Telepresence Phase 2**. LiveKit is the unified transport for cross-platform.

Cross-surface interop: the **same room ID works from the Portals iOS app AND xrai.dev browsers**. LiveKit server is `wss://portals-dev.livekit.cloud` (shared between `src/services/livekit/LiveKitService.ts` on iOS + `js/live-web.js` on web).

**Flow (automated room creation + sharing):**

1. User clicks **invite** — `js/live-web.js` generates a room ID if none in URL, mirrors to `?room=<id>`, copies the URL via `navigator.share` (mobile) or `navigator.clipboard` (desktop).
2. Second user visits the URL → room ID already in URL params.
3. Either user clicks **live** — module:
   - tries `/api/livekit-token?room=<id>&identity=<uuid>` for automatic token (Cloudflare Worker stub)
   - on miss, prompts for server URL + paste-token (same pattern as `web/rgbd-viewer`)
4. LiveKit WebRTC:
   - **Video tracks** — published when user toggles local camera; subscribed from remotes, rendered in bottom-left corner tile (240×160)
   - **DataChannel topics**:
     - `xrai-delta` — scene edits (same message shape as spec 001 bridge types: `add_object`, `update_transform`, `modify_objects`, `save_scene`)
     - `presence` — head pose + hand landmarks (MediaPipe or WebXR)
     - `voice` — push-to-talk audio (LiveKit handles natively)
5. Each client's renderer applies the delta locally → renderer-agnostic: PlayCanvas client + Three.js client see the same scene.

**Reference patterns:**

- **Record3D → Portals** — [`MetavidoLiveARKit/LiveARKitFeeder.cs`](../../../../unity/Assets/Imported/MetavidoLiveARKit/Runtime/LiveARKitFeeder.cs) streams RGBD + `cameraParams` over LiveKit DataChannel, decoded via `HueDepthCodec` in `web/rgbd-viewer/src/` — proven end-to-end on CVPR paper
- **Needle multiplayer** — WebRTC + sample rooms pattern (share transport API shape)
- **PlayCanvas collaboration** — session-based multi-user sync with URL room IDs

**Live hologram mode (v1 upgrade — RFC 0005 scope):**

Reuse the existing `web/rgbd-viewer/src/RGBDPointCloud.ts` + `HueDepthCodec.ts`. When a participant publishes an RGBD video track (iOS ARKit on Portals app, or browser webcam + ONNX depth), other participants' `js/live-web.js` switches the corner tile to a full-scene hologram reconstruction. Backed by the Portals compute substrate (CVPR paper § 2).

**Scene import / edit / save / share — the shared editor loop:**

Any participant can:
- **Import** — drag an `.xrai.json` file onto the graph → hydrates nodes → `xrai-delta` broadcasts to all participants
- **Edit** — drag a node, type a voice command, pinch a hand-tracked node → local change → delta broadcast
- **Save** — `save` button in topnav exports current graph as `.xrai.json` (already implemented)
- **Share** — `invite` button generates `?room=<id>` URL → new participants join immediately

**Current state (this release):**

- ✅ `js/live-web.js` shipped — LiveKit browser client with auto-room, paste-token fallback, corner video tile, DataChannel pass-through
- ✅ Invite button auto-creates room + copies URL via `navigator.share` or clipboard
- ✅ Live button opens connect flow; on connect, shows remote video tiles
- 🚧 Token-signing endpoint (`/api/livekit-token`) — Cloudflare Worker TBD
- 🚧 RGBD hologram reconstruction in the corner tile — port from `web/rgbd-viewer/`
- 🚧 Head + hand pose broadcast — MediaPipe / WebXR landmarks over DataChannel
- 🚧 Record3D iOS client interop — match `cameraParams` topic shape exactly

**Security note:** all multiplayer deltas are validated against XRAI schema before apply. No arbitrary code execution path. See [SECURITY.md § Threat model](./SECURITY.md).

---

## Multiplayer presence — heads + hands + scenes

**When LiveKit ships** (per spec 010 + spec 003 Phase 2), every connected participant broadcasts:

- **Head pose** (3D position + quaternion) — rendered as a typed `person` node with photo or avatar glyph; participant appears in the shared graph
- **Hand poses** (both hands, 21 joints each if WebXR; wrist + fingertip if MediaPipe) — visible in-scene to other participants
- **Voice audio** — spatial-audio panned per head position
- **Cursor / gaze** — where the participant is looking in the graph
- **Authored entities** — any XRAI edits they make stream as delta messages

**Shared scene editing:**

Each participant can:
1. **Import an XRAI scene** — drag-drop / file-picker loads a `.xrai.json` into the shared graph; other participants see it appear in real time
2. **Edit** — move a node (drag), add an entity (voice command or click toolbar), delete (select + Del), link (drag from one node to another)
3. **Save** — current scene state → download + optionally publish to a shared URL
4. **Share** — copy invite URL with `?room=<id>` → new participants join the same scene

**Live hologram mode:**

Participants with AR-capable devices (Portals app iOS / visionOS Safari WebXR / Quest) can toggle "hologram" mode:
- Their head + hands render as volumetric VFX in other participants' views
- Backed by Portals' hologram pipeline (per CVPR paper § 2, 360+ VFX on shared compute substrate)
- LiveKit carries the depth + stencil + audio channels

**Privacy:**

- Head/hand broadcasting is **opt-in per session**. Default: local only.
- Voice broadcasting is **opt-in per turn** (push-to-talk by default inside rooms).
- Guests (no account) broadcast as anonymous head-pose only; full participation requires identity.

This layer is stubbed today — the `invite` button in the topnav generates `?room=<id>` URLs, and the `hydratePortalsFeed()` loop fetches `/api/portals-feed.json` for pre-populated participants. Full transport lands with RFC 0005 (multiplayer delta protocol).

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
