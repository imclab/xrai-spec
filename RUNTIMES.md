# XRAI Runtimes — positioning + comparison

Short answer to "are we using Needle / PlayCanvas / plain Three.js / Icosa / a blend?":

**We're shipping parallel MIT-licensed adapters, one per major runtime. No blend. No single-runtime lock. Users pick the one that fits their stack.** All adapters pass the same conformance suite (`runtimes/_conformance/`) so XRAI docs are portable across them.

> **Locking discipline:** a runtime is only "locked" as canonical-for-scenario-X after the 7-gate verification in [`RUNTIMES_EVALUATION.md`](./RUNTIMES_EVALUATION.md) passes. Today, only Unity is locked (for iOS — CVPR-paper evidence). Three.js adapter is locked only for v1.0 public-spec parse/render. Everything else is NOT LOCKED. Per user directive 2026-04-22: *"these are important decisions to triple verify & lock in once we see all is working & scalable & meets objectives."*

---

## Shipping matrix (today + near-term)

| Runtime | Role | Status | When you pick it |
|---|---|---|---|
| **Plain Three.js** | **Reference runtime** — smallest, MIT-only, no vendor deps | ✅ shipping — adapter at [`runtimes/threejs/`](./runtimes/threejs/), 4/4 v1.0 fixtures green | Default for web demos, docs, LLM dogfood. Embedded in any Vite/Next site. Zero install beyond `three`. |
| **Unity + UnityGLTF + Paint** | **Canonical engineering runtime** — Portals reference impl, shipping on iOS + targeting visionOS via UAAL | ✅ shipping (`unity/Assets/Scripts/Bridge/SceneComposer.cs`) — this is what CVPR paper's 60 FPS numbers come from | Real AR/VR deployment on mobile + visionOS. Full VFX Graph + Gaussian splat + audio-reactive. |
| **PlayCanvas** | Heavier web runtime — PBR, ECS, editor-first workflow | ⚠ stub README at [`runtimes/playcanvas/`](./runtimes/playcanvas/) | Teams already on PlayCanvas + needing a published editor tool + server-backed scenes. |
| **Needle Engine** | Unity-authored → web export, good WebXR path (browser XR once Apple unlocks Safari) | ⚠ stub at [`runtimes/webxr/`](./runtimes/webxr/) + see `specs/015-visionos-needle-avp/` | Web viewers for visionOS Safari WebXR + iOS Go App Clip. NOT for UAAL-embedded runtimes (Needle can't run embedded). |
| **Unreal** | AAA rendering + XR | ⚠ stub at [`runtimes/unreal/`](./runtimes/unreal/) | High-fidelity desktop/console/VR; teams already on Unreal. |
| **visionOS RealityKit** | Apple-native, full swiftlang | ⚠ stub at [`runtimes/visionos/`](./runtimes/visionos/) | Native visionOS apps beyond Safari WebXR. HEDGE-VISIONOS-01 activation trigger. |

## What Icosa IS and IS NOT

**Icosa is NOT an XRAI runtime.** It's:
- a **Gallery** (publish + discover 3D content — icosa.gallery)
- an **API** (`com.icosa.icosa-api-client-unity`, vendored at `.xrai/MetavidoVFX-main/Packages/` — wraps import + `.tilt ↔ glTF` conversion)
- a **brush library** (`AllBrushes.asset` with 72 Open Brush descriptors — the source we curate Paint-AR brushes from, per `specs/009-paint-ar-openbrush/MIGRATION_PLAN_V2_2026-04-22.md`)

Portals **publishes TO** Icosa Gallery and **imports FROM** Icosa API via XRAI references (`object.glb` / future `object.tilt` entity types). Icosa's own viewer stays on their site — we don't embed it, they don't embed our adapter.

Integration path lives in `specs/009-paint-ar-openbrush/MIGRATION_PLAN_V2_2026-04-22.md § 3 "the 4-layer Icosa divide."`

## Portals' own web surfaces vs xrai-website's reference adapters

These are **different surfaces, both using Three.js under the hood**:

| Surface | Path | Purpose | Branding |
|---|---|---|---|
| **`viewer.portals.app`** | `viewer/` in Portals monorepo | Login-gated Portals Viewer + Editor per spec 014 | Portals-branded |
| **RGBD hologram web viewer** | `web/rgbd-viewer/` | LiveKit + Three.js point-cloud for live hologram streaming | Portals-branded |
| **xrai-website `runtimes/threejs/`** | this directory | Public MIT-licensed reference adapter, open for external adoption | XRAI-neutral |

The Portals-branded viewers can `import` the xrai-website adapter verbatim — it's a superset-compatible MIT loader. Spec 014 has the full positioning.

## Why parallel adapters beats "pick one"

- **Format neutrality.** If XRAI becomes the substrate, it can't be tied to a single rendering stack. Users who already have a Unity shop, a PlayCanvas editor, an Unreal pipeline, or a visionOS native app all deserve a loader.
- **Conformance gate.** `scripts/xrai_conformance_run.sh` runs all v1.0 fixtures through every adapter's CLI. A divergence in one runtime is caught mechanically. This is how glTF stays portable across 50+ renderers.
- **Ecosystem credibility.** "XRAI runs on N engines" is a stronger pitch than "XRAI runs on our engine." The governance-readiness Criterion 2 (≥3 runtimes passing) is the public form of this same bar.

## Strategy per question

- **"Pick one?"** No — parallel MIT adapters.
- **"Blend?"** No — each runtime keeps its own adapter; users pick per-project.
- **"Try each + compare?"** Yes for runtime adopters (see conformance results). We document the shipped set here; third parties can add more.
- **"Icosa?"** Icosa is consumer-side infrastructure (Gallery + import API), not a Portals web runtime target.

## Adding a new runtime

1. Create `runtimes/<name>/` with a `package.json` (if JS/TS) + `src/cli.js` implementing the contract: read XRAI JSON on stdin or file arg, exit 0 on parse success.
2. Write `runtimes/<name>/README.md` with mapping from XRAI entities/relations to your engine's primitives.
3. Run `scripts/xrai_conformance_run.sh --runtime <name>` — it auto-discovers and drops a `.ok` or `.fail` marker in `_conformance/results/`.
4. PR. RFCs (0002, 0003) list the v1.1 additions to expect.

Linked from: [`README.md`](./README.md) Implementation surface, [`FAQ.md`](./FAQ.md), `scripts/governance-readiness.sh`.
