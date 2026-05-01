# xrai-mcp-server — Spatial MCP for XRAI

**Purpose:** make XRAI readable/writable by any MCP-compatible AI agent (Claude Desktop, Cursor, Cline, OpenAI agents, Gemini-with-MCP-shim).

**Status:** 8 of 11 tools shipped today (see ✅/⚠ markers below). Active impl at [`mcp-server/src/index.ts`](../../../../mcp-server/src/index.ts) — `@h3m/spatial-intelligence-mcp` npm package. Remaining 3 tools ship Week 2.

## Tool surface (normative)

All tools return JSON. All tools handle malformed input gracefully (Postel's law).

**Legend:** ✅ = shipped today · ⚠ = spec only, Week 2

| Tool | Ship | Input | Output | Purpose |
|---|---|---|---|---|
| `compose_scene` | ✅ | `{description: string, clear_existing?: bool}` | scene + XRAI | NL → multi-object scene composition |
| `add_object` | ✅ | `{name, type, position?, scale?, rotation?, material?, color?, animation?}` | added object | Single-object precise spatial placement |
| `query_scene` | ✅ | `{filter?: string}` | objects + bounds | Inspect scene state + spatial relationships |
| `modify_object` | ✅ | `{name, position?, scale?, rotation?, material?, color?, animation?, vfx?}` | modified object | Change properties / attach VFX |
| `export_xrai` | ✅ | `{include_metadata?: bool}` | XRAI v1.0 JSON | Export scene as spatial interchange |
| `get_capabilities` | ✅ | `{}` | feature manifest | Enumerate primitives/materials/anims/VFX/brushes/creators |
| `paint_emit_stroke` | ✅ | `{brush_guid, points: {x,y,z}[], color?, width?, audio_reactive?, id?}` | XRAI `object.paint-stroke` fragment | Free-form stroke, hand-drawn or generated, rendered as tube/quad-strip/hull |
| `paint_emit_parametric` | ✅ | `{creator: "spiral"\|"sphere"\|"lsystem"\|"tree", anchor, end_point?, params?, brush_guid?, seed?, id?}` | XRAI `object.parametric-stroke` fragment (sparse generator rule) | Procedural stroke, sparse-seed DNA expanded by renderer |
| `xrai.parse` | ⚠ | `{doc: string}` | `{valid, normalized, errors}` | Validate + normalize arbitrary JSON as XRAI v1.0 |
| `xrai.walk` | ⚠ | `{graph: XRAI, from: id, max_hops: int}` | subgraph | Traverse associative trails (memex-style) |
| `xrai.render` | ⚠ | `{graph: XRAI, target: "unity\|threejs\|unreal\|playcanvas\|webxr\|visionos"}` | bootstrap code | Emit runtime-specific loader + scene setup |

## Paint tool detailed schemas

### `paint.emit_stroke`

```jsonc
// request
{
  "brushGuid": "2d35bcf0-e4d8-452c-97b1-3311be063130",  // optional; defaults to Flat
  "brushName": "Flat",                                    // alternative to brushGuid
  "points": [[0,0.1,-1.5], [0.1,0.15,-1.5], [0.2,0.2,-1.5]],
  "widths": [0.01, 0.012, 0.015],                         // optional; defaults to 0.01 per point
  "color": "#00ffff",                                     // optional; defaults to "#ffffff"
  "audioReactive": true                                   // optional; defaults to descriptor.m_AudioReactive
}

// response
{
  "xrai_version": "1.1",
  "scene": {
    "entities": [{
      "id": "stroke_<uuid>",
      "type": "object.paint-stroke",
      "params": {
        "brushGuid": "2d35bcf0-e4d8-452c-97b1-3311be063130",
        "brushName": "Flat",
        "color": "#00ffff",
        "audioReactive": true,
        "points": [[0,0.1,-1.5], [0.1,0.15,-1.5], [0.2,0.2,-1.5]],
        "widths": [0.01, 0.012, 0.015]
      }
    }]
  }
}
```

### `paint.emit_parametric`

Creators (named, map 1:1 to `Portals.Paint.Parametric` classes in Unity runtime):

| creator   | params schema                                                  | behavior |
|-----------|----------------------------------------------------------------|----------|
| `sphere`  | `{ segments?: int = 48, spiralTurns?: float = 3 }`             | Lat-lon spiral on sphere surface. Radius = distance(anchor, end). Center = midpoint. |
| `spiral`  | `{ turns?: float = 3, radiusRatio?: float = 0.3, pointsPerTurn?: int = 16 }` | 3D spiral along axis anchor→end. |
| `lsystem` | `{ axiom?: string = "F", rule?: string = "FF[+F][-F][&F][^F]", iterations?: int = 3, angleDeg?: float = 22.5 }` | Turtle grammar: F=forward, +/-=yaw, &/^=pitch, \\// =roll, [/] =push/pop. |

```jsonc
// request (grow a spiral)
{
  "creator": "spiral",
  "params": { "turns": 5, "radiusRatio": 0.4 },
  "anchor": [0, 0, -1.0],
  "end": [0, 1.5, -1.0],
  "brushName": "Neon",
  "color": "#ff00ff"
}

// response
{
  "xrai_version": "1.1",
  "scene": {
    "entities": [{
      "id": "param_<uuid>",
      "type": "object.parametric-stroke",
      "params": {
        "creator": "spiral",
        "creatorParams": { "turns": 5, "radiusRatio": 0.4 },
        "anchor": [0, 0, -1.0],
        "end": [0, 1.5, -1.0],
        "brushGuid": "<resolved from brushName>",
        "color": "#ff00ff",
        "seed": <int>                                       // for reproducibility across runtimes
      },
      "baked": {                                            // optional, for runtimes that don't have creator impl
        "points": [[...], ...],
        "widths": [...]
      }
    }]
  },
  "metadata": {
    "XRAI_generators": [{                                   // voxel spec 023 cross-wire
      "type": "parametric_stroke",
      "entityId": "param_<uuid>",
      "seed": <int>
    }]
  }
}
```

**Sparse-seed principle (constitution §XRAI Philosophy):** response embeds BOTH the generator rule (`creator` + `params` + `seed`) AND the baked point list. Runtimes with native creator impl (e.g. Portals Unity) expand from rule for perfect reproducibility. Runtimes without (e.g. Three.js v1 viewer) fall back to baked points. File size still tiny — ~200 bytes for a complex spiral vs. KB of raw points.

**Voxel integration (spec 023 `XRAI_generators`):** `paint.emit_parametric` outputs the `metadata.XRAI_generators` hint so voxel-world loaders can compose parametric strokes with voxel generators into one scene without rerouting through Unity. Single voice command `"grow a spiral staircase"` = one `paint.emit_parametric(spiral)` call + one `xrai.emit` call for the staircase voxel-world generator, merged via `xrai.merge`.

## Design principles (inherited from §5 of zero-to-one spec)

1. **Open forever** — MIT reference impl, no CLA, no telemetry
2. **Simple** — each tool ≤200 LOC TypeScript
3. **Forgiving** — never throw on malformed input; return `{valid: false, errors: []}` instead
4. **Self-describing** — `xrai.tool_info()` returns the tool schema for discovery <!-- skip-cite-check: design-spec API, not yet implemented -->
5. **Stateless** — server holds no graph state; clients pass full graphs. Persistence is a separate concern (see `xrai-cloud` plan)

## MCP protocol conformance

Conforms to Model Context Protocol spec (Anthropic, Nov 2024):
- stdio transport for local dev
- HTTP+SSE for remote deployment
- Manifest exposes all tools
- Error format follows MCP error envelope

## Reference implementation sketch (TypeScript)

```ts
// server.ts (stub — full impl Week 2)
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const server = new Server({ name: "xrai", version: "0.1.0" });

server.setRequestHandler("tools/list", async () => ({
  tools: [
    { name: "xrai.validate",        description: "...", inputSchema: {...} },
    { name: "xrai.merge",           description: "...", inputSchema: {...} },
    // ... all 9 xrai.* tools
    { name: "paint.emit_stroke",    description: "...", inputSchema: {...} },
    { name: "paint.emit_parametric", description: "...", inputSchema: {...} },
    // 11 tools total
  ]
}));

server.setRequestHandler("tools/call", async (req) => {
  switch (req.params.name) {
    case "xrai.validate":        return validate(req.params.arguments);
    case "xrai.merge":           return merge(req.params.arguments);
    // ...
    case "paint.emit_stroke":    return paintEmitStroke(req.params.arguments);
    case "paint.emit_parametric": return paintEmitParametric(req.params.arguments);
  }
});
```

## Quick-start for adopters (once released)

```bash
npm i @xrai/mcp-server
# Or use npx without install:
npx @xrai/mcp-server
```

Add to Claude Desktop / Cursor / Cline config:
```json
{
  "mcpServers": {
    "xrai": { "command": "npx", "args": ["-y", "@xrai/mcp-server"] }
  }
}
```

Instantly, any MCP-compatible agent gains spatial cognition primitives.

## What this replaces / wins

- Replaces proprietary 3D-scene APIs (Apple RealityKit-only, Unity-only, etc.)
- Wins over: no single format ever given MCP tools before. XRAI-over-MCP is the spatial layer of the agent ecosystem.
