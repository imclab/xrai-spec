# XRAI Use Cases — curated (NOT reinvented)

> **VPS scale note (honest):** Portals' selected VPS is **Apple ARKit `ARWorldMap`** (native iOS, on-device, no vendor service — matches our no-lock-in rule). **ARWorldMap covers room + building + small-neighborhood scale.** For *geospatial-scale* (city + landmark), Portals selected **Cesium for Unity** (Apache 2.0, OGC 3D Tiles streaming, globe-anchored double-precision coordinates) — fully researched + verified compatible in `bleeding-edge-jt:docs/_archive/kb-followups/20260221_CESIUM_GEOSPATIAL_PLATFORM_RESEARCH.md`. Currently **T2 (researched, post-MVP cherry-pick)**, not yet on main. Paired with Niantic SPZ format (MIT, 90% Gaussian splat compression — format only, not their service) + Khronos KHR_gaussian_splatting (Q2 2026 ratification) for XRAI-compatible spatial data. No vendor lock-in: Cesium is Apache-2.0 self-hostable.
>
> **Labels below use ⌂ (room-scale, ships today on ARWorldMap) vs 🌍 (geospatial-scale, **Cesium for Unity** — post-MVP cherry-pick from `bleeding-edge-jt`).**


Every example below maps a single user voice command to (a) the XRAI payload that gets emitted, (b) the existing Portals spec that implements it, (c) which runtime decodes it. These are not new product ideas — they codify work already specced and partially shipped.

> **Principle:** XRAI is the format; existing Portals specs are the implementations. Use cases below are *composable recipes* over existing primitives.

---

## 🎮 1. Mini games — "make a game where cubes fall from the sky and I catch them"

**Existing spec:** [`specs/023-voxel-world-generator/PROCEDURAL_WORLDS_SPEC.md`](../../../specs/023-voxel-world-generator/PROCEDURAL_WORLDS_SPEC.md) (voice → procedural XRAI world, leverages existing voice → Gemini → batch_execute → SceneComposer pipeline).

**XRAI payload (conceptual):**
```json
{
  "xrai_version": "1.0",
  "scene": {
    "entities": [
      {"id":"player","type":"object.hand-anchor"},
      {"id":"spawner","type":"object.emitter","params":{"spawnRate":1,"pattern":"above","countdown":30}},
      ...6 cubes as primitives with gravity + collide-with=player
    ],
    "relations": [
      {"type":"reacts-to","from":"spawner","to":"player","props":{"event":"catch","reward":+1}}
    ]
  }
}
```

**Decoded by:** Portals Unity runtime (`SceneComposer` + `ObjectAnimator.gravity` + `WireSystem` for score binding). Three.js viewer renders same XRAI as a 2D top-down version.

**Time to build:** 0 new code in Portals. Already works via `batch_execute`. Just needs XRAI wrapper.

---

## 🌍 2. Dynamic worlds — "create a forest world around me"

**Existing spec:** [`specs/023-voxel-world-generator/PROCEDURAL_WORLDS_SPEC.md`](../../../specs/023-voxel-world-generator/PROCEDURAL_WORLDS_SPEC.md) — Phase 2 ships `XRAI_generators` extension: sparse generation rules (biome, density, seeds) instead of flat geometry. "XRAI = DNA, not organism."

**XRAI payload:**
```json
{
  "scene": {
    "entities": [{
      "id":"forest_1","type":"generator.voxel-world",
      "params":{"biome":"forest","seed":12345,"radius":10,"density":0.7}
    }]
  }
}
```

**Decoded by:** Unity runtime expands generator at runtime → trees, rocks, terrain. Three.js viewer renders lower-LOD version. Unreal/PlayCanvas runtimes can re-expand from same seed → identical world. **Sparse → rich.**

**Prior-art reference corpus:** `specs/023-voxel-world-generator/_ref/` — 80+ procedural asset types in ~3000 LOC (TreeGenerator, BiomeGenerator, etc.). Port algorithms, not renderer.

---

## 🎨 3. Artworks — "paint a glowing spiral that reacts to my voice"

**Existing spec:** [`specs/009-paint-ar-openbrush/spec.md`](../../../specs/009-paint-ar-openbrush/spec.md) — Unity-side GeometryBrush + 5 audio-reactive shaders + scene save/load via XRAI.

**XRAI payload:**
```json
{
  "scene": {
    "entities": [
      {"id":"stroke_1","type":"object.paint-stroke",
       "params":{"brush":"neon","path":[[0,0,-1],[0.1,0.2,-1],...],"color":"cyan",
                 "shader_features":["AUDIO_REACTIVE","GLOW"]}}
    ],
    "relations": [
      {"type":"reacts-to-audio","from":"stroke_1","props":{"band":"treble","intensity":2.0}}
    ]
  }
}
```

**Decoded by:** Unity runtime renders with GeometryBrush. Three.js/PlayCanvas viewer renders static polyline approximation.

---

## 🌐 4. Spatial intelligence lens on a webpage — "show me this Wikipedia article as a memory palace"

**Existing spec:** [`specs/006-kb-visualizer/spec.md`](../../../specs/006-kb-visualizer/spec.md) + [`hypergraph-architecture.md`](../../../specs/006-kb-visualizer/hypergraph-architecture.md) + [`spatial-hypergraph-primitives.md`](../../../specs/006-kb-visualizer/spatial-hypergraph-primitives.md) — converts KB/repo/runtime → hypergraphs → spatial visualization.

**Flow:**
1. User speaks command while viewing webpage / CLI / doc
2. jARvis sends scraped content to LLM with XRAI skill prompt
3. LLM emits XRAI: entities = concepts/people/places/events, hyperedges = relations, anchored spatially
4. Viewer renders as walkable 3D space

**XRAI payload (excerpt):**
```json
{
  "scene": {
    "entities": [
      {"id":"section_1","type":"object.knowledge-node","props":{"title":"...","excerpt":"...","source_url":"..."}},
      ...
    ],
    "relations": [
      {"type":"references","from":"section_1","to":"section_5","props":{"text":"..."}}
    ]
  }
}
```

**Decoded by:** Three.js viewer for web (quickest demo). Unity runtime for AR/VR walkable memory palace.

**Already partially built:** `specs/006-kb-visualizer` ships 23 visual refs + hypergraph arch + scripts/kb-cli.sh.

---

## 🧠 5. Agentic HUD / "Jarvis"-style overlay — "show me what's interesting in this room"

**Existing spec:** [`specs/021-pthi/spec.md`](../../../specs/021-pthi/spec.md) — **PTHI** = Predictive Threaded Hyperintelligence. "Fighter pilot HUD meets Jarvis meets Palantir." Smart mouse + smart menu + smart connector + smart tagger + smart visualizer.

**Flow:**
1. Glasses camera → jARvis notices objects/texts/people in view
2. jARvis emits XRAI annotations anchored to world positions
3. HUD renders "there when you need it, gone when you don't"

**XRAI payload (streaming events):**
```json
{
  "scene": {
    "events": [
      {"id":"e1","t":"...","type":"highlight","entity":"world_anchor_pos[x,y,z]",
       "props":{"label":"Engineering book — you bookmarked this 2 weeks ago","importance":0.8}}
    ]
  }
}
```

**Decoded by:** Unity runtime (AR anchors + UI overlays). WebXR viewer for browser-based HUD demo. Reference design: `specs/018-wire-editor-modes` + `specs/019-ecs-composer`.

---

## 🎭 6. Lens on existing camera — "make everything look like Ghibli"

**Existing spec:** [`specs/024-neural-filters/spec.md`](../../../specs/024-neural-filters/spec.md) — Unity Sentis + Keijiro URP RendererFeatures for whole-scene style transfer (Ghibli, anime, glitch, retro, painterly).

**XRAI payload:**
```json
{
  "scene": {
    "entities": [{
      "id":"filter_1","type":"camera.style-filter",
      "params":{"preset":"ghibli","strength":0.85,"target":"camera.main"}
    }]
  }
}
```

**Decoded by:** Unity runtime applies URP render feature. Web viewer applies post-process shader approximation.

---

## 🧩 7. Shared thinking space — "invite Alice into this scene"

**Existing spec:** [`specs/010-multiplayer-normcore/`](../../../specs/010-multiplayer-normcore/) + XRAI personal+federated namespaces (§5.1 of zero-to-one).

**Flow:**
1. User speaks invite command
2. jARvis exports current scene slice as XRAI + signed provenance
3. Shared with Alice via federated graph
4. Alice's Portals app decodes → renders same scene in her space, updates propagate via CRDT

**XRAI URI example:**
```
xrai://shared/<uuid>/scene/<entity>?invite=alice&perm=edit
```

**Decoded by:** Unity runtime + hosted XRAI cloud (commercial layer per §5.4).

---

## 🔧 8. CLI / IDE lens — "turn this codebase into a 3D city"

**Existing spec:** [`specs/006-kb-visualizer/spec.md`](../../../specs/006-kb-visualizer/spec.md) already covers repo visualization. **MegaBrain orchestration** ([`specs/017-megabrain-orchestration/spec.md`](../../../specs/017-megabrain-orchestration/spec.md)) wires CLI/toolchain telemetry into the same hypergraph.

**XRAI payload:**
```json
{
  "scene": {
    "entities": [
      {"id":"module_a","type":"object.code-module","params":{"lines":1200,"commits":340}},
      {"id":"module_b","type":"object.code-module","params":{"lines":500,"commits":80}}
    ],
    "relations": [
      {"type":"imports","from":"module_a","to":"module_b"},
      {"type":"changed-together","from":"module_a","to":"module_b","props":{"strength":0.9}}
    ]
  }
}
```

**Decoded by:** Three.js viewer for browser (most practical demo). Unity runtime for AR/VR walkable codebase. Lines-of-code = building height. Change coupling = bridges.

---

## 🎬 9. Memex — "show me what I was working on last Tuesday"

**Existing spec:** constitution `XRAI Philosophy: The Code of Living Scenes` ([`specs/constitution.md#XRAI-Philosophy`](../../../specs/constitution.md)) + `specs/004-scene-save-xrai-format/` (scene persistence).

**Flow:**
1. jARvis queries personal XRAI graph by timestamp range
2. Returns subgraph of scenes/events/files/conversations
3. Viewer renders as spatial timeline — each day a room, each session a floating workspace ghost

**XRAI payload:** graph slice via `xrai.walk(from: "today", backward: "7d")` MCP tool.

**Decoded by:** Unity runtime renders rooms; Three.js viewer renders web timeline.

---

## ✈️ 11. Flugtag — "launch me off a pier in a flying bathtub with wings"

**Existing specs:** [`specs/002-unity-advanced-composer/spec.md`](../../../specs/002-unity-advanced-composer/spec.md) + [`specs/019-ecs-composer/`](../../../specs/019-ecs-composer/) (ECS physics) + [`specs/023-voxel-world-generator/`](../../../specs/023-voxel-world-generator/) (procedural pier).

**XRAI payload:**
```json
{
  "scene": {
    "anchors": [{"id":"pier","world_pos":[0,0,0]}],
    "entities": [
      {"id":"platform","type":"object.primitive","model_id":4,
       "transform":{"position":[0,2,0],"scale":[3,0.2,2]}},
      {"id":"contraption","type":"object.glb","url":"...flying-bathtub.glb",
       "transform":{"position":[0,2.5,0]},
       "physics":{"mass":80,"drag":0.3,"wing_area":4.0}},
      {"id":"wind","type":"object.emitter","params":{"pattern":"stream","direction":[0,0,-1],"intensity":0.6}}
    ],
    "relations": [
      {"type":"wire-binds","from":"hand.tilt","to":"contraption","props":{"target":"orientation","gain":1.5}},
      {"type":"reacts-to-audio","from":"wind","props":{"band":"treble","mapping":"intensity"}},
      {"type":"parent-of","from":"pier","to":"platform"}
    ],
    "events": [
      {"type":"trigger","entity":"contraption","params":{"on":"voice:launch","action":"physics.release"}}
    ]
  }
}
```

**Decoded by:** Unity runtime (existing `ObjectAnimator.gravity` + hand-tracking via HoloKit + audio). Three.js viewer with rapier.js/cannon-es physics for web variant.

**Flow:** User stands on "pier" anchor → voice "launch!" → contraption tips over edge → hand tilt steers for distance → splash. Leaderboard = XRAI events table, sortable by horizontal distance.

**Build cost:** 0 new bridge messages. Composition of existing primitives + ECS physics.

---

## 🏁 12. Racing — "build a rainbow-road track around my living room"

**Existing specs:** [`specs/023-voxel-world-generator/PROCEDURAL_WORLDS_SPEC.md`](../../../specs/023-voxel-world-generator/PROCEDURAL_WORLDS_SPEC.md) (procedural track generation) + [`specs/019-ecs-composer/`](../../../specs/019-ecs-composer/) (wire-driven car) + [`specs/011-body-face-hand-space-tracking-scanning/`](../../../specs/011-body-face-hand-space-tracking-scanning/) (room scan for anchor path).

**XRAI payload:**
```json
{
  "scene": {
    "entities": [
      {"id":"track","type":"generator.procedural-path",
       "params":{"style":"rainbow-road","loop":true,"room_scan_ref":"current",
                 "width":0.4,"height_variance":0.3,"segments":40,"seed":42}},
      {"id":"car","type":"object.glb","url":"...kart.glb",
       "transform":{"scale":[0.1,0.1,0.1]},"physics":{"mass":5,"traction":0.9}},
      {"id":"hud","type":"object.pthi-hud","params":{"show":["speed","lap","position"]}}
    ],
    "relations": [
      {"type":"wire-binds","from":"hand.thrust","to":"car","props":{"target":"forward_force","gain":20}},
      {"type":"wire-binds","from":"hand.steer","to":"car","props":{"target":"turn","gain":2}},
      {"type":"follows","from":"car","to":"track"}
    ],
    "events": [
      {"type":"checkpoint-cross","entity":"car","params":{"lap_time_logged":true}}
    ]
  }
}
```

**Decoded by:** Unity runtime (procedural track materializes in-room → hand-steered car). Three.js viewer shows top-down racing on the same XRAI. Unreal/PlayCanvas replays same track from seed.

**Flow:** Voice generates a track that wraps AROUND actual furniture (room scan anchors). Hand gestures = throttle + steer. Lap times stored as XRAI events → personal leaderboard across sessions. Share XRAI file = friends race the same track in their rooms.

**Build cost:** procedural path generator (new v1.1 `generator.procedural-path` type; same pattern as spec 023 voxel worlds). Rest is existing primitives.

---

## 🪂 13. Sky diving — "drop me from 10,000 feet over my couch"

**Existing specs:** [`specs/021-pthi/spec.md`](../../../specs/021-pthi/spec.md) (HUD altitude/telemetry) + [`specs/009-paint-ar-openbrush/spec.md`](../../../specs/009-paint-ar-openbrush/spec.md) (audio-reactive wind shader) + [`specs/003-hologram-telepresence/`](../../../specs/003-hologram-telepresence/) (camera tracking for body orientation).

**XRAI payload:**
```json
{
  "scene": {
    "anchors": [{"id":"landing","world_pos":[0,0,-2]}],
    "entities": [
      {"id":"sky","type":"object.environment","params":{"preset":"clouds-above","altitude_m":3000}},
      {"id":"jumper","type":"object.body-anchor","physics":{"drag":"body-pose-dependent"}},
      {"id":"parachute","type":"object.primitive","model_id":4,
       "transform":{"scale":[0,0,0]},"state":"stowed"},
      {"id":"wind","type":"object.emitter","params":{"pattern":"streaks","intensity":1.0,"audio_reactive":true}},
      {"id":"hud","type":"object.pthi-hud",
       "params":{"show":["altitude_m","vspeed_ms","body_orientation","landing_distance"]}}
    ],
    "relations": [
      {"type":"wire-binds","from":"body.pose","to":"jumper","props":{"target":"drag","mapping":"pose-to-drag-lookup"}},
      {"type":"trigger","from":"gesture.arms-spread","to":"parachute","props":{"action":"deploy","scale_to":[3,3,3]}},
      {"type":"reacts-to-audio","from":"wind","props":{"band":"full","intensity":"from_vspeed"}}
    ],
    "events": [
      {"type":"altitude-cross","params":{"thresholds_m":[2000,1000,500,100,0]}},
      {"type":"landing","entity":"landing","params":{"score":"distance_from_center + landing_vspeed"}}
    ]
  }
}
```

**Decoded by:** Unity runtime (body-tracking via HoloKit/ARKit + audio for wind whoosh + parachute deployment animation). visionOS variant on Vision Pro = actual sky-field around user. Three.js web version = 2D top-down score attack.

**Flow:** Voice drops jumper from altitude over a real couch (anchor). Body pose (tracked via device camera) = belly-flat / head-down / arms-back determines drag + speed. Gesture arms-spread = deploy chute. HUD shows telemetry. Land on couch = score. Wind shader = existing audio-reactive system from Paint-AR.

**Build cost:** body-pose-to-drag lookup table (new component) + parachute deploy animation. Everything else is existing primitives + events + HUD.

---

## 🏗 10. Architecture walk-through — "show me the house we're designing at full scale"

**Existing spec:** `specs/022-universal-asset-io` + existing GLB loader in Portals.

**XRAI payload:**
```json
{
  "scene": {
    "anchors": [{"id":"room_anchor","world_pos":[0,0,0]}],
    "entities": [
      {"id":"model","type":"object.glb","url":"https://.../house.glb",
       "transform":{"position":[0,0,0],"scale":[1,1,1]},
       "relation":{"anchored_to":"room_anchor"}}
    ]
  }
}
```

**Decoded by:** any runtime. Same XRAI file works in Portals (AR), Three.js (web preview), Unreal (walkthrough), visionOS (tabletop scale).

---

## 🔑 14. Mundane: "where did I leave my keys?"

**Existing specs:** [`specs/021-pthi/spec.md`](../../../specs/021-pthi/spec.md) (smart tagger + persistent memory) + [`specs/011-body-face-hand-space-tracking-scanning/`](../../../specs/011-body-face-hand-space-tracking-scanning/) (space scanning) + [`specs/004-scene-save-xrai-format/`](../../../specs/004-scene-save-xrai-format/) (persistent XRAI) + constitution `XRAI Philosophy` (memex).

**XRAI payload (incremental — grows with every glance):**
```json
{
  "scene": {
    "anchors": [{"id":"home","persistent":true}],
    "entities": [
      {"id":"keys_2026_04_22_09_14","type":"object.real-world-instance",
       "params":{"class":"keys","confidence":0.94,"last_seen_world_pos":[1.2,0.8,-2.3],
                 "anchor":"home","bbox_px":[...],"camera_frame_uri":"..."}}
    ],
    "events": [
      {"id":"e1","t":"2026-04-22T09:14:03Z","type":"object-seen","entity":"keys_2026_04_22_09_14",
       "props":{"source":"glasses.camera.passthrough"}}
    ]
  }
}
```

**Flow:**
1. Camera (glasses / phone) passively logs object detections into personal XRAI graph — one event per confident sighting, anchored to world position + room
2. User asks "where did I leave my keys?" → jARvis queries graph: `xrai.query(graph, "last object-seen event where class=keys")`
3. Viewer shows arrow / waypoint / highlighted position in AR + timeline ("last seen 2h ago on kitchen counter")

**Decoded by:** Portals Unity runtime (AR waypoint + HUD). Web viewer = map pin + thumbnail. visionOS = anchor glows in-world.

**Build cost:** detection pipeline is existing Sentis (spec 007-hand-tracking + 024-neural-filters both already use it). Graph-append on detection is new MCP tool (planned `xrai.append` — already in mcp-server spec).

**Why this specific demo matters:** "where did I leave my keys" is THE proof of memex. Everyone has the problem. No AR headset today solves it. Portals + XRAI + persistent graph = first product that does. Mundane = viral.

---

## 🌱 15. Sample the real world — "make trees that look like this one / music like this room / chairs like this one"

**Existing specs:** [`specs/022-universal-asset-io/`](../../../specs/022-universal-asset-io/) (asset ingestion) + [`specs/023-voxel-world-generator/PROCEDURAL_WORLDS_SPEC.md`](../../../specs/023-voxel-world-generator/PROCEDURAL_WORLDS_SPEC.md) (seed-based procedural) + [`specs/024-neural-filters/spec.md`](../../../specs/024-neural-filters/spec.md) (style capture via Sentis) + constitution `XRAI Philosophy: "Near infinite informational richness from sparse, elegant seeds"`.

**XRAI payload (seed → generator):**
```json
{
  "scene": {
    "entities": [
      {"id":"real_tree_sample","type":"object.real-world-capture",
       "params":{"source":"camera.photo","timestamp":"...","embedding":[...],
                 "class":"tree","extracted_features":{"color_palette":["#3a5","#281"],
                  "branch_density":0.7,"foliage_shape":"round","bark_texture_uri":"..."}}},
      {"id":"tree_generator_seeded","type":"generator.foliage",
       "params":{"seed_from":"real_tree_sample","count":20,"radius":5,
                 "variation":0.3}}
    ]
  }
}
```

**Flow:**
1. User points camera at real tree / chair / room / song / texture → taps capture / says "sample this"
2. Multimodal LLM + vision encoder extract features → stored as XRAI seed entity
3. User says "make 20 like this" → generator emits procedural variants constrained by the seed
4. Result renders as XRAI scene; variants inherit from seed's embedding + explicit features

**Works across modalities:**
- **Visual seed → 3D generation:** sample real tree → generate forest of similar trees
- **Audio seed → music generation:** sample ambient room sound → generate matching soundtrack
- **Texture seed → material generation:** sample fabric → fabric variants
- **Motion seed → animation generation:** sample someone dancing → generate variants

**Decoded by:** Unity runtime + procedural generators (spec 023). Three.js web viewer for 3D. visionOS for spatial variants. Any runtime consumes same XRAI.

**Build cost:** multimodal capture + seed-extraction is v1.1 generator extension. The generators themselves already exist (spec 023 has 80+ procedural types). This is the "XRAI DNA, not organism" principle from constitution — **compressed seeds, infinite expansion.**

**Why this is the real unlock:** sampling reality as seed turns every phone camera into a creation tool. Kills 99% of 3D-asset marketplaces overnight — you don't download trees, you sample them from your yard.

---

## 🌐 16. "Make my website 3D" — lens on any existing web page

**Existing specs:** [`specs/006-kb-visualizer/spec.md`](../../../specs/006-kb-visualizer/spec.md) + [`hypergraph-architecture.md`](../../../specs/006-kb-visualizer/hypergraph-architecture.md) + use-case #4 (memory palace) above, **but different angle**: here we preserve the site's content + interaction model and re-render it spatially, not abstract it into a graph.

**XRAI payload:**
```json
{
  "scene": {
    "entities": [
      {"id":"page_root","type":"object.web-container","params":{"url":"https://h3m.ai","viewport":[1200,800]}},
      {"id":"nav","type":"object.web-subtree","params":{"selector":"nav","layout":"floor_ring"}},
      {"id":"hero","type":"object.web-subtree","params":{"selector":"#hero","layout":"billboard","scale":2}},
      {"id":"articles","type":"object.web-subtree","params":{"selector":"article","layout":"staggered_shelves","count":"auto"}},
      {"id":"footer","type":"object.web-subtree","params":{"selector":"footer","layout":"base_platform"}}
    ],
    "relations": [
      {"type":"parent-of","from":"page_root","to":"nav"},
      {"type":"parent-of","from":"page_root","to":"hero"},
      {"type":"parent-of","from":"page_root","to":"articles"},
      {"type":"parent-of","from":"page_root","to":"footer"},
      {"type":"links-to","from":"hero","to":"articles","props":{"style":"particle_trail"}}
    ]
  }
}
```

**Flow:**
1. jARvis / browser extension scrapes DOM + computes semantic layout (hero / nav / sections / footer / CTA)
2. Emits XRAI with `object.web-subtree` entities + relation-based layout hints
3. Runtime decodes: WebXR viewer re-lays-out the page as a 3D space you walk through; nav becomes floor ring; hero becomes billboard; articles become shelves; internal links = particle trails
4. Original interactions preserved — clicking a 3D shelf opens the article inline as a readable panel

**Decoded by:** WebXR viewer (primary — lives at `runtimes/webxr/`). Unity runtime = AR overlay ON TOP of the real web page open on a real monitor. visionOS = spatial Safari-like browsing.

**Build cost:** DOM-to-XRAI extractor (browser extension, ~300 LOC) + WebXR layout engine (~500 LOC). Both small and MIT-licenseable alongside the main repos.

**Why this wins:** it's the first killer app for XRAI **adopters**. Any website owner can drop a `<meta name="xrai" content="url">` tag + get a spatial version of their site for free, viewable on any XRAI-runtime. Adoption propagates across the web without permission (like RSS).

Related: constitution §"We Are Blind" — we process humanity's knowledge through ranked text on tiny screens; XRAI-web-lens is the first way to fix that for the existing web.

---

## 🦍 17. 🌍 "Make me King Kong-sized next to the Empire State Building" *(geospatial — future)*

**Ships today (⌂ room-scale variant):** "make me dinosaur-sized in my backyard / my neighborhood / my university quad" — anchor to ARWorldMap scan; friends who rescan the same space see the giant. Zero new VPS infrastructure.

**Full geospatial variant (ships post-MVP via Cesium for Unity + `CesiumGlobeAnchor`):**


**Existing specs:** [`specs/003-hologram-telepresence/`](../../../specs/003-hologram-telepresence/) (user avatar capture) + [`specs/010-multiplayer-normcore/`](../../../specs/010-multiplayer-normcore/) (friend-visible) + [`specs/011-body-face-hand-space-tracking-scanning/`](../../../specs/011-body-face-hand-space-tracking-scanning/) (body tracking) + v1.1 `geospatial-anchor` extension (self-hosted / federated VPS via Gaussian splats + SPZ compression — **NOT Niantic Lightship**; vendor lock-in explicitly rejected per `docs/RISK_REGISTER.md`).

**XRAI payload:**
```json
{
  "scene": {
    "anchors": [{"id":"empire_state","type":"geospatial","lat":40.7484,"lon":-73.9857,
                 "vps_descriptor":"...","world_scale":1.0}],
    "entities": [
      {"id":"me_kong","type":"object.user-avatar",
       "params":{"source":"holokit.body-tracking","capture":"live","loopback":false},
       "transform":{"anchored_to":"empire_state","offset":[30,0,0],"scale":[100,100,100]}},
      {"id":"street_view","type":"object.passthrough-camera"}
    ],
    "relations": [
      {"type":"visible-to","from":"me_kong","to":"friend.federated.graph",
       "props":{"shared_with":["alice","bob"],"perm":"view","public_link":"..."}},
      {"type":"animates-with","from":"me_kong","to":"my.real.body","props":{"realtime":true}}
    ]
  }
}
```

**Flow:**
1. User points phone at Empire State (or anywhere — VPS resolves world-anchor)
2. Voice: "make me King Kong-sized here, share with friends"
3. XRAI anchors 100× scaled user-avatar to geospatial coordinate
4. Friends open share-link → see user at Empire State, animated by user's real body movements
5. Tap to wave, climb, roar

**Decoded by:** Portals Unity runtime (AR + VPS). WebXR viewer + Niantic-style VPS service = friend-browser sees same thing without the app. visionOS Vision Pro = spectacular spatial passthrough.

**Build cost:** v1.1 `geospatial-anchor` extension to XRAI. **Portals VPS path (NOT vendor lock-in):** self-hosted Gaussian splat anchor graph + Niantic SPZ format for 90% compression (SPZ is MIT-licensed per 2025 open-source release — format only, not their service) + Khronos KHR_gaussian_splatting (ratification Q2 2026 — "JPEG moment for spatial computing"). Federated sharing exists in §5.1 personal+shared namespaces. User-avatar capture exists in spec 003. Source for this stance: `docs/RISK_REGISTER.md` + `specs/XXX-zero-to-one/4d-world-models-strategic-intel.md` §8 + `intel/COMPETITIVE_MATRIX_2026-04-08.md` (Niantic Spatial = competitor, not partner; Portals owns indoor/editable/persistent/on-device 4D whitespace).

**Why this is worth building:** "Send your friend a link, they see you 100 stories tall" is a viral share-loop primitive. Instagram AR filters were worth $10B on far less novelty.

---

## 🕺 18. "Put 10 mini versions of my best friend on my desk doing jumping jacks"

**Existing specs:** existing `batch_execute` in Portals (spec 002) + [`specs/003-hologram-telepresence/`](../../../specs/003-hologram-telepresence/) (live capture of another user) + [`specs/010-multiplayer-normcore/`](../../../specs/010-multiplayer-normcore/) (their XRAI stream) + [`unity/Assets/Scripts/ObjectAnimator.cs`](../../../../unity/Assets/Scripts/ObjectAnimator.cs) (animation types).

**XRAI payload:**
```json
{
  "scene": {
    "anchors": [{"id":"desk","type":"plane","world_pos":"auto"}],
    "entities": [
      {"id":"alice_source","type":"object.user-avatar-stream",
       "params":{"source":"friend.alice.federated","capture":"live"}},
      ...10 clones, positions in a grid on desk...
      {"id":"alice_clone_1","type":"object.avatar-instance",
       "params":{"source_stream":"alice_source","scale":[0.08,0.08,0.08]},
       "transform":{"anchored_to":"desk","offset":[-0.15,0,-0.4],"scale":[0.08,0.08,0.08]}},
      ...
    ],
    "relations": [
      {"type":"animates-with","from":"alice_clone_*","to":"alice_source","props":{"sync":true,"offset_phase":"per_clone_random"}},
      {"type":"override-animation","from":"alice_clone_*","props":{"animation":"jumping-jacks","speed":1.0}}
    ]
  }
}
```

**Flow:**
1. Voice: "put 10 mini Alices on my desk doing jumping jacks"
2. jARvis asks Alice for permission (via federated graph)
3. 10 clones spawn, each at 8% scale on desk anchor, doing jumping jacks (existing ObjectAnimator)
4. Optionally, random phase offset so they're not synchronized (visually more interesting)
5. Permanent installation — next day, clones still there doing jacks

**Decoded by:** Unity runtime for main device. Any federated XRAI reader (Three.js viewer, visionOS) shows same clones.

**Build cost:** 0 new bridge messages. `object.avatar-instance` is just a primitive + live-stream binding. Multiplayer-permission flow already specced in 010.

**Why this is culturally delicious:** the "mini-friend-on-desk" is the meme-ready primitive. Everyone will send + receive these. Becomes the sticker economy of spatial.

---

## 🎨 19. 🌍 "Make Times Square my personal art gallery" *(geospatial — future)*

**Ships today (⌂ room-scale variant):** "make my living room / office / local park / university quad my gallery" — ARWorldMap anchors artwork to specific real-world surfaces. Friends with the same scanned space see the gallery. Permissionless within a location.

**Full geospatial variant (ships post-MVP via Cesium for Unity + `CesiumGlobeAnchor`):**


**Existing specs:** [`specs/009-paint-ar-openbrush/spec.md`](../../../specs/009-paint-ar-openbrush/spec.md) (paint strokes + audio-reactive shaders) + [`specs/022-universal-asset-io/`](../../../specs/022-universal-asset-io/) (user's art assets) + geospatial-anchor v1.1 extension + federated public-namespace publishing.

**XRAI payload:**
```json
{
  "scene": {
    "anchors": [{"id":"times_square","type":"geospatial","lat":40.7580,"lon":-73.9855,
                 "world_bbox":[...],"anchor_surfaces":["billboards","ground","buildings"]}],
    "entities": [
      {"id":"my_painting_1","type":"object.glb","url":"xrai://my.graph/artworks/painting-17",
       "transform":{"anchored_to":"times_square.billboard_north","scale":[12,8,0.1]}},
      {"id":"my_painting_2","type":"object.paint-stroke-collection",
       "params":{"strokes_from":"xrai://my.graph/paint-sessions/2026-04-15"},
       "transform":{"anchored_to":"times_square.ground","scale":[20,1,20]}},
      ...more artworks...
      {"id":"gallery_card","type":"object.ui-panel",
       "params":{"content":"@jamestunick gallery","cta":"tap to tip / follow"},
       "transform":{"anchored_to":"times_square.entrance"}}
    ],
    "relations": [
      {"type":"visibility","from":"all","props":{"scope":"public","namespace":"xrai://gallery/jamestunick"}}
    ]
  }
}
```

**Flow:**
1. User anchors their art collection to real-world Times Square (VPS resolves exact surface positions)
2. Publishes as public XRAI slice → anyone at Times Square with any XRAI runtime sees the gallery
3. Visitors can tip, follow, remix into their own XRAI galleries
4. Different artists publish to overlapping spaces → "layers" concept like Google Maps layers

**Decoded by:** Portals AR on phone/glasses. WebXR on Apple Vision Pro. Anyone with any XRAI runtime at GPS+VPS lock sees gallery. Public namespace = no auth needed.

**Build cost:** v1.1 geospatial-anchor + public-namespace federation (§5.1 framework). Artwork types already exist. **VPS backbone: self-hosted (Gaussian splats + SPZ compression + federated anchors), NOT Niantic Lightship or Google ARCore Geospatial** — vendor lock-in rejected per `docs/RISK_REGISTER.md`. See `4d-world-models-strategic-intel.md` for SPZ/KHR_gaussian_splatting integration plan.

**Why this is big:** **every major city square becomes a permissionless gallery in parallel with real content.** Physical real estate value → digital overlay real estate value. Niantic tried this with Pokémon GO; XRAI makes it format-level so anyone builds it, not just Niantic.

---

## 🪧 20. 🌍 "Make the White House my protest sign garden" *(geospatial — future)*

**Ships today (⌂ room-scale variant):** "make my local city hall / campus / community space a protest sign garden" — ARWorldMap anchors + federated XRAI public namespace. Works at walkable-scale right now. Geospatial-scale needs open VPS stack.

**Full geospatial variant (ships post-MVP via Cesium for Unity + `CesiumGlobeAnchor`):**


**Existing specs:** same as #19 (geospatial + paint + assets) + explicit namespace = "civic/political."

**XRAI payload:**
```json
{
  "scene": {
    "anchors": [{"id":"white_house","type":"geospatial","lat":38.8977,"lon":-77.0365,
                 "world_bbox":[...],"anchor_surfaces":["lawn","fence","sky"]}],
    "entities": [
      {"id":"sign_1","type":"object.protest-sign",
       "params":{"text":"Climate action now","style":"hand-painted","scale":[2,1.5,0.05]},
       "transform":{"anchored_to":"white_house.lawn","offset":[5,0,-2]}},
      ...100 signs from different users, aggregated from public xrai:// namespace...
      {"id":"aggregate_view","type":"object.crowd-aggregator",
       "params":{"query":"xrai://public/protest?topic=climate&location=white_house",
                 "max_signs":1000,"spatial_layout":"organic_crowd"}}
    ]
  }
}
```

**Flow:**
1. Any user says "add my protest sign at the White House" with topic + text
2. Published to public XRAI namespace with topic tag
3. Anyone walking past White House with XRAI runtime sees aggregated virtual protest — hundreds / thousands of signs from around the world
4. Topic filter: show only climate / only housing / only your friends
5. Physical protest + virtual protest merge — scale at civic level

**Decoded by:** any XRAI runtime with Portals-VPS resolver (self-hosted, not Niantic-dependent — see #17/19 build notes). Public namespace = no auth.

**Build cost:** `object.crowd-aggregator` is a v1.1 generator type (similar to procedural generators). Rest is reused primitives + public namespace federation.

**Why this matters civically:** first digital-first public square with true scale. AR protest overlay goes beyond Twitter hashtags into physical-place-anchored expression. Platform-agnostic + unownable by any vendor = cannot be censored by any single platform. Important counterweight to closed social networks.

**Why it matters for XRAI positioning:** proves the format has civic/political utility, not just entertainment. Different category of legitimacy.

---

## Scale readiness matrix (honest)

| # | Use case | Scale | Ships today? | Blocker if not |
|---|---|---|---|---|
| 1 | Mini game (falling cubes) | ⌂ room | ✅ yes | — |
| 2 | Forest world | ⌂ room | ✅ yes (v1.1 generators) | — |
| 3 | Audio paint | ⌂ room | ✅ yes | — |
| 4 | Webpage → memory palace | n/a (virtual) | ✅ yes | — |
| 5 | PTHI HUD | ⌂ room | ✅ yes (spec 021 already planned) | — |
| 6 | Ghibli lens | n/a (camera) | ✅ yes (spec 024 built) | — |
| 7 | Shared space | ⌂ room | ✅ yes (spec 010) | — |
| 8 | Codebase → 3D city | n/a (virtual) | ✅ yes | — |
| 9 | Memex ("last Tuesday") | ⌂ room (per-session) | ✅ yes (spec 004 + constitution) | Persistent-across-sessions = needs ARWorldMap-backed session recovery (T5 sprint) |
| 10 | Architecture walkthrough | ⌂ room or tabletop | ✅ yes | — |
| 11 | Flugtag | ⌂ room | ✅ yes | — |
| 12 | Racing (rainbow road) | ⌂ room | ✅ yes (procedural path + room scan) | — |
| 13 | Sky diving | ⌂ virtual (altitude is imaginary) | ✅ yes | — |
| 14 | Where are my keys? | ⌂ room | ✅ yes — already requires ARWorldMap-backed session recovery (T5) + camera detection pipeline | ARWorldMap recovery lands 2-3 day sprint |
| 15 | Sample anything as seed | n/a (capture-then-render) | ✅ yes | — |
| 16 | Make my website 3D | n/a (DOM-to-XRAI) | ✅ yes | — |
| 17 | Kong at Empire State | 🌍 geospatial | ⚠ room-scale variant ships today; landmark-scale post-MVP Cesium cherry-pick | Cesium for Unity already researched (bleeding-edge-jt kb-followup 2026-02-21); Apache 2.0; globe-anchor primitive = `CesiumGlobeAnchor`; not yet merged to main |
| 18 | 10 mini best-friends | ⌂ desktop | ✅ yes | — |
| 19 | Times Square gallery | 🌍 geospatial | ⚠ room-scale variant ships today; city-scale blocked | Same — post-MVP Cesium cherry-pick |
| 20 | White House protest | 🌍 geospatial | ⚠ local-community-scale variant ships today; landmark-scale blocked | Same — post-MVP Cesium cherry-pick |

**Summary:** 17 of 20 use cases ship TODAY at room / room-like scale on ARWorldMap + existing Portals primitives. 3 have honest room-scale variants that ship today; landmark-scale deferred until open geospatial VPS is designed + built.

**The right framing for launch:** don't lead with landmark-scale ("Kong at Empire State") — leads with room-scale ("Kong in my backyard") because that's what actually works at launch. Landmark-scale is the Year 1-2 stretch.

---

## Why this matters for XRAI adoption

Every example above is:
1. **Already specced in Portals** — we are not inventing use cases, we are curating them
2. **Expressible in v1.0 primitives** (+ planned v1.1/v1.2 generator/hyperedge extensions)
3. **Playable in every runtime** — the same XRAI document plays differently on web/mobile/glasses/desktop
4. **Voice-first** — jARvis composes via LLM → XRAI pipeline (§5.2), no manual authoring
5. **Portable** — user owns the graph, can export anywhere

## The integration rule

When user asks jARvis for any of the above, the LLM:
1. Invokes the **XRAI skill** (`.claude/skills/xrai/SKILL.md`)
2. Emits valid XRAI v1.0 JSON
3. Passes to the **Spatial MCP** (`mcp-server/`) for validation + storage
4. Appropriate **runtime** (`runtimes/<engine>/`) decodes + renders

Same pipeline for all 10 use cases. That's the unification win.

## What to build next (use-case-driven prioritization)

Priority by demo leverage + existing-spec leverage:

| Order | Use case | Demo-ability | Already specced? |
|---|---|---|---|
| 1 | Voice → mini-game (§1) | HIGHEST (60s video) | Yes, zero new code |
| 2 | Voice → forest world (§2) | HIGH | Yes, spec 023 Phase 1 |
| 3 | Paint stroke (§3) | MEDIUM-HIGH | Yes, spec 009 |
| 4 | Webpage → memory palace (§4) | HIGH (viral on HN) | Yes, spec 006 |
| 5 | PTHI HUD (§5) | HIGH (Palantir/Jarvis framing) | Yes, spec 021 |
| 6-10 | The rest | Medium | Yes, multiple specs |

Ship demos 1 + 4 in Week 1-2 (per `demos/jarvis_demos.md`). These prove the thesis.
