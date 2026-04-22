# XRAI Versions — compatibility matrix

SemVer with strict backwards-compatibility within major: MAJOR.MINOR.PATCH.

- **MAJOR** — breaking schema change (new required field, removed type, altered semantics). Requires migration guide.
- **MINOR** — additive-only: new optional fields, new entity/relation types, new events. v1.X documents remain valid as v1.Y ships (Y ≥ X).
- **PATCH** — docs, typos, clarifications, non-normative examples. Zero schema change.

## Shipped + planned

| Version | Status | Ship date | Scope |
|---|---|---|---|
| **v1.0** | ✅ Shipped | 2026-04-29 | Scene-level spatial composition. Entity primitives (cube/sphere/cylinder/capsule/plane/glb/hologram/light/emitter/wire-source). Binary relations (`parent-of`, `wire-binds`, `reacts-to-audio`, `tracks`). Event stub. MIME `application/vnd.xrai+json`. URI scheme `xrai://`. |
| **v1.1** | 🚧 Draft | target 2026-Q3 | Event primitives (RFC 0001 — `validFrom`/`validTo`, causal chains via `causedBy`/`causes`, counterfactual `branch`, multi-actor `actors[]`). Typed n-ary hyperedges (RFC 0002 — replaces binary relations, additive). Conformance test corpus (RFC 0003). Validator CLI. |
| **v1.2** | 📋 Planned | target 2027-Q1 | Event-stream format `.xrai.jsonl` for live/append-only scenarios. Signed events (crypto provenance, optional). `XRAI_generators.*` extensions promoted (paint_parametric / world_parametric). Federated query `xrai-fed://`. |
| **v2.0** | 🔭 Future | TBD | Breaking changes bundled: personal/shared namespaces, cryptographic graph provenance, federated queries. Will require migration guide + one-line sed-compatible migration where feasible. |
| **v2.1** | 🔭 Future | TBD | Node embeddings + analogy retrieval; PageRank-style salience. |
| **v3.0** | 🔭 Future | TBD | Self-referential schema; meta-layer events ("the graph noticed X"). |

## Engineering spec v2.0 (Portals-internal, parallel track)

The **v2.0 engineering spec** (`specs/XRAI_FORMAT_SPECIFICATION_V2.md` in the Portals monorepo) is glTF 2.0-based with the `XRAI_core` extension. It is the canonical runtime format Portals emits. The public v1.0 on this site is a **pedagogical JSON subset** of the same underlying format.

**Compatibility rule:** every v1.0 JSON document is a valid v2.0 scene wrapped in a glTF envelope. The engineering and public specs guarantee the same normative behavior for the shared subset (entities, relations, transforms, materials, animations).

## Runtime compatibility (conformance-validated)

| Runtime | v1.0 | v1.1 | v2.0 eng |
|---|---|---|---|
| **Unity (Portals canonical)** | ✅ | 📋 waiting for v1.1 ship | ✅ canonical |
| **@xrai/threejs-adapter v0.1.0-alpha** | ✅ 4/4 conformance | 🚧 | 🔴 not impl |
| **PlayCanvas** | 🔴 stub | — | — |
| **Needle Engine** | 🔴 stub | — | — |
| **Unreal** | 🔴 stub | — | — |
| **visionOS RealityKit** | 🔴 stub | — | — |

Legend: ✅ passing conformance · 🚧 in-progress · 📋 planned · 🔴 stub/not-started

Conformance markers live in `runtimes/_conformance/results/`. Run `scripts/xrai_conformance_run.sh` (in Portals monorepo) to re-score. See [RUNTIMES_EVALUATION.md](./RUNTIMES_EVALUATION.md) for the 9-objective + 8-gate framework.

## Backwards compatibility guarantees

**v1.X stability (shipped):** documents authored against v1.0 remain valid v1.1+ documents. Unknown fields are preserved on round-trip per Postel's law (see `SPEC.md § Conformance`).

**v1 → v2 migration (future):** a v1 → v2 migration tool ships alongside v2.0. For the common subset, migration is a glTF-envelope wrap. Breaking changes at v2.0 will have one-line `xrai-migrate v1-to-v2 <file>` automation.

**v2.0-only features on v1 runtimes:** v2.0 features that aren't expressible in v1.0 JSON (e.g., binary paint strokes at 32 bytes/point) will degrade gracefully — v1 runtimes will skip the binary payload, keep the rest.

## Deprecation policy

- Features marked deprecated in version N are removed in version N+2 at earliest (minimum 1 year support).
- Deprecations are announced in CHANGELOG.md with a migration path.
- No silent removals. Ever.

## Release cadence

- MINOR versions: 1–2 per year, driven by merged RFCs.
- PATCH versions: on demand (typos, clarifications).
- MAJOR versions: every 2–3 years at most. Stability is a feature.

## How to cite a version

- In code / manifests: `"xrai_version": "1.0"` (MAJOR.MINOR only — PATCH is non-normative)
- In prose / papers: "XRAI v1.0" or "XRAI v1.0 (Tunick 2026)" with the CITATION.cff entry
- In bug reports: include the git commit SHA of the spec you're implementing against
