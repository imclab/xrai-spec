# RFC 0010: Archetypes — bundled components + hierarchical entity paths

- **Status:** Draft
- **Author:** @jamestunick
- **Date:** 2026-04-23
- **Target version:** v1.1 (additive-preferred; entity-path hierarchy is additive)
- **Related:** RFC 0002 (hyperedges), RFC 0009 (streaming)
- **Prior art:** Rerun archetypes, glTF 2.0 extensions, Unity ECS, Bevy components

---

## Summary

Promote XRAI entity types from opaque strings (`"object.primitive"`) to declared **archetypes**: named bundles of typed components. Add a hierarchical `entity_path` ("/scene/anchor_1/hologram_a") whose parent transforms inherit down. Every existing v1.0 entity trivially becomes a `Primitive` / `Hologram` / `Light` / `Emitter` / `Wire` archetype with the same JSON keys.

## Motivation

- Today `entity.type` is a free-form string and `components[]` is a parallel array. Viewers have to special-case each type ("if type == object.hologram, read `components[].type == hologram-feed`"). This doesn't scale to the v1.1+ primitives the roadmap promises (affordance, agent, belief, counterfactual).
- Rerun proves the pattern: archetype = named bundle of components; viewer dispatches by archetype; users log `rr.log(path, rr.Image(...))` and forget the details. XRAI already implies it (`object.primitive`, `object.light`) — we'd just make it load-bearing.
- Entity paths carry transform inheritance for free. Today XRAI needs an explicit `parent-of` relation to do the same, doubling the work and making round-trip fragile.

## Design

### Archetype declaration (v1.1 schema fragment)

```json
{
  "xrai_version": "1.1",
  "archetypes": {
    "Primitive":  { "required": ["transform"], "optional": ["material","animation","audio_reactive"] },
    "Hologram":   { "required": ["transform","hologram_feed"], "optional": ["material","audio_reactive"] },
    "Light":      { "required": ["transform","light_params"] },
    "Wire":       { "required": ["wire_source","wire_binds"] },
    "Emitter":    { "required": ["transform","emitter_params"], "optional": ["audio_reactive"] }
  }
}
```

Archetypes live in a single registry (`xrai://archetypes/registry.json`). Third parties may register new archetypes via RFC.

### Entity with archetype + path

```json
{
  "entity_path": "/scene/anchor_1/hologram_a",
  "archetype": "Hologram",
  "components": {
    "transform":     { "position":[0,0,-1], "rotation":[0,0,0,1], "scale":[1,1,1] },
    "hologram_feed": { "source":"livekit://room/track1", "codec":"HueDepth" },
    "material":      { "color":"cyan", "preset":"neon" },
    "audio_reactive":{ "bass_gain":1.2 }
  },
  "metadata": {}
}
```

Note: `components` is an **object keyed by component name**, not an array. Deterministic ordering, no duplicates, JSON-patch-friendly.

### Entity path hierarchy

- `/` is root.
- `/scene/anchor_1` is a child of `/scene` which is a child of `/`.
- Transform inheritance: a component lookup for `transform` on `/a/b/c` returns the composed `T(a)·T(b)·T(c)` (glTF/USD semantics).
- Non-transform components do NOT inherit (same as Rerun).
- Arbitrary depth; no slash in a single segment; URL-safe chars only.

### Backwards-compatibility glue (v1.0 → v1.1)

A v1.0 doc implicitly maps:
- Every `entity.id` → `entity_path = "/<id>"` (flat, all siblings under root).
- Every `entity.type` string is parsed: `"object.primitive"` → archetype `"Primitive"`, `"object.hologram"` → `"Hologram"`, etc.
- `parent-of` relations, if present, reshape the path tree.
- A v1.1 runtime reading v1.0 MUST perform this implicit mapping; a v1.0 runtime reading v1.1 ignores `entity_path` / `archetype` and falls back to `type` + `id`.

### Conformance impact

v1.1 runtimes MUST:
1. Render by archetype dispatch, not by matching opaque type strings.
2. Resolve transform inheritance down the entity path.
3. Preserve unknown components on round-trip (Postel).
4. Emit v1.0-compatible fallback fields (`type`, `id`) so v1.0 runtimes can still consume.

## Alternatives considered

### A — keep flat entities + `parent-of` relations
Status quo. Falls over at ~500 entities due to transform-pass N×M cost. Rerun and USD both abandoned the flat model.

### B — ECS component arrays (Bevy-style)
Components as separate tables keyed by `entity_path`. Rejected for v1.1 — too big a migration. Good target for v2.0 + Arrow (RFC 0009).

### C — glTF node tree directly
Rejected: glTF is v2.0-XRAI's envelope. For v1.0/1.1 we want a lighter-weight paradigm that compiles down to glTF, not glTF itself.

### D — typed `type` strings + no archetype registry
Rejected: viewers still have to special-case. Same problem.

## Backwards compatibility

- All v1.0 docs parse + render as v1.1 without modification via the implicit mapping above.
- A v1.1 doc MAY include both `entity_path`+`archetype` AND legacy `id`+`type` fields for dual-compat. Reference encoder emits both.
- Breaking change risk: `components` shape flips from array to object. Mitigation: v1.0 docs stay array-shaped; v1.1 docs opt into object-shaped. A v1.1 runtime MUST accept both.

## Implementation plan

1. Merge this RFC. Version bumps to v1.1.
2. Ship `xrai://archetypes/registry.json` with the 5 v1.0-equivalent archetypes above.
3. Update `js/xrai-core.js` — `newScene()` emits v1.1 shape; `validate()` accepts both.
4. Add conformance tests (RFC 0003 corpus) for v1.0↔v1.1 round-trip.
5. Update Unity runtime (`XraiRuntime.cs`) to dispatch on archetype.
6. Update the 12 adapters in `js/adapters/` to emit archetypes.

## Unresolved

- Archetype **inheritance** — can `Hologram` extend `Primitive`? Rerun says no (flat is simpler). Default: flat. Revisit in v1.2.
- Path **aliasing** (`/scene/anchor_1` = `/anchors/1`)? Defer to v1.2.
- Component **versioning** inside an archetype (e.g. `material@v2`)? Defer; hidden behind `metadata`.

## Prior art

- **Rerun archetypes** — [docs/concepts/archetypes](https://rerun.io/docs/concepts/archetypes) — Image, DepthImage, Transform3D, Pinhole, Mesh3D, Points3D, Boxes3D, TextDocument, Scalar, TimeSeriesScalar, etc. Each archetype = a fixed bundle of typed components.
- **glTF 2.0 extensions** — KHR_materials_pbrSpecularGlossiness et al. — named capability bundles.
- **Unity ECS** / **Bevy** — components as separate storage; archetype = set of components present.
- **USD schemas** — `UsdLuxSphereLight` etc. — typed schemas over primvars.

## Future work

- Arrow (RFC 0009) schema is derived from archetype registry automatically.
- Hyperedges (RFC 0002) participate in archetype dispatch.
- MCP server archetype-aware tools (xrai-mcp `create_entity(path, archetype, components)`).

## Adoption signals

- Viewer render path reduces by ≥50% LOC (measured on `js/xrai-core.js` + runtimes).
- External adopter declares a new archetype via RFC within 6 months.
- Unity runtime dispatch latency <1 ms per entity at 10k entities.
