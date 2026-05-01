# RFC 0009: Streaming XRAI — Arrow-backed `.xrai.arrow` companion format

- **Status:** Draft
- **Author:** @jamestunick
- **Date:** 2026-04-23
- **Target version:** v1.2 (additive; JSON spec unchanged)
- **Related:** RFC 0001 (event primitives), RFC 0005 (multiplayer delta), RFC 0008 (WebGPU renderer)
- **Prior art:** Rerun `.rrd` (Apache Arrow columnar, append-only, multi-timeline, ~10k★)

---

## Summary

Add a second, non-normative on-wire format for XRAI: append-only Apache Arrow chunks keyed by entity path × timeline × archetype. JSON (`.xrai`) stays canonical for human/LLM authoring; `.xrai.arrow` is the runtime format for large scenes (>10k entities), long replays, live multiplayer, and embedded viewers that need O(1) random time access.

## Motivation

- `.xrai` JSON is optimized for 1-hour-to-grok authoring. It is not optimized for (a) 10k+ entities, (b) minute-scale replay, (c) 60 Hz multiplayer delta, (d) DuckDB / Polars / PyArrow analytics.
- Rerun ships the exact same separation (Python SDK logs Arrow; viewer reads Arrow; humans read almost-never the binary) and hits 60 FPS on 100k-row recordings. XRAI's stated v1.2–v2.1 roadmap (counterfactuals, embeddings, federated queries) is effectively unreachable on a single-document JSON blob.
- A canonical Arrow schema + reference encoder gives PyArrow / DuckDB / Polars / Lance users zero-friction entry; today they'd hand-roll JSON flattening.

## Design

### Files

- `.xrai` / `application/vnd.xrai+json` — unchanged, normative.
- `.xrai.arrow` / `application/vnd.xrai.arrow` — streamable Arrow IPC (`ArrowStream` or `ArrowFile`), append-only chunks.
- `.xrai.jsonl` (already in v1.0) — stays; it's the line-delimited text form of Arrow for curl-friendliness.

### Chunk schema (Arrow record batch columns)

| Column | Type | Required | Notes |
|---|---|---|---|
| `entity_path` | `string` | ✓ | `/scene/anchor_1/hologram_a` — hierarchical (RFC 0010) |
| `archetype` | `string` | ✓ | e.g. `Primitive`, `Hologram`, `Wire`, `Event.Collision` |
| `component` | `string` | ✓ | e.g. `transform`, `material`, `audio_reactive_gain` |
| `timeline.log_time` | `timestamp[ns]` | ✓ | wall-clock |
| `timeline.scene_frame` | `int64` | ✗ | nominal scene frame idx |
| `timeline.<user>` | any | ✗ | zero-or-more user-defined timelines (Rerun pattern) |
| `payload` | Arrow-native (`struct`/`list`/`fixed_size_binary`) | ✓ | component's typed body |
| `delta_kind` | `enum{add,update,remove}` | ✓ | streaming semantics |

### Equivalence with JSON

Every `.xrai` v1.0 doc round-trips to a single `.xrai.arrow` chunk with `delta_kind=add` rows (one row per component of every entity, relation, event). Reverse: any `.xrai.arrow` stream at time T projects to a `.xrai` snapshot by replaying all `add/update/remove` up to T.

### Conformance impact

- Runtimes that accept `.xrai.arrow` MUST implement the snapshot projection so existing `.xrai` consumers can still read their state.
- A runtime that accepts ONLY `.xrai` is still v1.x-conformant. Arrow is additive.

### Error semantics

Malformed chunk: reject chunk, continue stream. Don't tear down the session — Rerun's hard-learned lesson (gRPC v0.13 era).

## Alternatives considered

### A — do nothing
Live multiplayer (RFC 0005) and 10k-node hypergraphs (RFC 0008) stall on JSON parse cost. Workaround: gzip + per-delta JSON Patch. Falls over at ~500 deltas/sec (measured on `web/rgbd-viewer/` benchmarks).

### B — custom binary (protobuf / flatbuffers / msgpack)
Rejected: loses PyArrow / DuckDB / Polars / Lance interop for free. Rerun tried their own format pre-0.10 and migrated to Arrow explicitly for this reason.

### C — CBOR
Rejected: no columnar layout → no random time access → can't scrub a 10-minute session in <100 ms.

### D — Parquet file snapshots only
Rejected: Parquet is row-group-immutable, not streaming. Good for cold archive (see Lance below) but not for live delta.

## Backwards compatibility

- All existing `.xrai` docs parse unchanged.
- Runtimes that only implement v1.0/1.1 can ignore Arrow files; discovery is by MIME type.
- Migration: none required. Arrow is opt-in per producer.

## Implementation plan

1. RFC merged — schema frozen.
2. Reference encoder (`js/xrai-arrow.js` + `pyarrow` helper) — converts `.xrai` → `.xrai.arrow` chunk.
3. Reference decoder + snapshot projector — Arrow stream → v1.0 JSON at time T.
4. LiveKit DataChannel topic `xrai-arrow-delta` alongside existing `xrai-delta` (RFC 0005 hook).
5. Lance archival export (cold-storage path, see Future).
6. Conformance corpus update (RFC 0003) — add 3 Arrow round-trip tests.

## Unresolved

- Should `delta_kind=remove` carry a tombstone payload or just the path? (Rerun carries empty struct; we'd follow.)
- Hyperedge representation (RFC 0002) in Arrow — struct-of-list vs separate hyperedge table? Defer to 0002 landing.

## Prior art

- **Rerun `.rrd`** — closest analogue; Apache Arrow 2.x+; timeline-keyed; entity-path hierarchical. [docs](https://rerun.io/docs/concepts/chunks)
- **Apache Arrow Flight** — network transport patterns.
- **Lance (Rerun fork)** — columnar format for 100× random access cold storage; candidate for XRAI archive.
- **USD Crate** — Pixar's binary scene delta format; different tradeoffs (file-scoped, not streaming).

## Future work

- Lance cold-storage tier (`.xrai.lance`).
- Arrow Flight gRPC server as a fourth transport in VIEWER_ARCHITECTURE.md's Transport Layer row.
- PyArrow-backed `xrai` Python SDK (mirrors `rerun-sdk`).

## Adoption signals

- ≥1 non-Portals Arrow producer within 6 months of landing.
- `.xrai.arrow → .xrai` round-trip passes on CVPR-scale hologram replay (>5 min, >60 FPS) by Q3 2026.
- DuckDB query on an `.xrai.arrow` corpus published in a blog post by an external user.
