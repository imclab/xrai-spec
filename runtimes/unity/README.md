# XRAI → Unity

**Target:** Unity 6000.2+ with URP. Reference lives inside Portals app (`unity/Assets/Scripts/Bridge/`); extracted standalone adapter ships Week 3.

## Ingestion contract

```csharp
// Minimum viable:
var graph = XraiLoader.Parse(jsonText);        // string -> XraiGraph
var scene = XraiSceneBuilder.Build(graph);     // XraiGraph -> GameObject tree
Object.Instantiate(scene, parent);
```

## Mapping

| XRAI | Unity |
|---|---|
| `entity.type = object.primitive`, `model_id = 0..5` | `GameObject.CreatePrimitive(PrimitiveType.Cube/Sphere/...)` |
| `entity.type = object.glb` + `url` | `glTFast.GltfImport.Load(url)` |
| `entity.type = object.light` | `GameObject` + `Light` component |
| `entity.transform.position` | `transform.position` (Vector3) |
| `entity.transform.rotation` (quat) | `transform.rotation` (Quaternion) |
| `entity.transform.scale` | `transform.localScale` (Vector3) |
| `entity.material.color` | `Renderer.material.color` (CSS → Color32) |
| `entity.material.preset` | `MaterialPresets.Apply(renderer, preset)` |
| `entity.animation.type` | `ObjectAnimator.Animate(type, params)` |
| `entity.components[]` | `ComponentRegistry.AddComponent(...)` |
| `relation.type = parent-of` | `transform.SetParent(...)` |
| `relation.type = wire-binds` | `WireSystem.SetBinding(from, to)` |

## Required packages

- `com.unity.render-pipelines.universal` (URP)
- `com.atteneder.gltfast` (for `object.glb`) — already in Portals manifest

## Handedness / units

- **Positions:** meters (Unity native)
- **Rotations:** quaternions `[x,y,z,w]` (match Unity)
- **Coordinate system:** left-handed Y-up (Unity default)
- XRAI documents authored in right-handed Y-up need adapter flip (threejs, Unreal); runtime handles automatically via `graph.origin.handedness` hint

## Status

- [x] Portals app parses + renders XRAI-shaped JSON via `BridgeRouter` (batch_execute path)
- [ ] Extract standalone `XraiLoader.cs` + `XraiSceneBuilder.cs` into MIT package
- [ ] Publish as Unity Package (OpenUPM)
- [ ] Sample scene demonstrating load-from-URL

Target: Week 3 post-spec-public.
