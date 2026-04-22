# XRAI → visionOS (RealityKit)

**Target:** visionOS 2+, Apple Vision Pro. Reference impl Month 2 (hardware-gated).

## Ingestion contract

```swift
import XRAIKit  // MIT package, ships Month 2

let graph = try XraiLoader.parse(data: jsonData)
let entity = try XraiSceneBuilder.build(graph: graph)
arView.scene.anchors.append(AnchorEntity(world: .zero))
arView.scene.anchors.first?.addChild(entity)
```

## Mapping

| XRAI | RealityKit |
|---|---|
| `entity.type = object.primitive`, `model_id = 0..5` | `MeshResource.generateBox/Sphere/...` + `ModelEntity` |
| `entity.type = object.glb` | Convert glTF → USDZ → `Entity.load(named:)` (glTFast-like bridge) |
| `entity.type = object.light` | `DirectionalLight` / `PointLight` / `SpotLight` |
| `entity.transform.position` | `entity.position = SIMD3<Float>(...)` |
| `entity.transform.rotation` (quat) | `entity.orientation = simd_quatf(ix: x, iy: y, iz: z, r: w)` |
| `entity.transform.scale` | `entity.scale = SIMD3<Float>(...)` |
| `entity.material.color` | `SimpleMaterial(color:, roughness:, isMetallic:)` |
| `relation.type = parent-of` | `parentEntity.addChild(child)` |

## Handedness

- **RealityKit:** right-handed Y-up, meters (matches OpenUSD)
- **XRAI canonical:** left-handed Y-up, meters (Unity native)
- Loader negates z on ingestion unless `graph.origin.handedness === "right"`

## Integration with USDZ ecosystem

XRAI can REFERENCE USDZ assets in `entity.type = object.usdz` (v1.1+ addition). This lets Apple's ecosystem flow through XRAI graphs without forcing asset re-authoring.

## Why matter for Portals strategy

- Apple Design Award bait if Portals-on-visionOS ships first with voice-driven XRAI creation
- Demonstrates XRAI is NOT Unity-locked — critical for open-standard credibility
- Closed hardware but open format running on it

## Status

- [ ] Swift Package scaffold (`XRAIKit`)
- [ ] Basic RealityKit bindings
- [ ] Sample visionOS app on xrai.dev that loads scenes from URL
- [ ] App Store submission (post-Portals-visionOS v1)
