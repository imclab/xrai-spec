# RFC 0001: Event primitives — temporal scheduling and trigger chains

- **Status:** Draft
- **Author:** @jamestunick
- **Date:** 2026-04-22
- **Target version:** v1.1
- **Related issues:** (none yet — this RFC opens the discussion)
- **Supersedes:** `SPEC.md § Event (v1.0 stub)`

---

## Summary

Replace the v1.0 Event stub with a complete event schema that supports temporal scheduling (`validFrom` / `validTo`), trigger chains (event A causes event B), reaction graphs (multiple entities respond to the same event), and deterministic replay. Enables the "Infinite zoom across time" pillar from the Sight Triad (see `constitution.md § The Affirmative Mirror`).

## Motivation

v1.0 ships event as a one-field stub:

```json
{ "id": "<local-id>", "t": "<ISO-8601>", "type": "<event-type>", "entity": "<entity-id>", "metadata": {} }
```

This is enough to log *that* something happened; it is not enough to:

1. Express **recurring / scheduled events** ("remind me every Tuesday at 9am") without encoding them as repeated entity stamps — which breaks compression and round-trip.
2. Express **causal chains** ("the door opens because the player stepped on the plate") as first-class structure rather than inferred from side effects.
3. Express **counterfactual branches** ("if the player had stepped on plate B instead…") — this is the Sight Triad's *across-possibilities* axis.
4. Drive **deterministic replay** of a session — memex + time-travel is the promise, but without causal structure the replay is just a movie, not a navigable graph.

Without this RFC, "Infinite zoom across time / possibilities" remains aspirational in the spec. With it, shipping a replay-scrubber / counterfactual-branch UI becomes a straight implementation rather than a research project.

## Design

### Extended schema

```json
{
  "id": "<local-id>",
  "type": "<event-type>",
  "t": "<ISO-8601 | null>",
  "entity": "<entity-id> | null",
  "validFrom": "<ISO-8601 | null>",
  "validTo": "<ISO-8601 | null>",
  "causedBy": ["<event-id>", "..."],
  "causes": ["<event-id>", "..."],
  "actors": ["<entity-id>", "..."],
  "payload": { /* event-type-specific */ },
  "branch": "<branch-id | null>",
  "metadata": {}
}
```

Field semantics:

- **`t`** — when the event fired (wall-clock). Nullable for scheduled-but-not-fired events.
- **`validFrom` / `validTo`** — activation window for recurring / scheduled events. When both are null, event is one-shot.
- **`causedBy`** / **`causes`** — explicit causal edges. Walk `causedBy` to explain an event; walk `causes` to simulate downstream effects.
- **`actors`** — one-to-many: when multiple entities react to one event, `actors` is the set that reacted (e.g. `"audio_playback_started"` actors: `{cube_1, sphere_2}` — both wire-bound to it).
- **`branch`** — counterfactual branch id. The main timeline is `branch: null`; a "what if the player did X instead" is a separate branch. Entities + relations can be shared across branches; events are branch-specific.

### Event-type vocabulary (normative starter set)

v1.1 ships with a **minimum viable vocabulary** — not exhaustive, extensible via `xrai:namespace`:

| type | semantic |
|---|---|
| `scene.created` | a scene / subgraph came into existence |
| `scene.loaded` | a saved scene was re-realized |
| `entity.added` | a new entity was inserted |
| `entity.removed` | an entity was deleted |
| `entity.transformed` | position / scale / rotation changed |
| `stroke.added` | a paint stroke was committed |
| `audio.peak` | an audio-reactive source crossed a threshold |
| `voice.intent` | a voice command was parsed (confidence, transcript, action) |
| `user.presence` | user joined or left a shared space |
| `hologram.placed` | a hologram was anchored |
| `time.tick` | metronomic event for scheduled recurring payloads |

Extension: `xrai:namespace:type` for domain-specific events (`medical:vitals:bp_reading`, `education:quiz:submitted`).

### Replay semantics

A conforming v1.1 runtime that receives a scene with events MUST:

1. Preserve event order on round-trip (stable sort by `t` then `id`).
2. Ignore `validFrom` / `validTo` / `causedBy` / `causes` / `branch` if it doesn't implement them (forward-compat).
3. If a `causedBy` id references an event not present in the document, log + continue (partial graphs are valid).

A conforming v1.1 runtime MAY:

- Expose a replay-scrubber that walks events in order.
- Expose branch visualization for counterfactual exploration.
- Use `causes` forward-chains to predict downstream effects.

### Examples

**Scheduled recurring event:**

```json
{
  "id": "evt_remind_1",
  "type": "voice.intent",
  "t": null,
  "validFrom": "2026-05-01T09:00:00Z",
  "validTo": "2026-12-31T23:59:59Z",
  "payload": {
    "recurrence": "FREQ=WEEKLY;BYDAY=TU",
    "intent": "remind",
    "text": "Check on the garden"
  }
}
```

**Causal chain:**

```json
[
  {"id": "evt_step_plate", "type": "entity.transformed", "t": "...", "entity": "player_1", "payload": {"collider": "plate_a"}},
  {"id": "evt_door_open", "type": "entity.transformed", "t": "...", "entity": "door_1", "causedBy": ["evt_step_plate"], "payload": {"state": "open"}}
]
```

**Counterfactual branch:**

```json
[
  {"id": "evt_step_plate", "type": "entity.transformed", "t": "...", "branch": null, "entity": "player_1"},
  {"id": "evt_step_plate_b", "type": "entity.transformed", "t": "...", "branch": "what_if_b", "entity": "player_1"},
  {"id": "evt_door_open", "branch": null, "causedBy": ["evt_step_plate"]},
  {"id": "evt_trapdoor_open", "branch": "what_if_b", "causedBy": ["evt_step_plate_b"]}
]
```

## Alternatives considered

### A — Keep v1.0 stub, push all event structure into `metadata`

Least invasive, preserves back-compat trivially. Rejected because: it pushes the schema burden onto every runtime to agree on metadata shape, which is exactly what a spec is supposed to avoid. Metadata is for runtime-specific things; causal structure is not runtime-specific.

### B — Adopt CloudEvents schema (cloudevents.io)

CloudEvents is battle-tested for server-to-server event pipelines. Rejected for the core schema because: (1) CloudEvents is designed for flat, non-spatial events; it has no concept of `entity` / `actors` / `branch`; (2) the `specversion` + `datacontenttype` ceremony adds parse cost without value in our use case. We can still serialize our events AS CloudEvents at the transport layer (when shipping over Kafka / EventBridge) — this RFC and CloudEvents are not mutually exclusive.

### C — Adopt OpenTelemetry Span schema

OTel spans have great causal modeling (parent-child `traceId` / `spanId`). Rejected because: OTel is designed for distributed tracing of software execution, not user-authored events. The conceptual fit is wrong; `traceId` doesn't map cleanly to `branch`.

### D — Events as first-class entities (no separate `events` array)

Model each event as an entity with `type: "event.*"`. Rejected because: events have fundamentally different lifecycle from scene entities (they fire once, they can't be re-transformed, they don't occupy space). Collapsing them into entities forces every renderer to special-case "which entities are events?" — worse than keeping them in their own array.

## Backwards compatibility

- **v1.0 documents:** still parse correctly as v1.1. Every v1.0 event-stub field is preserved. The new fields (`validFrom`, `validTo`, `causedBy`, `causes`, `actors`, `payload`, `branch`) are all optional.
- **v1.1 documents round-tripped through v1.0 runtimes:** unknown fields preserved via the v1.0 "forgiving parsing" rule (see `SPEC.md § Conformance` rule 3). Replay semantics are lost but data survives.
- **Migration:** none needed. Existing v1.0 scenes are valid v1.1 scenes by construction.

## Implementation plan

1. **Spec text:** this RFC merged. `SPEC.md § Event` replaced with the full schema above.
2. **Reference parser updates:** TS + Python parsers extended (zod schema for TS, pydantic for Python).
3. **Portals Unity runtime:** `SceneComposer` event recording + replay-scrubber stub.
4. **MCP server tool:** `xrai.event_emit` (optional — may defer to v1.2).
5. **Conformance tests:** round-trip test corpus gains 6 new scenes (scheduled, causal, counterfactual, multi-actor, unknown-type preservation, branch-isolation).
6. **Examples:** `xrai-website/examples/05-scheduled.xrai.json`, `06-causal-chain.xrai.json`, `07-counterfactual-branch.xrai.json`.

## Unresolved questions

1. **Max events per document?** v1.0 is silent on document size limits. Large replay logs could bloat a scene file. Proposal: cap at 10,000 events in a single document; streams larger than this use `.xrai.jsonl` event-stream format. Open for discussion.
2. **Event deduplication semantics on merge?** If two graphs both contain event `id: evt_1` with different payloads, what's the merge rule? Current proposal: later `t` wins; ties broken by author lexicographic. Acceptable?
3. **Time zones + clock skew.** `t` is ISO-8601 with timezone. For distributed scenes, clock skew could cause out-of-order events. Proposal: clients normalize to UTC at emit; conflict resolution is "server clock wins" when a sync service is present. Open.
4. **Branch merging.** Can a counterfactual branch rejoin the main timeline? Current design says no — branches are terminal. Is this a limitation we'll regret? May warrant a future RFC.
5. **Replay-scrubber UI is not a spec concern** — but the Portals runtime will ship one. Should conformance tests exercise the replay path, or leave it to runtime discretion?

## Prior art

- **CloudEvents** (cloudevents.io) — transport-layer event envelope. Compatible via serialization.
- **OpenTelemetry spans** — distributed tracing; different domain but similar causal modeling.
- **Event sourcing** (Fowler 2005) — the canonical pattern. XRAI events are essentially a spatial event-sourcing ledger.
- **Ted Nelson's Xanadu versioning** — every mutation is a new version; similar lineage semantics but document-centric rather than event-centric.
- **Git commit graph** — DAG with branches; same mental model as our `causedBy` + `branch` pair.
- **MPEG-SCENE** — has timed events but coupled to multimedia playback; domain too narrow to borrow wholesale.

## Future work

- **v1.2:** event-stream format (`.xrai.jsonl`) for live / append-only scenarios.
- **v1.2:** signed events (cryptographic provenance) — anchors jARvis's X-ray pillar claims about agent reasoning legibility.
- **v1.3:** federated event streams (two users' event streams merged into a shared timeline via a sync service).
- **v2.0:** event queries as a first-class schema element (similar to SPARQL for RDF).

## Adoption signals

- **Within 3 months of v1.1 ship:** 2+ external runtimes implement replay (beyond Portals). If zero, the spec is too complex — simplify in v1.2.
- **Within 6 months:** at least 100 externally-authored XRAI scenes include causal events (`causedBy` / `causes` populated). If less, events are too ceremonial — reconsider.
- **Within 12 months:** 1+ academic paper cites XRAI event primitives as a format for causal scene graphs. If zero, the design missed a researcher audience.

If all three signals miss, this RFC will be superseded by a simpler v1.2 revision.
