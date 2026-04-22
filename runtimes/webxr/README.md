# XRAI → WebXR

**Target:** WebXR Device API, modern browsers. Uses Three.js runtime under the hood — this directory holds the AR/VR-session bootstrap glue.

## Ingestion contract

```js
import { parseXrai, buildScene } from '@xrai/threejs';
import { enterXrai } from '@xrai/webxr';

const graph = await parseXrai(jsonText);
const scene = buildScene(graph);
await enterXrai(scene, { mode: 'immersive-ar' | 'immersive-vr' | 'inline' });
```

## What this adds over plain Three.js

- WebXR session setup (AR or VR mode)
- Hit-testing for AR anchors → binds to `graph.scene.anchors`
- Head/controller pose updates
- HitTestSource integration for placing XRAI scenes on real surfaces
- Environment lighting estimation (AR)

## Browser support (April 2026)

- ✅ Chrome Android (ARCore) — full AR
- ✅ Quest Browser — VR + pass-through AR
- ✅ visionOS Safari (2026+, limited WebXR)
- ⚠ iOS Safari — WebXR VR only, no AR (Apple restriction) → fallback path renders 2D preview

## Fallback / progressive enhancement

```js
if (navigator.xr?.isSessionSupported('immersive-ar')) {
  enterXrai(scene, { mode: 'immersive-ar' });
} else if (navigator.xr?.isSessionSupported('immersive-vr')) {
  enterXrai(scene, { mode: 'immersive-vr' });
} else {
  // 2D preview in <canvas>
  render2DPreview(scene);
}
```

## Status

- [ ] Reference bootstrap (~200 LOC)
- [ ] Landing-page demo: "see XRAI in your space" button on xrai.dev
- [ ] Quest standalone demo (sideloaded)
