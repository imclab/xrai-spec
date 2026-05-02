# RFC 0014 — Capture Stream Extension

**Status:** DRAFT (2026-05-02) | **Author:** Claude Opus 4.7 | **Supersedes:** none | **Required for:** spec 026 T026.4.1 / T026.4.2 / T026.4.3 (HologramRecorder/Player)

## Motivation

XRAI v1.0 ([SPEC.md](../SPEC.md)) defines static scene snapshots — entities, anchors, relations frozen at one moment. Examples [04-hologram](../examples/04-hologram.xrai.json) + [06-ar-body-hand](../examples/06-ar-body-hand.xrai.json) capture initial state but cannot represent **time-series capture data** (per-frame joint positions, audio samples, VFX parameter changes) needed for hologram recording + playback.

This RFC adds a `capture` envelope without modifying the v1.0 base schema. A capture XRAI document = base scene + frame stream.

## Non-Goals

- New media codec (use existing H.264 + Opus refs)
- Replacing `*.unity` scene serialization (XRAI captures are export, not source)
- Streaming protocol (RFC 0009 covers stream ingestion separately)

## Schema

### Top-level envelope

```jsonc
{
  "xrai_version": "1.0",
  "id": "uuid",
  "created_at": "iso8601",
  "author": {...},   // base
  "origin": {...},   // base
  "metadata": {...}, // base + capture-specific keys (see below)
  "scene": {...},    // base — initial scene at t=0 (anchors + entities + relations)
  "capture": {       // NEW envelope
    "duration_ms": 5000,
    "frame_rate": 30,
    "frames": [...],
    "media": [...]   // optional media-file refs (H.264/Opus/etc)
  }
}
```

### `capture.frames[]`

Each frame is a sparse delta from the prior frame (or scene init for frame 0):

```jsonc
{
  "t_ms": 0,                              // ms since capture start
  "anchor_updates": [                     // sparse — only changed anchors
    {"id": "anchor_hand_l", "transform": {...}, "joints": [...]}
  ],
  "entity_updates": [                     // sparse — only changed entities
    {"id": "trail_r", "components": [{"type": "vfx.ribbon", "props": {"intensity": 0.8}}]}
  ],
  "events": [                             // discrete events (gesture, voice, ar)
    {"type": "gesture.pinch", "anchor": "anchor_hand_l", "strength": 0.92}
  ]
}
```

### `capture.metadata` extensions

```jsonc
{
  "capture_kind": "hologram" | "scene" | "interaction",
  "input_sources": ["arkit-v1#ARBodyAnchor", "holokit-v1#HandPose", "mic"],
  "compression": "delta" | "none",
  "playback_loop": false
}
```

### `capture.media[]` (optional, references external files)

```jsonc
[
  {"id": "audio_main", "kind": "audio/opus", "uri": "media/audio.opus", "duration_ms": 5000},
  {"id": "depth_color", "kind": "video/h264+depth", "uri": "media/depth_color.mp4"}
]
```

## Frame Encoding Rules

1. **Frame 0** SHOULD include all anchors + entities to be replayed (or rely on `scene` init).
2. **Sparse**: omit `anchor_updates` / `entity_updates` if nothing changed that frame.
3. **Time monotonic**: `t_ms` MUST be non-decreasing.
4. **Joint arrays** follow the source schema per `input_sources` (e.g. ARKit 91-joint, HoloKit 21-joint).
5. **Events** are discrete (gestures, voice triggers, AR plane add/remove); use `entity_updates` for continuous changes.

## Round-Trip Contract

A conforming HologramPlayer MUST:
1. Load `scene` block as initial state via existing XRAI loader.
2. For each frame, apply `anchor_updates` + `entity_updates` + dispatch `events`.
3. Honor `t_ms` for playback timing (allow ±1 frame jitter).
4. Loop if `metadata.playback_loop === true`.

## Examples (forthcoming)

- `examples/15-hologram-capture-5s.xrai.json` — 5s lifelike_hologram capture (T026.4.2 deliverable)
- `examples/16-ar-body-capture-loop.xrai.json` — 10s body capture, loops (T026.4.3 deliverable)

## Open Questions

- **Q1:** Cap on `frames[]` size (memory/parse cost). Proposal: 30s @ 60fps = 1800 frames; chunk longer captures into separate XRAI docs.
- **Q2:** Compression: delta-only this RFC. RFC-15 candidate for binary delta encoding (msgpack / protobuf).
- **Q3:** Per-joint quantization (16-bit fixed-point) — defer to RFC-15.
- **Q4:** Media file co-location — `media/` sibling dir vs CDN URI. Defer to deployment-time policy.

## Implementation Path (spec 026 cross-ref)

| Task | RFC artifact | LOC est |
|---|---|---|
| T026.4.0 LiveRecorder re-enable | dependency | ✅ shipped `12a3b1323` |
| T026.4.1 (this RFC) | RFC 0014 + 2 example files | ~250 |
| T026.4.2 HologramRecorder runtime | C# component reads scene + writes frames per Update | ~200 LOC |
| T026.4.3 HologramPlayer runtime | C# component loads XRAI + applies frames | ~150 LOC |
| T026.4.4 Bridge messages | `hologram_record_start/stop`, `hologram_play_url` | ~50 LOC |

## References

- [XRAI v1.0 SPEC](../SPEC.md) — base schema
- [04-hologram.xrai.json](../examples/04-hologram.xrai.json) — initial-state pattern this extends
- [06-ar-body-hand.xrai.json](../examples/06-ar-body-hand.xrai.json) — joint-source binding pattern
- [RFC 0009 stream-ingestion](0009-stream-ingestion-sparse-semantic-encoding.md) — sibling stream concept (live, not record/replay)
- [RFC 0011 blueprints](0011-blueprints.md) — entity templating pattern
- spec 026 tasks.md Phase 4 — implementation plan
- spec 004 [xrai_node.schema.json](../../../004-scene-save-xrai-format/xrai_node.schema.json) — node extension contract
