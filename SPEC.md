# XRAI v1.0 — Public Specification Draft

**Status:** Pedagogical entry point + public draft. The full engineering spec (XRAI v2.0, glTF 2.0 + `XRAI_core` extension) is at [`specs/XRAI_FORMAT_SPECIFICATION_V2.md`](../../XRAI_FORMAT_SPECIFICATION_V2.md) in the Portals monorepo.
**License:** CC0 (public domain) for the normative JSON schema; MIT for reference parsers.
**Governance:** BDFL (@jamestunick) until 1000+ external adopters, then community foundation transfer.

> **Two specs, one format:**
> - **This doc (v1.0):** minimal public-launch spec. Flat JSON. Grokkable in 1 hour, implementable in 1 week. Entry point for LLM authors + Three.js / PlayCanvas / WebXR adapters.
> - **[XRAI_FORMAT_SPECIFICATION_V2.md](../../XRAI_FORMAT_SPECIFICATION_V2.md) (v2.0):** full engineering spec. glTF 2.0-based with `XRAI_core` extension. The canonical Portals runtime format. "DNA, not the organism."
>
> v1.0 is a subset of v2.0 — every v1.0 doc is a valid v2.0 scene once wrapped in glTF envelope. Choose v1.0 for quick LLM authoring / lightweight tools; use v2.0 when you need glTF interop + the full entity-component-extension system.

> **Normative source of truth:** the running Portals runtime. Whatever parses and renders correctly in Portals v4 today IS v1.0-compatible. Engineering spec v2 is what Portals actually emits; v1.0 is the stable public contract both specs guarantee.

---

## Scope of v1.0

v1.0 covers **scene-level spatial composition**. Event/causal/counterfactual/agent/belief extensions are v1.1+ (see §Future).

v1.0 is deliberately minimal. Worse-is-better (Gabriel 1989). Lessons from JSON beating XML, WWW beating Xanadu.

## Top-level schema (draft)

```json
{
  "xrai_version": "1.0",
  "id": "<uuid-v4>",
  "created_at": "<ISO-8601>",
  "author": { "type": "llm|human|agent", "id": "<opaque>" },
  "origin": { "app": "portals", "version": "v4", "scene": "SimpleAR" },
  "scene": {
    "anchors": [],
    "entities": [],
    "relations": [],
    "events": []
  },
  "metadata": {}
}
```

### Entity (primitive node)

```json
{
  "id": "<local-id>",
  "type": "<type-uri>",
  "model_id": <int | null>,
  "transform": {
    "position": [x, y, z],
    "rotation": [x, y, z, w],
    "scale": [x, y, z]
  },
  "material": { "color": "<css-color>", "preset": "<name>", "opacity": 0..1 },
  "animation": { "type": "<anim-name>", "params": {} },
  "components": [ { "type": "<component-type>", "props": {} } ],
  "metadata": {}
}
```

Types in v1.0: `object.primitive` (cube/sphere/cylinder/capsule/plane/quad), `object.glb` (URL-referenced), `object.hologram`, `object.light`, `object.emitter`, `object.wire-source`.

### Relation (binary edge, v1.0 only; hyperedges v1.1)

```json
{
  "id": "<local-id>",
  "type": "<relation-type>",
  "from": "<entity-id>",
  "to": "<entity-id>",
  "props": {}
}
```

Relation types declared for v1.0: `parent-of`, `wire-binds`, `reacts-to-audio`, `tracks`. Runtime pass-through + renderer wiring ships in the reference implementation (see [RFC-0004 — Relation types + runtime semantics](./rfcs/0004-relation-types.md) for status). Conformance clause §4 "Preserves unknown fields on round-trip" covers forward-compat while runtime adopters catch up.

### Event (v1.0 stub — fuller schema in v1.1)

```json
{
  "id": "<local-id>",
  "t": "<ISO-8601>",
  "type": "<event-type>",
  "entity": "<entity-id>",
  "metadata": {}
}
```

## MIME type + file extension

- `application/vnd.xrai+json`
- `.xrai` (single graph), `.xrai.jsonl` (stream)

## URI scheme

- `xrai://<graph-uuid>/node/<entity-id>`
- `xrai://<graph-uuid>/relation/<relation-id>`
- `xrai://<graph-uuid>/event/<event-id>`

## Minimal example

```json
{
  "xrai_version": "1.0",
  "id": "a9b3c1d5-…",
  "created_at": "2026-04-22T12:00:00Z",
  "author": {"type": "human", "id": "jatunick@gmail.com"},
  "origin": {"app": "portals", "version": "v4", "scene": "SimpleAR"},
  "scene": {
    "anchors": [],
    "entities": [
      {
        "id": "cube_1",
        "type": "object.primitive",
        "model_id": 0,
        "transform": {
          "position": [0, 0.25, -1.5],
          "rotation": [0, 0, 0, 1],
          "scale": [0.18, 0.18, 0.18]
        },
        "material": {"color": "cyan", "preset": "neon"}
      }
    ],
    "relations": [],
    "events": []
  }
}
```

## Conformance

A runtime conforms to XRAI v1.0 if it:
1. Accepts any well-formed v1.0 document
2. Renders entities with positions, rotations, scales, materials, animations
3. Preserves unknown fields on round-trip (forward-compat)
4. Produces v1.0 output that any other v1.0 runtime can consume

## Future (roadmap, non-normative)

- **v1.1:** typed n-ary hyperedges (replaces binary relations); causal event chains; affordance primitives
- **v1.2:** counterfactual branches; POV / observer semantics
- **v2.0:** personal / shared namespaces; cryptographic provenance; federated queries
- **v2.1:** node embeddings + analogy retrieval; PageRank-style salience
- **v3.0:** self-referential schema; meta-layer events ("the graph noticed X")

## Contributing

- File issues with reproducible examples
- Propose changes as RFCs (markdown files in `/rfcs/`)
- BDFL (@jamestunick) merges during Year 1; community foundation transfer Year 2+
- MIT / CC0 only; no other licenses accepted

## Acknowledgments

Built on 80 years of prior art: Vannevar Bush (memex), Ted Nelson (Xanadu), Tim Berners-Lee (WWW, GGG), Larry Page + Sergey Brin (PageRank), Douglas Hofstadter (analogy-as-cognition), Howard Pattee (epistemic cut), Herbert Simon (near-decomposability). XRAI is their synthesis, made shippable by LLMs.
