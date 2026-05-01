# RFC 0009: Time-based stream ingestion via schema mapping + sparse semantic encoding

- **Status:** Draft
- **Author:** @jamestunick
- **Date:** 2026-04-23 (replaces 2026-04-23-rerun-port draft)
- **Target version:** v1.2 (additive — JSON spec unchanged; new *ingestion-layer* semantics)
- **Related:** RFC 0001 (events), RFC 0005 (multiplayer delta), RFC 0010 (archetypes), **RFC 0012 (decoder contract)**
- **Prior art:** OpenTelemetry (logs/metrics/traces unified model), Apache Arrow Flight, JSON-LD (schema mapping), ROS bag, LeRobot dataset format, Rerun `.rrd`, USD layers, CRDT delta streams, MCP tool-trace conventions

---

## Summary

Make XRAI a neutral **semantic bus**: any time-based stream or log (sensor, agent trace, sim tick, app log, MCP tool call, ARKit anchor, LiveKit packet, Rerun recording, OpenTelemetry span, ROS bag topic, …) can be **ingested** via a declarative **schema mapping** into **sparse semantic encoding (SSE)** — deltas typed against a public ontology — so any **decoder** (RFC 0012: AI agents, LLMs, procedural/generative renderers, shaders/VFX, neural renderers, 3D viewers, game engines, bridges, converters, simulators) can render, simulate, replay, or generate from the same stream.

Concretely: XRAI grows three layers below the entity/relation/event schema — **Sources → Mappings → SSE** — and one layer above — **Decoders** (RFC 0012). The v1.0 JSON doc becomes the snapshot projection of an SSE stream at a given `(timeline, t)`.

## Motivation

- The XRAI roadmap (v1.1 events, v1.2 counterfactuals, v2.0 federated queries, v2.1 embeddings, v3.0 self-referential meta-layer) is unreachable if every new source has to be hand-coded into every decoder.
- Today each runtime (Unity / Needle / PlayCanvas / force-graph / ECharts / Icosa) learns the XRAI JSON shape. That's 1 shape × N runtimes = N. But inputs multiply too: ARKit, LiveKit, LLM traces, MCP tool-use, OpenTelemetry, ROS bags, sensor CSVs, Rerun `.rrd`. With M inputs × N outputs we get **M × N adapters**. This RFC collapses that to **M + N** by inserting a neutral semantic middle.
- Every comparable ecosystem already did this split (OpenTelemetry collectors; Arrow as a neutral columnar middle; LeRobot dataset as a neutral robot-data middle; USD as a neutral composition middle). XRAI without it is a viewer, not a substrate.
- "Sparse" + "semantic" are load-bearing:
  - **Sparse** → delta-native: only emit what changed. Match CRDT / JSON Patch / Rerun chunk semantics. Enables 60 Hz multiplayer (RFC 0005) and long replays without N×M blow-up.
  - **Semantic** → every delta carries a type drawn from a public ontology, not a raw field name. An LLM agent reading the stream sees `{entity: /hologram_a, component: pose_6dof, value: …}` instead of `{"x":0.1,"y":0.5}` with no context. This is what lets AI decoders work without special-casing each source.

## Design

### Four layers

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  SOURCES           Any time-based stream / log                                │
│                    ARKit · LiveKit · OpenTelemetry · ROS bag · Rerun .rrd ·   │
│                    MCP tool trace · LLM chain-of-thought · sim tick · app log │
├───────────────────────────────────────────────────────────────────────────────┤
│  MAPPINGS          Declarative schema-mapping docs (xrai://schemas/…)         │
│                    source-field → xrai ontology slot, with transform + unit   │
├───────────────────────────────────────────────────────────────────────────────┤
│  SSE               Sparse Semantic Encoding — delta stream on the wire        │
│                    {entity_path, component, timeline.*, payload, delta_kind}  │
│                    Wire-format agnostic (JSON-Patch · Arrow IPC · CBOR · …)   │
├───────────────────────────────────────────────────────────────────────────────┤
│  DECODERS (RFC 0012)                                                          │
│                    Renderers (shader / VFX / PBR / neural) · game engines ·  │
│                    3D viewers · simulators · LLM agents · generators ·        │
│                    bridges (Rerun / OpenTelemetry / glTF / USD out) ·         │
│                    converters (diffusion-conditioned, procedural, L-system)   │
└───────────────────────────────────────────────────────────────────────────────┘
```

Each layer is independently versionable. A new source adds one mapping doc. A new decoder adds one consumer. Neither touches the others.

### 1. Sources — what counts as ingestible

Anything that emits rows at a rate ≥0 Hz with at least one time stamp and at least one named field. XRAI takes **no opinion** on the source's native shape; a mapping (§2) declares the translation. Non-exhaustive catalog (every row has at least one shipped reference mapping planned in the implementation plan):

| Source kind | Example stream | Typical rate | Mapping id (planned) |
|---|---|---|---|
| **Session / tool telemetry** | `~/.claude/session-stats/history.jsonl` (duration_min, commits, est_tokens) | event-driven | `claude-session-history-v1` |
| **Structured app log** | `console.log` + `console.error` lines, Unity `Debug.Log`, OSLog | event-driven | `console-jsonl-v1`, `unity-debuglog-v1` |
| **Distributed trace / metric** | OpenTelemetry span / metric / log | var | `opentelemetry-v1` |
| **Financial market data** | stock tick (NYSE/NASDAQ WebSocket), crypto order book (Coinbase/Kraken), OHLCV bar feed | 1 Hz – 10 kHz | `market-tick-v1`, `ohlcv-bar-v1`, `orderbook-l2-v1` |
| **News / text stream** | RSS/Atom, news API (AP/Reuters/BBC), Twitter/BlueSky firehose, Mastodon stream | event-driven | `rss-atom-v1`, `bluesky-firehose-v1` |
| **Motion capture** | OptiTrack NatNet, Vicon DataStream, Rokoko Smartsuit, Xsens MVN, MediaPipe Pose 33pt, OpenPose, Azure Kinect body | 60–240 Hz | `natnet-v1`, `mediapipe-pose-v1`, `azure-kinect-body-v1` |
| **Video frame stream** | RTSP H.264/H.265, WebRTC VP9/AV1, HLS .ts segments, raw NAL, RGBD (HueDepth) | 30–120 FPS | `video-rtsp-v1`, `webrtc-vp9-v1`, `rgbd-huedepth-v1` |
| **Image sequence** | PNG/JPG/EXR folder, photo burst, ARKit keyframe chain, scientific microscopy TIFF stack | var | `image-seq-v1`, `arkit-keyframe-v1` |
| **Depth / point cloud** | iPhone LiDAR mesh, Livox LiDAR, Velodyne, RealSense depth, Intel Kinect | 10–60 Hz | `ios-lidar-v1`, `velodyne-pcap-v1`, `realsense-d4xx-v1` |
| **AR / XR runtime** | ARKit anchors + face/body, ARCore trackables, OpenXR actions, WebXR transforms | 60–120 Hz | `arkit-v1`, `arcore-v1`, `openxr-actions-v1`, `webxr-transforms-v1` |
| **Real-time transport** | LiveKit DataChannel (spec 010), WebRTC, WebSocket, MQTT, NATS, Kafka | var | `livekit-datachannel-v1`, `mqtt-topic-v1`, `kafka-topic-v1` |
| **Agent trace** | LLM tool call (JSON), MCP server invocation, chain-of-thought step, LangGraph run | event-driven | `mcp-tool-trace-v1`, `llm-cot-v1`, `langgraph-run-v1` |
| **Sim tick** | physics step (Bullet/PhysX/MuJoCo), ECS system pass (Unity DOTS/Bevy), cloth/fluid step | 30–1000 Hz | `mujoco-tick-v1`, `unity-dots-v1` |
| **Recorded corpora** | Rerun `.rrd`, ROS bag / rosbag2, HDF5 LeRobot episode, CSV, Parquet | offline | `rerun-rrd-v1`, `ros-bag-v1`, `lerobot-episode-v1` |
| **User input** | touch / gesture / voice / gaze / keyboard / MIDI | 60 Hz | `input-events-v1`, `midi-stream-v1` |
| **Environmental / IoT sensor** | weather API, air quality, seismic, GPS / GNSS NMEA, Bluetooth beacons, industrial PLC (Modbus/OPC-UA) | var | `nmea-gps-v1`, `modbus-v1`, `weather-api-v1` |
| **Biosignal** | heart rate (Polar/Apple Watch), EEG (Muse/OpenBCI), EMG, pulse-ox, respiration | 1–512 Hz | `heart-rate-v1`, `eeg-openbci-v1` |
| **Generative / synthesis** | LLM diffusion frame, procedural tick, WFC step, shader Graph param, neural-renderer latent | var | `diffusion-frame-v1`, `procedural-tick-v1` |

**The important property:** XRAI does not privilege "spatial" sources. A stock market tick and a motion-capture joint pose land on the same bus with the same delta shape — the only difference is which ontology components they populate (`metric_value` + `asset_symbol` vs `pose_6dof` + `joint_id`). That's what makes the substrate general.

**Conformance requirement:** any adapter claiming to ingest source X MUST produce SSE deltas that round-trip to a v1.0 JSON snapshot at any supported `(timeline, t)`. Sources with no natural spatial structure (e.g. a news feed) are still conformant — they emit entities under synthetic paths like `/news/article/<uuid>` with `text` + `embedding_<dim>` components; decoders decide whether to render them in space (e.g. word-cloud), as text overlay, or as a graph node.

### 2. Mappings — schema mapping docs

A **mapping** is a small JSON/YAML document at a well-known URI (`xrai://schemas/mappings/<id>.json`). It declares how fields from a source stream become XRAI ontology slots.

```json
{
  "xrai_mapping_version": "1.2",
  "id": "arkit-v1",
  "source": { "kind": "arkit", "producer_hint": "Portals iOS app" },
  "ontology": "xrai://ontology/v1",
  "rules": [
    {
      "match":  { "source_type": "ARAnchor" },
      "emit":   {
        "entity_path": "/ar/anchor/{uuid}",
        "archetype":   "Anchor",
        "components":  {
          "transform":  { "from": "transform_mat4", "as": "mat4_to_pose6dof", "units": "m/rad" },
          "confidence": { "from": "tracking_state", "as": "enum_to_float01" }
        },
        "timeline": {
          "log_time":    { "from": "timestamp", "as": "ns" },
          "arkit_frame": { "from": "frame_index", "as": "int64" }
        }
      }
    },
    {
      "match": { "source_type": "ARFaceAnchor.blendShapes" },
      "emit":  {
        "entity_path": "/ar/face/{uuid}/blendshapes",
        "archetype":   "BlendShapes",
        "components":  { "blend_weights": { "from": "*", "as": "dict_float01" } }
      }
    }
  ]
}
```

**Mapping semantics:**

- **Declarative.** No code. A mapping is data, versionable, diffable, signable.
- **Reversible when possible.** A mapping MAY declare its inverse (`emit → source`) so XRAI can drive a source back (e.g., author a scene → write an ARKit `.usda`).
- **Composable.** A source with no single canonical schema (e.g., a raw CSV) picks a mapping at load time; mappings can inherit via `extends`.
- **Public registry.** `xrai://schemas/mappings/` is a community-owned namespace. Third parties register via RFC (or outside the ontology-core via `x-<org>-<id>`).
- **Transform vocabulary.** `as:` values (`mat4_to_pose6dof`, `enum_to_float01`, `ns`, `dict_float01`, `utf8_trim`, `wgs84_to_enu`, …) are drawn from a fixed vocabulary in the spec — no user-defined code execution in the hot path. Extensions via RFC.

### 3. SSE — sparse semantic encoding (wire format)

SSE is the delta shape XRAI runtimes consume and emit. One record per changed component per entity per timeline-step.

| Field | Type | Required | Notes |
|---|---|---|---|
| `entity_path` | string | ✓ | `/scene/anchor_1/hologram_a` (RFC 0010 hierarchy) |
| `archetype` | string | ✗ | optional hint; decoders MAY dispatch on it |
| `component` | string | ✓ | ontology-typed (e.g. `pose_6dof`, `audio_reactive_gain`, `blend_weights`) |
| `timeline` | map<string, scalar> | ✓ | ≥1 entry; `log_time` recommended |
| `payload` | ontology-typed value | ✓ | shape determined by `component`'s ontology entry |
| `delta_kind` | enum `add`/`update`/`remove`/`annotate` | ✓ | `annotate` = metadata-only, doesn't change state |
| `provenance` | map<string, any> | ✗ | source id, mapping id, signer, model version — used by decoders that care |

**Wire-format-agnostic.** SSE is a logical shape. Producers pick:
- **JSON-Patch / JSONL** — text, curl-friendly, good for small scenes, LLM agents, debugging.
- **Apache Arrow IPC stream** — columnar, 60 Hz multiplayer, PyArrow/DuckDB/Polars/Lance native.
- **CBOR / MsgPack** — binary, embedded-device-friendly.
- **Protobuf over gRPC** — enterprise interop (Arrow Flight or custom).

A runtime declares which wire formats it accepts; discovery by MIME:
- `application/vnd.xrai.sse+json`
- `application/vnd.xrai.sse+arrow`
- `application/vnd.xrai.sse+cbor`
- `application/vnd.xrai.sse+protobuf`

All four are semantically equivalent.

### 4. Ontology — what `component` strings mean

`component` strings resolve against the **master ontology** (RFC 0013). That ontology is:

- **Faceted** — every entry is tagged along 12 independent axes (identity, temporality, structure, topology, scope, role, grammar, dimensionality, modality, provenance, unit, trust tier). Decoders dispatch on facet tuples, not a single tree.
- **Learning** — unknown component slugs arrive from ingestion → recorded as candidates → auto-aligned via embeddings → promoted via proposal queue. Producers are never blocked.
- **Self-referential** — the ontology is itself an XRAI document browsable at `xrai://ontology/`. One schema, one toolchain, one query surface.
- **Alias-tolerant** — `heart_rate_bpm`, `hr_bpm`, `pulse_per_minute` all resolve to the same canonical slug. Producers emit any; decoders see the canonical.

Starter corpus for v1.2 (shipped at `xrai-website/ontology/v1.json`, see RFC 0013 §10):

- **Geometric:** `pose_6dof`, `velocity_6dof`, `scale_xyz`, `bounding_box_3d`, `mesh_uri`, `point_cloud_uri`, `depth_image`, `rgb_image`.
- **Material / visual:** `material_params`, `audio_reactive_gain`, `shader_params`, `texture_uri`, `neural_latent`.
- **Semantic:** `text`, `label`, `embedding_<dim>`, `entity_type_uri`, `affordance` (v1.1 hook).
- **Event:** `event_kind`, `actor`, `patient`, `causal_parent` (v1.1 hook).
- **Agent:** `tool_call`, `tool_result`, `thought`, `plan_step`.
- **Telemetry:** `log_level`, `span_id`, `metric_value`.
- **Financial:** `asset_symbol`, `price_quote`, `volume`, `bid_ask`.
- **Linguistic:** `token`, `sentence`, `pos_tag`, `syntax_parse`.
- **Biosignal:** `heart_rate_bpm`, `hrv_rmssd`, `eeg_channel`, `ppg_waveform`.

Every ontology entry links back to prior art (schema.org, Wikidata QIDs, OpenTelemetry semantic conventions, W3C verifiable credentials, WordNet synsets, USD schemas, NIST SI) so XRAI is a **superset-merger**, not a parallel invention. Full governance + learning pipeline in RFC 0013.

### Snapshot projection (v1.0 compatibility)

Given an SSE stream + a `(timeline, t)` query, a runtime projects to a v1.0 JSON doc:

```
for each entity_path E that has received ≥1 delta at t' ≤ t (not later remove):
  entity.id = E
  entity.type = archetype OR inferred from components
  entity.components = { c : latest(payload) for each component c active at t }
  entity.transform = compose(pose_6dof up E's path)
emit { xrai_version:"1.0", scene: { entities:[…], relations:[…], events:[…] } }
```

This guarantees every SSE stream has an isomorphic v1.0 snapshot — the JSON spec stays canonical for humans + LLMs authoring small docs; SSE is the machine-native streaming form.

### Conformance impact

A v1.2 runtime MUST:
1. Accept at least one SSE wire format.
2. Honor ontology-typed components (reject unknown types gracefully — annotate+preserve, don't crash).
3. Project to a v1.0 snapshot on demand.
4. Emit SSE when authoring (so the whole loop is round-trippable).

v1.0/1.1 runtimes are unaffected — they see only the projected JSON.

### Error semantics

- Unknown `component` → preserve as `annotate`, do not drop (Postel's law).
- Unknown `as:` transform in a mapping → reject that mapping entry, keep rest.
- Clock-skewed `timeline.log_time` → accept; decoders handle ordering.

## Alternatives considered

### A — hard-port Rerun's `.rrd` + archetype set
What the earlier draft of this RFC proposed. Rejected because it conflates wire format (Arrow) with semantic shape (archetypes) and forces every ingestion path through Rerun's specific archetype taxonomy. That locks out agent traces, app logs, and generative streams that don't fit an image/mesh/points3d mental model. The current design keeps Arrow as ONE wire format, archetypes (RFC 0010) as ONE component-bundling convention, and opens the door to everything else.

### B — adopt OpenTelemetry as-is
OT's data model is observability-centric (logs, metrics, spans). Missing: spatial entities, hierarchy, transforms, material/shader/audio, relations. XRAI's ontology would become a second-class dialect of OT. Rejected. But XRAI's telemetry-shaped components (`log_level`, `span_id`, `metric_value`) reuse OT semantic conventions verbatim — no reinvention.

### C — adopt USD layers
USD is layered composition, not streaming. Excellent for asset pipelines; poor for 60 Hz deltas. Rejected for the wire layer but kept as an input mapping (`usd → SSE`) and an output decoder (`SSE → usd snapshot`).

### D — no ingestion layer, keep XRAI as author-only format
Status quo. Works for `xra1.com` author pages; falls apart when users ask "can I ingest this ARKit session / LiveKit recording / LLM trace and render it in Portals?" Rejected — the v2.1 embeddings and v3.0 meta-layer roadmap is unbuildable without a stream substrate.

### E — one frozen wire format (Arrow only)
Simpler. Rejected: LLM agents and scripting users author in JSON-Patch; embedded devices prefer CBOR; enterprise prefers protobuf. Wire-format plurality with a single semantic shape is the cheapest path to broad adoption.

## Backwards compatibility

- **v1.0 docs:** unchanged. Every v1.0 doc is a degenerate SSE stream (all `delta_kind=add` at `timeline.log_time = created_at`).
- **v1.1 archetypes (RFC 0010):** natural fit — archetype = recommended component bundle, SSE deltas carry `archetype` as a hint.
- **v1.0/1.1 runtimes:** ignore SSE; consume projected JSON snapshots. No migration required.

## Implementation plan

1. RFC merged. Ontology-v1 frozen (starter set above).
2. `xrai://schemas/mappings/` registry established. First-batch mappings (one per source family in §1, ordered by near-term Portals need):
   - **Tier 1 (dogfood / ships with Portals v4):** `arkit-v1`, `livekit-datachannel-v1`, `rgbd-huedepth-v1`, `mediapipe-pose-v1`, `claude-session-history-v1`, `console-jsonl-v1`, `unity-debuglog-v1`, `mcp-tool-trace-v1`.
   - **Tier 2 (broad adoption surface):** `opentelemetry-v1`, `rerun-rrd-v1`, `ros-bag-v1`, `lerobot-episode-v1`, `webxr-transforms-v1`, `openxr-actions-v1`, `rss-atom-v1`, `bluesky-firehose-v1`.
   - **Tier 3 (long-tail / contributed):** `market-tick-v1`, `ohlcv-bar-v1`, `orderbook-l2-v1`, `natnet-v1`, `azure-kinect-body-v1`, `ios-lidar-v1`, `velodyne-pcap-v1`, `nmea-gps-v1`, `modbus-v1`, `eeg-openbci-v1`, `heart-rate-v1`, `midi-stream-v1`, `kafka-topic-v1`, `mqtt-topic-v1`, `mujoco-tick-v1`, `diffusion-frame-v1`.
3. Reference SSE encoders/decoders in `js/xrai-sse.js` + Python + Rust.
4. LiveKit DataChannel topic `xrai-sse` (supersedes `xrai-delta` wire spec, RFC 0005 updated in parallel).
5. Conformance corpus (RFC 0003) extended — 10 round-trip tests per wire format.
6. Decoder contract ships alongside (RFC 0012).

## Unresolved

- **Backpressure / flow control** — Arrow Flight gives us this; JSON-Patch over WebSocket needs explicit windowing. Defer design to RFC 0009a.
- **Signing / provenance** — `provenance` field is freeform today. A future RFC may bind it to W3C Verifiable Credentials for multi-party scenes.
- **Ontology evolution policy** — component deprecation vs addition. Propose: additions by PR, removals by RFC + 2-version deprecation window.

## Prior art (primary sources only)

- **OpenTelemetry** — unified logs/metrics/traces model, semantic conventions, collector pattern. [spec](https://github.com/open-telemetry/opentelemetry-specification)
- **Apache Arrow + Flight** — columnar + streaming IPC. [docs](https://arrow.apache.org)
- **Rerun `.rrd`** — Arrow-backed multimodal recording; timeline-keyed; entity-path hierarchical. [rerun-io/rerun](https://github.com/rerun-io/rerun)
- **LeRobot dataset** — neutral HDF5/Arrow robot-learning format (rerun-io/lerobot). Sparse semantic episodes.
- **ROS bag / rosbag2** — multi-topic timestamped record-and-replay.
- **JSON-LD** — schema mapping via `@context`. We borrow the mapping idea, reject the RDF triple expansion.
- **USD composition arcs** — layered semantic overlays on 3D scenes.
- **CRDT delta streams** (Yjs, Automerge) — sparse merge semantics for distributed edits.
- **MCP (Model Context Protocol)** — tool call / resource semantic conventions.
- **W3C VC / DID** — provenance signing.

## Future work

- **RFC 0012 — Decoder contract.** What a render / sim / agent / generator consumer declares + emits. Ships with this RFC.
- **RFC 0013 — Ontology v2.** Affordances, counterfactual branches, belief components, narrative-beat timelines.
- **RFC 0014 — Federated streams.** Cross-org XRAI federation (who can subscribe / author / sign).
- **RFC 0015 — Neural-renderer decoder profile.** Diffusion / 3DGS / NeRF conditioning on SSE streams.
- **Lance cold-storage tier** for archived SSE corpora.
- **Auto-mapping from examples.** Given N input samples + M desired SSE outputs, synthesize a candidate mapping via LLM + constraint solver.

## Adoption signals

- ≥3 non-Portals sources publish mappings in the public registry within 6 months.
- ≥2 decoders outside Portals (e.g. a Houdini HDA, a Blender importer, a LangGraph agent) consume SSE natively.
- 1 live demo: ARKit → SSE → LLM agent → procedural VFX decoder → Unity renderer, end-to-end, on device.
- CVPR / SIGGRAPH paper citing XRAI SSE as a shared substrate.
