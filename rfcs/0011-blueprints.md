# RFC 0011: Blueprints — viewer state as a shareable, versioned document

- **Status:** Draft
- **Author:** @jamestunick
- **Date:** 2026-04-23
- **Target version:** v1.1 (additive; new MIME type + file extension)
- **Related:** RFC 0004 (visual-diff conformance), RFC 0005 (multiplayer delta)
- **Prior art:** Rerun blueprints (`.rbl` files), VS Code workspace settings, Grafana dashboard JSON

---

## Summary

Separate **what to view** (the XRAI doc — data) from **how to view it** (a Blueprint — layout, selected engine, panel state, filters, timeline axis, camera, theme). Blueprints are their own `.xrai-blueprint.json` files, shareable URL params, and round-trip via File API. Opening an XRAI doc without a blueprint uses an auto-default; loading a blueprint without a doc is an empty-viewer template.

## Motivation

- Today a visitor to `xra1.com?src=<url>` gets the default 3d-force-graph layout. There's no way for an author to say "open this doc with the timeline panel pinned, filter to `archetype=Event.*`, engine=echarts, camera here, theme dark."
- Rerun ships this exact pattern (`.rbl` blueprint files) and it's the single most-requested feature in their v0.5–0.7 feedback threads. It turns "look at this recording" into "look at this recording the way I looked at it."
- It's also what unlocks teaching: a lesson is a blueprint. A debugging session is a blueprint. A demo is a blueprint. Without it every visitor re-invents the view.

## Design

### File + MIME

- `.xrai-blueprint.json` / `application/vnd.xrai.blueprint+json`

### Schema

```json
{
  "xrai_blueprint_version": "1.1",
  "id": "<uuid-v4>",
  "created_at": "<ISO-8601>",
  "target_doc": { "uri": "<xrai-doc-uri>", "version_pin": "v1.0" },
  "engine": "force-graph | echarts | playcanvas | needle | icosa",
  "views": [
    {
      "id": "<local-id>",
      "kind": "scene3d | graph2d | timeline | text_log | scalar | tensor | table",
      "origin_path": "/scene",
      "filter": { "archetype": ["Hologram","Light"], "entity_path_prefix": "/scene/anchor_1" },
      "camera": { "position":[0,2,5], "look_at":[0,0,0] },
      "timeline": { "axis":"scene_frame", "range":[0,1800] }
    }
  ],
  "panels": { "left":{"width":280,"collapsed":false}, "bottom":{"height":140} },
  "theme": "dark | light | auto",
  "metadata": {}
}
```

### URL shape

- `xra1.com?src=<doc-uri>&blueprint=<blueprint-uri>` — open doc with blueprint.
- `xra1.com?blueprint=<uri>` — open blueprint's `target_doc`.
- `?engine=<name>` overrides blueprint engine (escape hatch).

### Default blueprint

If none is supplied, the viewer synthesizes a blueprint from the doc:
1. Engine = per `VIEWER_ARCHITECTURE.md` per-target matrix.
2. One `scene3d` view over `/`.
3. One `graph2d` view if `|entities|+|relations| > 50`.
4. One `timeline` view if any event or Arrow chunk has `timeline.scene_frame` or `timeline.log_time`.

The synthesized blueprint MAY be exported ("📋 Save Blueprint") so users can tune + re-share.

### Multiplayer

LiveKit `xrai-blueprint` DataChannel topic (RFC 0005). When a host changes their blueprint, participants can accept or decline. Two modes:
- **Director mode** — host's blueprint broadcasts to all. Participants see what host sees. For demos / onboarding.
- **Parallel mode** — participants' blueprints are independent. Shared doc, personal views. Default.

### Conformance impact

- A v1.1 runtime MUST render a doc identically whether a blueprint is supplied with defaults or synthesized from the doc. (No hidden render-only state.)
- A blueprint referencing an unknown `engine` falls back to `force-graph`.
- A blueprint referencing a filter that matches zero entities renders an empty view (not an error).

### Error semantics

Malformed blueprint: warn + fall back to synthesized default. Never hard-fail — a bad blueprint should never block the user from seeing the data.

## Alternatives considered

### A — URL query params only (no blueprint file)
Worked until ~20 params. Rerun tried it; query strings became unreadable + unshareable. Rejected.

### B — embed viewer state inside the XRAI doc (in `metadata`)
Rejected: conflates what-to-view with how-to-view. Breaks content reuse — the same doc might want 10 different views for 10 audiences.

### C — viewer-specific blueprint formats (one per engine)
Rejected: defeats the purpose of cross-engine parity. Users authoring for `force-graph` shouldn't silently break on `needle`.

### D — defer to v2.0
Rejected: the cost of NOT having this is that every demo / tutorial / paper / talk that opens XRAI today reinvents the view. Ship additive in v1.1.

## Backwards compatibility

- Zero impact on v1.0 docs. Blueprints are a separate file + MIME.
- Runtimes that don't implement blueprints ignore the `?blueprint=` URL param.
- Migration: none needed.

## Implementation plan

1. Merge RFC. Version bump to v1.1.
2. Ship `js/xrai-blueprint.js` — parser + synthesizer + URL-param glue.
3. Add "📋 Save/Load Blueprint" buttons in `index.html` topnav (already has Save/Load XRAI pattern — copy).
4. Wire LiveKit `xrai-blueprint` topic (director mode).
5. Each runtime adapter (`runtimes/echarts`, `runtimes/needle`, `runtimes/playcanvas`, `runtimes/icosa`) implements blueprint → local-state mapping.
6. Conformance: RFC 0004 visual-diff extends to `(doc, blueprint)` pairs.

## Unresolved

- **Blueprint inheritance** — can blueprint B "extend" blueprint A? Defer to v1.2. Default: no inheritance, flat.
- **Selection state** — should which nodes are selected be part of the blueprint, or session-only? Propose: session-only unless `views[].selection` is explicitly set.
- **Author identity** — do blueprints carry `author: {...}` like docs? Yes — same `author` schema.

## Prior art

- **Rerun blueprints** — [docs/concepts/blueprint](https://rerun.io/docs/concepts/blueprint). `.rbl` Arrow format; viewer serializes its full state; users share `.rbl` files + URLs. Mature since v0.15.
- **Grafana dashboards** — JSON, shareable, versioned. Closest web analogue.
- **VS Code workspace settings (`.code-workspace`)** — separates project data from editor view.
- **Jupyter notebook view state** — cautionary tale; coupled to data, rotted quickly.

## Future work

- Blueprint **fragments** — a blueprint can compose named view-presets (e.g. `@debug`, `@demo`, `@teaching`) via inheritance (v1.2).
- **MCP server** tool `xrai-mcp blueprint.synthesize(doc)` — LLMs can author blueprints.
- **A/B blueprints** — open two side-by-side, diff rendered output (driven by RFC 0004 conformance harness).
- Integration with `configs.html` pipeline editor: a blueprint is a special pipeline with a viewer sink.

## Adoption signals

- ≥10 blueprint files shared via `xra1.com?blueprint=` URLs within 6 months of launch.
- External adopter publishes a tutorial that ships a blueprint.
- Portals iOS app (v4+) opens `portals://xrai/open?src=...&blueprint=...` with blueprint applied.
