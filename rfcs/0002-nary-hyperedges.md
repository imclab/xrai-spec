# RFC 0002: Typed n-ary hyperedges (replaces binary relations)

- **Status:** Draft
- **Author:** @jamestunick
- **Date:** 2026-04-22
- **Target version:** v1.1 (public spec) + v2.1 (`XRAI_core` engineering spec)
- **Related:** [RFC 0001 event primitives](./0001-event-primitives.md); `specs/XRAI_FORMAT_SPECIFICATION_V2.md § 7 Extensions`
- **Supersedes:** `SPEC.md § Relation (binary edge)` v1.0

---

## Summary

Replace v1.0's binary `{from, to}` relation with a typed n-ary hyperedge `{participants: [id...], roles: [label...]}`. Binary is a degenerate case. Enables: multi-actor events, shared-frame relations, provenance chains, the 7 XRAI reference scenarios (`~/.claude/knowledgebase/_PORTALS_XRAI_REFERENCE_SCENARIOS.md`).

> **Alignment note.** Engineering-spec v2 (`specs/XRAI_FORMAT_SPECIFICATION_V2.md`) is glTF 2.0-based and expresses relations via glTF node parent-child + `XRAI_node` extension slots. v2 does not yet define explicit hyperedges; this RFC proposes them for both the public v1.1 spec AND as a v2.1 `XRAI_core.hyperedges[]` extension. The proposal is additive — no existing v2 behavior changes.

## Motivation

v1.0 relation:
```json
{ "type": "<r-type>", "from": "<id>", "to": "<id>" }
```
cannot express:

- **"Alice, Bob, Chen co-authored paper_42"** — 3+ entities, symmetric role, one relation.
- **"Surgeon reports finding to tumor-board clinicians based on scan_7"** — 4 participants, asymmetric roles (`reporter`, `audience`, `claim`, `evidence`).
- **"Conference session has speaker, papers, audience, sponsors"** — 4+ roles on one hyperedge.

Current workaround: multiple binary edges + implicit join. Breaks `~/.claude/knowledgebase/_PORTALS_XRAI_REFERENCE_SCENARIOS.md` scenarios 1 / 2 / 3 / 6 which explicitly require n-ary.

## Design

```json
{
  "id": "<edge-id>",
  "type": "<type-uri>",
  "participants": ["<id>", "<id>", "<id>"],
  "roles": ["author", "author", "author"],
  "props": {}
}
```

- `participants` and `roles` have same length. If all roles are identical, it's a symmetric n-ary (co-authorship, co-location). If distinct, it's asymmetric (report-by-to-about).
- v1.0 binary `{from, to}` auto-converts: `participants: [from, to]`, `roles: ["from", "to"]`. Forward-compat preserved.
- For engineering v2 (glTF-based), hyperedges live in `extensions.XRAI_core.hyperedges[]` following same pattern.

### Example — co-authorship

```json
{ "id": "auth_1", "type": "co-authors", "participants": ["alice","bob","chen"], "roles": ["author","author","author"] }
```

### Example — tumor-board finding-report

```json
{
  "id": "rpt_1", "type": "clinical-report",
  "participants": ["dr_smith", "clinician_a", "clinician_b", "scan_007", "finding_mass"],
  "roles": ["reporter", "audience", "audience", "evidence", "claim"],
  "props": { "confidence": 0.87, "ts": "2026-04-22T10:00:00Z" }
}
```

## Alternatives

**A. Keep binary + reify n-ary as a dummy node.** Common RDF workaround. Rejected: doubles graph size, obscures intent (is the dummy an entity or edge?), harder for LLMs to author.

**B. JSON-LD `@graph` nesting.** Heavy tooling dependency + alien to most LLM training data. Rejected for v1.1 public-spec; revisit for v2.0 if JSON-LD ecosystem grows.

**C. Keep v1.0 binary, encode n-ary via metadata.** Moves the problem into metadata — same "what's the shape of metadata?" fight we're trying to avoid.

## Backwards compatibility

- v1.0 binary relations round-trip losslessly: `{from, to}` → `participants:[from,to], roles:["from","to"]` → back to `{from, to}`.
- v1.1 runtimes MUST accept v1.0 binary input and return identical binary output when the hyperedge has exactly two `["from","to"]`-role participants.
- Unknown role names preserved on round-trip.

## Implementation plan

1. Spec text merged. SPEC.md § Relation replaced.
2. Reference parsers (TS / Python / Rust) gain `hyperedge_from_binary()` conversion helper.
3. XRAI_core engineering spec gains `XRAI_core.hyperedges` extension slot mirroring schema.
4. MCP server: `xrai.append` accepts hyperedges via existing relation slot.
5. Conformance suite: 3 new fixtures (co-authorship / tumor-report / conference-session).

## Unresolved

- Role vocabulary: freeform vs fixed enum? **Current proposal:** freeform, with a recommended-starter list (`author`, `actor`, `evidence`, `claim`, `reporter`, `audience`, `source`, `target`). Hard enum kills extensibility.
- Max participants per hyperedge? **Current proposal:** soft cap at 64; runtimes MAY reject beyond.
- Directionality on asymmetric hyperedges? **Current proposal:** implicit from role order; edge is a tuple not a set.

## Prior art

- **RDF-star / RDF\*** — reified statements. Heavy.
- **Property graphs (Neo4j, TinkerPop)** — edges have properties but not n-ary natively; usually bin-encoded via hyperedge-nodes.
- **Hypergraph DBs (HyperGraphDB, Grakn/TypeDB)** — native n-ary. Closest conceptual fit.
- **schema.org `Role` pattern** — JSON-LD + named roles. Influenced the `roles` field.

## Adoption signals

Within 6 months of v1.1 ship: ≥2 external scenes use n-ary hyperedges (`len(participants) > 2`). If zero, role-per-position was wrong ergonomics — revisit.
