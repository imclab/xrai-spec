# RFC 0004: Relation types + runtime semantics

- **Status:** Draft
- **Author:** @jamestunick
- **Date:** 2026-04-22
- **Target version:** v1.0 (normative binding) / v1.1 (n-ary upgrade per RFC-0002)

## Summary

SPEC v1.0 declares four relation types — `parent-of`, `wire-binds`, `reacts-to-audio`, `tracks` — but does not fully specify runtime semantics. This RFC pins the semantics + reference-implementation expectations so every v1.0-conformant runtime exhibits the same observable behavior.

## Motivation

The [pre-launch read-through 2026-04-22](../_LAUNCH_READTHROUGH_2026-04-22.md) (pre-launch audit, kept private) flagged that the SPEC's "normative source of truth = running Portals runtime" claim is inconsistent with these four relation-type names appearing in runtime C# / TS code 0 times. Either:
- (a) ship runtime pass-through + semantics before 2026-04-29 launch, or
- (b) acknowledge the declarative status in the SPEC and queue the runtime work as this RFC.

Option (b) chosen. This RFC is the queue entry.

## Relation semantics (normative draft)

| Type | Meaning | Semantics at render time |
|---|---|---|
| `parent-of` | Entity `from` is the transform parent of entity `to` | Renderer MAY reparent `to`'s transform under `from`; at minimum must preserve the relation on round-trip |
| `wire-binds` | Output property of `from` drives an input property of `to` (Portals Wire System) | Runtime with Wire support invokes the reactive binding; runtime without MAY log + preserve |
| `reacts-to-audio` | Entity `to` reacts to audio source `from` (amplitude, bands) | Runtime with audio + VFX Graph bindings applies audio properties; others preserve |
| `tracks` | Entity `to` tracks position/rotation of `from` (e.g. face / hand anchor) | Runtime with tracking support applies the tracking; others preserve |

## Reference implementation plan

- **C# (Portals Unity runtime):** `SceneComposer.AddRelation(type, from, to, props)` stores in `_relations` dict; each relation type delegates to an existing subsystem:
  - `parent-of` → `Transform.SetParent`
  - `wire-binds` → `WireSystem.AddWire`
  - `reacts-to-audio` → `VFXARBinder._audioSource = from`
  - `tracks` → `TrackingProvider.Bind(from, to)`
- **TS (RN / XraiWebBridge):** emit `{type, from, to, props}` objects into `relations[]` on serialize; no-op on deserialize yet
- **Conformance test:** round-trip a 4-entity 4-relation doc through each runtime; every relation present after the round-trip (per §4 conformance clause)

## Parking lot

- N-ary hyperedges (RFC-0002) supersede binary relations in v1.1. This RFC's binary form stays valid as a subset.
- Event-triggered relations (e.g. "on `tap`, wire-binds fires") deferred to RFC-0001 event primitives.

## Acceptance criteria

- [ ] Portals runtime implements the 4 types (see Ref impl plan) — target 2026-05-17 (TestFlight cut)
- [ ] 1 example XRAI doc per relation type in `examples/`
- [ ] Conformance test in `runtimes/_conformance/` passes on ≥2 runtimes
- [ ] SPEC.md drops the pending-RFC note once runtime ships (reverse of 2026-04-22 edit)

## References

- `SPEC.md:75` — v1.0 relation declaration
- `_LAUNCH_READTHROUGH_2026-04-22.md` — pre-launch finding 1
- `RFC-0002 — Typed N-ary hyperedges` — future upgrade path
