# XRAI → Unreal Engine

**Target:** Unreal Engine 5.4+. Reference plugin ships Month 2 (deprioritized vs Unity + Three.js which ship earlier).

## Ingestion contract

```cpp
// C++
TSharedPtr<FXraiGraph> Graph = UXraiLoader::Parse(JsonText);
AActor* SceneRoot = UXraiSceneBuilder::Build(Graph, World);
```

```
// Blueprint
Parse XRAI (String) -> XRAI Graph
Build XRAI Scene (XRAI Graph, World) -> Actor
```

## Mapping

| XRAI | Unreal |
|---|---|
| `entity.type = object.primitive`, `model_id = 0..5` | `StaticMeshActor` with engine-content cube/sphere mesh |
| `entity.type = object.glb` + `url` | glTFRuntime plugin (open-source) |
| `entity.type = object.light` | `APointLight` / `ASpotLight` |
| `entity.transform.position` | `SetActorLocation(FVector)` — XRAI meters × 100 = Unreal cm |
| `entity.transform.rotation` (quat) | `SetActorRotation(FQuat(x,y,z,w))` |
| `entity.transform.scale` | `SetActorScale3D(FVector)` |
| `entity.material.color` | Dynamic material instance with base color |
| `relation.type = parent-of` | `AttachToActor(...)` |

## Unit + handedness conversion

- **Unreal uses centimeters.** Multiply XRAI position by 100.
- **Unreal is left-handed Z-up.** XRAI canonical is left-handed Y-up. Swap Y↔Z + negate one.
- Done once in the loader; scene code stays engine-native.

## Plugin structure

```
XraiPlugin/
├── Source/
│   ├── Xrai/
│   │   ├── Private/
│   │   │   ├── XraiLoader.cpp
│   │   │   └── XraiSceneBuilder.cpp
│   │   ├── Public/
│   │   │   ├── XraiLoader.h
│   │   │   └── XraiSceneBuilder.h
│   │   └── Xrai.Build.cs
│   └── XraiEditor/
│       └── (asset import, preview widget)
├── Content/
│   └── Examples/
└── Xrai.uplugin
```

## Distribution

- Epic Fab marketplace (free listing)
- GitHub source for modders
- MIT license

## Status

- [ ] Plugin scaffold
- [ ] Primitives + GLB loading
- [ ] Blueprint bindings
- [ ] Sample project with "voice-to-XRAI-to-Unreal" demo
