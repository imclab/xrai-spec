# XRAI Runtime Evaluation — NOT LOCKED

**Status:** Draft scorecard. **Do NOT lock in a runtime choice as "canonical for scenario X" from this doc alone.** Lock after (a) each criterion is triple-verified on the runtime, (b) a real demo scene runs end-to-end, (c) scale + debug + extension paths are exercised. This doc is the scoreboard that informs the lock decision — not the decision itself.

Companion to [`RUNTIMES.md`](./RUNTIMES.md) (shipped-state positioning).

---

## Objectives to meet (from user directive 2026-04-22)

Every candidate runtime is evaluated against these eight criteria. A runtime passing 8/8 can be locked; one passing 6-7 is a conditional adopt; one passing ≤5 stays a stub or gets dropped.

| # | Objective | Why it matters |
|---|---|---|
| **O1** | **Cross-platform: iOS + Android + macOS browser + Windows browser + Apple Vision Pro + Quest/Android XR** | Portals is platform-agnostic by architecture (XXX spec § Core Principle). A runtime that locks to one OS violates the thesis. |
| **O2** | **Modular** — can swap pieces without rewriting | "Hot-swappable" is in XXX spec § Architectural DNA. Renderer, physics, audio, AI must be independently replaceable. |
| **O3** | **Scalable** — scenes with 2000+ entities at 60 FPS, streaming worlds | Portals v4 ships 60 FPS @ 2000 entities (CVPR paper § 4). Anything less is a regression. |
| **O4** | **Easy to debug** — good errors, source maps, DevTools, reproducible failures | `feedback_perf_debug_balance.md`: perf and debug are BOTH top priorities, never conflict. Runtimes that strip logs or obscure errors fail this. |
| **O5** | **Easy to extend** — add new entity types / components / renderer hooks without a fork | New extensions land as XRAI RFCs; runtimes must absorb them without rebuild. |
| **O6** | **Hand tracking** — WebXR Hands API (web) or native (iOS/Unity/visionOS/Quest) | jARvis vision + Sight Triad "embodied" pillar require body-first input, not thumb-tapping. |
| **O7** | **jARvis integration** — MCP-compatible agent path or equivalent tool-use interface | Agent swarm must author/query/evolve XRAI scenes per constitution § Mission. |
| **O8** | **Multiplayer** — LiveKit (primary) / Normcore (Unity fallback) / WebRTC integration | Spec 010 LiveKit decision. "Across minds" Sight Triad pillar requires federated presence. |
| **O9** | **Cross-runtime parity** — same XRAI doc renders visually-equivalent assets / models / VFX / shaders / generative worlds / location-based settings across every adopted runtime | Directive 2026-04-22: "parity with most if not all xrai encoded concepts, resulting in same or similar as possible." Without parity, the spec fragments — "XRAI scene" means different things in different engines. |

**Legend for scoring:**
- ✅ verified working today (cite evidence path)
- ⚠ claimed-supported but not verified in Portals context
- 📋 needs testing before claim
- 🔴 not supported / hard fork required
- — N/A for this runtime

---

## Scorecard (as of 2026-04-22)

| Runtime | O1 cross-platform | O2 modular | O3 scalable | O4 debug | O5 extend | O6 hand | O7 jARvis | O8 multiplayer | O9 parity | Lock status |
|---|---|---|---|---|---|---|---|---|---|---|
| **Unity + UnityGLTF + Paint** | ✅ iOS ✅ visionOS via UAAL ⚠ Android ⚠ Quest 🔴 web | ✅ Bridge + SceneComposer modular (spec 001) | ✅ 60 FPS / 2000+ entities (CVPR paper) | ✅ Unity Profiler + ARDebugOverlay + FPSAnchor + bridge logs | ✅ ComponentRegistry + ObjectAnimator + WireSystem | ✅ HoloKit (iOS) + Sentis (Editor) | ⚠ MCP-adjacent via GeminiChatBridge; agent-swarm wiring pending | ✅ LiveKit (spec 010); Normcore fallback | ✅ reference baseline — parity is measured *against* Unity output | **🟢 LOCK CANDIDATE for Portals-side iOS/visionOS; NOT for web** |
| **Plain Three.js** | ✅ every WebGL browser ⚠ WebXR in VP Safari waits for Apple | ✅ Three.js scene-graph modular | ⚠ 2000+ entities needs InstancedMesh + LOD; untested at scale | ✅ source maps + Chrome DevTools | ✅ `loadXRAI(opts.on*)` callback extension | 📋 WebXR Hands API — wiring pending | ⚠ MCP→Three.js round-trip not end-to-end yet | 📋 LiveKit web SDK integration pending | 📋 primitive/material/animation parity vs Unity — visual-diff test pending | **🟡 LOCK for v1.0 public parse/render ONLY; O3/O6/O7/O8/O9 pending** |
| **PlayCanvas** | ⚠ WebGL browsers + desktop editor | ⚠ ECS; adapter path untested | ⚠ proven in games; XRAI-shape untested | ⚠ profiler + browser debugger | ⚠ `pc.Script` extends; 🔴 no adapter | 📋 WebXR support; Portals path untested | 📋 MCP untested | 📋 Colyseus/Hathora; untested | 📋 parity vs Unity untested | **🔴 NOT LOCKED — stub** |
| **Needle Engine** | ✅ every browser ✅ visionOS Safari WebXR 🔴 no UAAL | ⚠ Unity-authored → web export | ⚠ untested at Portals scale | ⚠ Unity Inspector + DevTools | ⚠ Unity-component extension; 🔴 no adapter | ✅ WebXR Hands + Unity authoring | 📋 MCP untested | 📋 Networking sample; XRAI untested | 📋 closer to Unity parity (shares authoring); but no adapter to measure | **🔴 NOT LOCKED — strong web+VP hedge candidate** |
| **Unreal** | ⚠ iOS/macOS/Win/VP builds possible 🔴 heavy to embed | ⚠ heavy runtime | ✅ AAA rendering | ⚠ Unreal Insights | ⚠ plugin system; 🔴 no adapter | ⚠ OpenXR | 📋 MCP untested | 📋 built-in replication | 📋 parity vs Unity untested (shader/VFX differ significantly) | **🔴 NOT LOCKED — deferred** |
| **visionOS RealityKit (native)** | ✅ visionOS 🔴 Apple-only | ⚠ RealityKit ECS | ✅ Apple Metal | ✅ Xcode Instruments | ⚠ custom components; 🔴 no adapter | ✅ ARKit HandAnchor | 📋 MCP on device untested | 📋 GroupActivities/SharePlay | 📋 parity with Unity rendering unverified (Material/URP differences) | **🔴 NOT LOCKED — HEDGE-VISIONOS-01 trigger** |

---

## Readiness gates before LOCKING any runtime as "canonical for scenario X"

No runtime is locked until ALL 8 gates pass:

1. **Conformance:** runtime passes `scripts/xrai_conformance_run.sh` on all v1.0 fixtures (`runtimes/_conformance/results/<name>.ok`).
2. **O3 scale test:** a scene with 2000 entities (matching CVPR paper baseline) runs at ≥ 30 FPS on the target's mid-tier hardware (iPhone 14 Pro for mobile, MacBook Air M3 for desktop, Vision Pro for visionOS, etc.). Evidence recorded in `memory/perf/`.
3. **O6 hand-tracking demo:** a gesture spawns / moves an XRAI entity end-to-end. Recorded video, not code screenshot.
4. **O7 jARvis demo:** an MCP tool emits an XRAI fragment; the runtime loads + renders it without human hand-editing. Recorded video.
5. **O8 multiplayer demo:** two clients of the same runtime see the same XRAI scene synced via LiveKit. Recorded video (split-screen).
6. **Debug proof:** a deliberate malformed fixture produces a clear error in the runtime's console (not silent failure).
7. **Extend proof:** add a hypothetical `object.test-primitive` entity type, verify preserved-on-round-trip without runtime rebuild.
8. **O9 parity proof:** the runtime renders each v1.0 conformance fixture close-enough to Unity reference that a **visual-diff tool** (see [§ Parity measurement](#parity-measurement) below) reports perceptual-distance < 0.10 (PSNR + SSIM + color-histogram delta). Three side-by-side reference screenshots per fixture committed to `runtimes/_conformance/parity/<runtime>/<fixture>.png`.

A runtime that passes 8/8 gates gets locked in RUNTIMES.md § "shipping matrix" with a concrete ✅ + date.

## Parity measurement (O9)

**Rule:** the same XRAI doc MUST produce visually-equivalent rendering across adopted runtimes. Without this, "XRAI scene" means different things on different engines — the spec fragments.

**What gets measured per-fixture:**

| Category | Parity bar | Measurement tool |
|---|---|---|
| **Primitive assets** (cube/sphere/cylinder/capsule/plane) | Within 5% of Unity reference by bounding-box + color-histogram | reference screenshot diff, 1024×1024 stationary camera |
| **GLB models** (`object.glb`) | glTF spec compliance handles this automatically (any glTF-conformant loader renders identically modulo shading) | glTF-Sample-Assets cross-loader test suite |
| **Material presets** (shiny / glass / neon / chrome / gold / silver / wood / hologram) | Perceptual hash distance < 0.15 from Unity URP reference | pHash + color-histogram |
| **VFX** (`object.hologram`, `object.emitter`, audio-reactive strokes) | Shape + density + color-band match within 10% for 2-second rendered clip | OpenCV optical-flow + color-density comparison |
| **Shaders** (filter.neural presets, brush shaders) | Same semantic intent (Ghibli-look, glitch-look); tolerance wider due to neural-net variance | human eval panel on reference test-set |
| **Generative worlds** (XRAI_generators.*, object.parametric-stroke) | Same seed → same control-point sequence within tolerance; visual output matches ±15% bounding volume | deterministic seed replay + geometric comparison |
| **Location-based** (AR anchors, geospatial origin) | Same world-coordinate placement; hologram sits in same relative position | anchor-frame coordinate diff (units: meters) |

**Parity harness (RFC 0004 candidate):** a follow-up RFC will spec the visual-diff tool. v0 is manual screenshot comparison in the PR.

**Parity is NOT pixel-perfect.** Different renderers have different lighting models, different AA, different color spaces. The bar is **perceptual equivalence**, not bit-identical. A neon-blue sphere in Unity and in Three.js should be recognizably the same; exact hex can differ within perceptual tolerance.

**What BREAKS parity (hard refuse):**
- Renderer substitutes a proprietary shader preset that isn't in the XRAI spec
- Renderer silently drops unknown entity types instead of preserving them
- Renderer normalizes positions to a different world-up axis without declaring it
- Renderer caches stale assets past a versioned reload

---

## Today's locked set (honest)

- **Unity (canonical engineering)** — ✅ locked FOR PORTALS-SIDE iOS DEPLOYMENT ONLY. The CVPR paper numbers (60 FPS on iPhone 14 Pro, 2000+ entities, hand tracking via HoloKit, LiveKit multiplayer) are all device-verified. Lock date: 2026-04-10 (paper submission).
- **Plain Three.js adapter v0.1.0-alpha** — 🟡 locked FOR MIT PUBLIC REFERENCE at `runtimes/threejs/`, **ONLY for v1.0 parse + render of the 4 example fixtures**. NOT locked for scale / hand / jARvis / multiplayer — those still need gates 2/3/4/5.
- **All other runtimes** — 🔴 NOT LOCKED. Stubs exist; adapters + conformance + scale tests pending.

---

## What this means for launch (2026-04-29)

- **Public launch claim:** "Reference Three.js adapter validates v1.0 XRAI portability — Unity reference implementation shipping at CVPR-paper scale." Honest, evidence-backed.
- **Do NOT claim:** "Any XRAI doc runs on any runtime at Portals scale" — we haven't proven it beyond Unity.
- **Do claim in RFC 0003:** "Conformance suite is the mechanical gate; any runtime passing the harness can claim v1.X compatibility."

Locking happens via a follow-up RFC once the gates are met. Not before. Per user directive: *"triple verify & lock in once we see all is working & scalable & meets objectives."*

---

## Update cadence

Re-score quarterly or after any significant runtime delivery (new adapter, scale test, major demo). Every re-score commit updates this doc + the lock-status column. Honest marks beat aspirational marks — the point of this doc is to NOT kid ourselves before locking.
