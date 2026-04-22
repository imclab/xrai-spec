# XRAI → Three.js

**Target:** Three.js r160+ (WebGL + WebGPU). Reference impl ships Week 2 — smallest runtime, easiest to validate spec.

## Ingestion contract

```js
import { parseXrai, buildScene } from '@xrai/threejs';
import * as THREE from 'three';

const graph = await parseXrai(jsonText);        // string/object -> XraiGraph
const group = buildScene(graph);                 // XraiGraph -> THREE.Group
myScene.add(group);
```

## Mapping

| XRAI | Three.js |
|---|---|
| `entity.type = object.primitive`, `model_id = 0..5` | `new THREE.Mesh(BoxGeometry/SphereGeometry/...)` |
| `entity.type = object.glb` + `url` | `GLTFLoader().loadAsync(url)` |
| `entity.type = object.light` | `new THREE.PointLight()` / `SpotLight` / etc. |
| `entity.transform.position` | `mesh.position.set(x, y, z)` |
| `entity.transform.rotation` (quat) | `mesh.quaternion.set(x, y, z, w)` |
| `entity.transform.scale` | `mesh.scale.set(x, y, z)` |
| `entity.material.color` | `new THREE.MeshStandardMaterial({color})` |
| `entity.material.preset = "neon"` | emissive preset material |
| `entity.animation.type = "spin"` | per-frame `mesh.rotation.y += speed*dt` in render loop |
| `relation.type = parent-of` | `parent.add(child)` |

## Handedness

XRAI canonical is left-handed Y-up (Unity native). Three.js is right-handed Y-up. Runtime negates z on ingestion unless `graph.origin.handedness === "right"`.

## Minimum viable reference (stub)

```js
// xrai-threejs.js — ~100 LOC when complete
export async function parseXrai(doc) {
  const g = typeof doc === 'string' ? JSON.parse(doc) : doc;
  if (g.xrai_version !== '1.0') throw new Error(`unsupported version ${g.xrai_version}`);
  return g;
}

export function buildScene(graph) {
  const root = new THREE.Group();
  const byId = new Map();

  for (const e of graph.scene.entities) {
    const mesh = createEntity(e);
    byId.set(e.id, mesh);
    root.add(mesh);
  }

  for (const r of graph.scene.relations) {
    if (r.type === 'parent-of') {
      const parent = byId.get(r.from);
      const child = byId.get(r.to);
      if (parent && child) parent.add(child);
    }
  }

  return root;
}

function createEntity(e) {
  // ... primitives / GLB / lights
}
```

## Distribution

```bash
npm i @xrai/threejs
```

Target: Week 2. This is the **primary web demo** runtime — every launch demo uses it.

## Status

- [x] **Reference parser + builder — SHIPPED** (2026-04-22) at `src/index.js`. Exports `loadXRAI(doc, THREE, opts)` + `exportXRAI(scene)`. Supports all v1.0 entity types (primitive/glb/light/emitter/hologram/wire-source/paint-stroke/parametric-stroke). Preserves unknown fields for round-trip. Unknown entities logged + preserved in `userData.xrai.unknownType`.
- [x] **Headless CLI for conformance** at `src/cli.js` — reads XRAI JSON, parses, emits normalized output. Used by `runtimes/_conformance` harness.
- [ ] Live WebGL sandbox on xrai.dev (Week 2)
- [ ] Unpkg-hosted CDN build for zero-install use
- [ ] WebXR variant (runtimes/webxr/)

## Quick test

```bash
cd runtimes/threejs
npm install
node src/cli.js ../../examples/01-minimal.xrai.json
# expected: ✓ parsed 1.0 doc with 1 entity
```
