# XRAI → PlayCanvas

**Target:** PlayCanvas Engine (open-source JS). Reference impl Week 2 alongside Three.js (shared JS ecosystem).

## Ingestion contract

```js
import { parseXrai, buildScene } from '@xrai/playcanvas';

const graph = await parseXrai(jsonText);
const entity = buildScene(app, graph); // pc.Application, XraiGraph -> pc.Entity
app.root.addChild(entity);
```

## Mapping

| XRAI | PlayCanvas |
|---|---|
| `entity.type = object.primitive`, `model_id = 0..5` | `new pc.Entity()` + `entity.addComponent('model', {type: 'box/sphere/...'})` |
| `entity.type = object.glb` + `url` | Load as asset → `entity.addComponent('model', {type: 'asset', asset})` |
| `entity.type = object.light` | `entity.addComponent('light', {type: 'point/spot/...'})` |
| `entity.transform.position` | `entity.setPosition(x, y, z)` |
| `entity.transform.rotation` (quat) | `entity.setRotation(new pc.Quat(x, y, z, w))` |
| `entity.transform.scale` | `entity.setLocalScale(x, y, z)` |
| `entity.material.color` | `new pc.StandardMaterial()` + `.diffuse = new pc.Color(...)` |
| `relation.type = parent-of` | `parent.addChild(child)` |

## Handedness + units

- **PlayCanvas:** right-handed Y-up, meters
- XRAI canonical: left-handed Y-up, meters
- Loader flips z-axis on ingestion (or uses `graph.origin.handedness` hint)

## Why PlayCanvas

- Popular for web-hosted 3D experiences (browser games, configurators)
- Small engine (~600KB) vs Three.js (~1MB+)
- Strong AR/VR support via WebXR
- Cloud editor = XRAI-emit demos can render in-browser without local setup

## Distribution

```bash
npm i @xrai/playcanvas
```

Or CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/@xrai/playcanvas/dist/xrai-playcanvas.min.js"></script>
```

## Status

- [ ] Reference parser + builder (~150 LOC)
- [ ] Demo in PlayCanvas cloud editor
