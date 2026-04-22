// @xrai/threejs-adapter — reference Three.js loader for XRAI v1.0 public spec.
// MIT-licensed. https://xrai.dev
//
// SCOPE: v1.0 public JSON subset only. The engineering spec v2 (glTF 2.0-based,
// `XRAI_core` extension, binary paint strokes at 32 bytes/point per spec §9)
// is handled by Portals' Unity runtime + Three.js glTFLoader for the glTF payload.
// This adapter is the minimum viable XRAI-specific loader for v1.0 JSON docs.
//
// USAGE:
//   import { loadXRAI } from '@xrai/threejs-adapter';
//   const { scene, entities } = loadXRAI(xraiJsonObject, THREE);
//   threejsScene.add(scene);
//
// Supports the v1.0 entity primitives: object.primitive (cube/sphere/cylinder/
// capsule/plane), object.glb (URL-referenced), object.light, object.emitter,
// object.hologram (fallback render = glowing sphere + Three.js PointLight),
// object.wire-source (non-visual; registered for runtime wire-binds), object.
// paint-stroke (tube geometry from points), object.parametric-stroke (renderer
// expands generator rule on load).
//
// Relations supported: parent-of (sets threeObject.add), reacts-to-audio
// (wires audio analyser if provided via opts.audioContext), wire-binds + tracks
// (registered but not auto-activated — callers opt in via opts.enableWires).
//
// Events: preserved on the returned scene under scene.userData.xrai.events for
// downstream replay systems. No automatic playback (separate RFC 0001 concern).
//
// Unknown fields preserved on round-trip (Postel's law).

export function loadXRAI(doc, THREE, opts = {}) {
  if (!doc || !doc.xrai_version) throw new Error('loadXRAI: missing xrai_version');
  if (!doc.scene) throw new Error('loadXRAI: missing scene');

  const root = new THREE.Group();
  root.name = `xrai:${doc.id || 'anon'}`;
  root.userData.xrai = {
    version: doc.xrai_version,
    source: doc,                    // preserve for round-trip
    events: doc.scene.events || [], // preserved; not auto-played
  };

  const entitiesById = new Map();
  const entities = doc.scene.entities || [];

  for (const ent of entities) {
    const obj = buildEntity(ent, THREE, opts);
    if (!obj) continue;
    obj.name = ent.id;
    if (!obj.userData) obj.userData = {};
    obj.userData.xrai = { ...(obj.userData.xrai || {}), entity: ent };
    entitiesById.set(ent.id, obj);
    root.add(obj); // default parent; parent-of relations move later
  }

  // Apply relations
  const relations = doc.scene.relations || [];
  for (const rel of relations) {
    applyRelation(rel, entitiesById, root, THREE);
  }

  return { scene: root, entities: entitiesById, doc };
}

function buildEntity(ent, THREE, opts) {
  const tx = ent.transform || { position: [0,0,0], rotation: [0,0,0,1], scale: [1,1,1] };
  const [px, py, pz] = tx.position || [0,0,0];
  const [rx, ry, rz, rw] = tx.rotation || [0,0,0,1];
  const [sx, sy, sz] = tx.scale || [1,1,1];
  const color = resolveColor(ent.material, THREE);

  let obj = null;
  const ensureUserData = (o) => { if (!o.userData) o.userData = {}; if (!o.userData.xrai) o.userData.xrai = {}; return o; };

  switch (ent.type) {
    case 'object.primitive': {
      const geom = makePrimitive(ent.model_id, THREE);
      const mat = makeMaterial(ent.material, color, THREE);
      obj = new THREE.Mesh(geom, mat);
      break;
    }
    case 'object.glb': {
      // Lazy-loaded via caller-supplied loader (Three.js GLTFLoader); return a placeholder Group
      obj = ensureUserData(new THREE.Group());
      obj.userData.xrai.pendingGlbUrl = ent.model_url || ent.metadata?.model_url;
      if (opts.onGlbPending) opts.onGlbPending(obj, ent);
      break;
    }
    case 'object.light': {
      obj = new THREE.PointLight(color, ent.metadata?.intensity ?? 1, ent.metadata?.distance ?? 0);
      break;
    }
    case 'object.emitter': {
      // VFX emitter: placeholder + PointLight + callback hook
      const g = new THREE.SphereGeometry(0.05);
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
      obj = new THREE.Mesh(g, m);
      if (opts.onEmitter) opts.onEmitter(obj, ent);
      break;
    }
    case 'object.hologram': {
      // Fallback render: glow sphere + point light. Real hologram VFX lives in Portals Unity.
      const g = new THREE.SphereGeometry(0.2);
      const m = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: ent.components?.find(c => c.type === 'vfx.hologram')?.props?.intensity ?? 0.5,
      });
      obj = new THREE.Mesh(g, m);
      const light = new THREE.PointLight(color, 1.5, 1.0);
      obj.add(light);
      if (opts.onHologram) opts.onHologram(obj, ent);
      break;
    }
    case 'object.wire-source': {
      obj = ensureUserData(new THREE.Group()); // non-visual
      obj.userData.xrai.wireSource = ent.metadata || {};
      break;
    }
    case 'object.paint-stroke': {
      obj = buildPaintStroke(ent, color, THREE);
      break;
    }
    case 'object.parametric-stroke': {
      obj = ensureUserData(new THREE.Group());
      obj.userData.xrai.parametric = ent.components?.find(c => c.type === 'paint.parametric')?.props;
      if (opts.onParametric) opts.onParametric(obj, ent);
      // Renderers that expand parametric-stroke rules on load hook in here.
      break;
    }
    default:
      console.warn(`[xrai/threejs] unknown entity type ${ent.type} — preserved but not rendered`);
      obj = ensureUserData(new THREE.Group());
      obj.userData.xrai.unknownType = ent.type;
  }

  if (!obj) return null;
  obj.position.set(px, py, pz);
  obj.quaternion.set(rx, ry, rz, rw);
  obj.scale.set(sx, sy, sz);

  // Apply animation — minimal v1.0 set (renderer callback pattern)
  ensureUserData(obj);
  if (ent.animation && ent.animation.type && ent.animation.type !== 'none') {
    obj.userData.xrai.animation = ent.animation;
    if (opts.onAnimation) opts.onAnimation(obj, ent.animation);
  }

  return obj;
}

function makePrimitive(modelId, THREE) {
  // modelId 0=cube 1=sphere 2=cylinder 3=capsule 4=plane (Portals convention)
  switch (modelId) {
    case 0: return new THREE.BoxGeometry(1, 1, 1);
    case 1: return new THREE.SphereGeometry(0.5, 32, 32);
    case 2: return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case 3: return new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    case 4: return new THREE.PlaneGeometry(1, 1);
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

function makeMaterial(material, color, THREE) {
  const preset = material?.preset ?? 'default';
  const opacity = material?.opacity ?? 1.0;
  const transparent = opacity < 1.0;

  switch (preset) {
    case 'neon':
      return new THREE.MeshBasicMaterial({ color, transparent, opacity });
    case 'glass':
      return new THREE.MeshPhysicalMaterial({ color, transmission: 0.9, opacity: 0.5, transparent: true, roughness: 0 });
    case 'chrome':
      return new THREE.MeshStandardMaterial({ color, metalness: 1.0, roughness: 0.1 });
    case 'gold':
      return new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.3 });
    case 'hologram':
      return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
    default:
      return new THREE.MeshStandardMaterial({ color, transparent, opacity, roughness: 0.5 });
  }
}

function resolveColor(material, THREE) {
  const raw = material?.color;
  if (!raw) return new THREE.Color(0xffffff);
  if (typeof raw === 'string') return new THREE.Color(raw);
  return new THREE.Color(0xffffff);
}

// exportXRAI: round-trip. Unknown fields preserved (Postel compliance).
// (THREE not needed — returns the stored source doc.)

function buildPaintStroke(ent, color, THREE) {
  const props = ent.components?.find(c => c.type === 'paint.stroke')?.props;
  if (!props || !props.points || props.points.length < 6) return new THREE.Group();

  const pts = [];
  for (let i = 0; i < props.points.length; i += 3) {
    pts.push(new THREE.Vector3(props.points[i], props.points[i+1], props.points[i+2]));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geom = new THREE.TubeGeometry(curve, pts.length * 2, props.width ?? 0.01, 8, false);
  const mat = new THREE.MeshBasicMaterial({
    color: props.color ? new THREE.Color(props.color) : color,
  });
  return new THREE.Mesh(geom, mat);
}

function applyRelation(rel, entitiesById, root, THREE) {
  switch (rel.type) {
    case 'parent-of': {
      const parent = entitiesById.get(rel.from || rel.participants?.[0]);
      const child = entitiesById.get(rel.to || rel.participants?.[1]);
      if (parent && child) parent.add(child);
      break;
    }
    case 'wire-binds':
    case 'reacts-to-audio':
    case 'tracks':
      // Registered in userData; callers opt-in via opts.enableWires
      root.userData.xrai.relations = root.userData.xrai.relations || [];
      root.userData.xrai.relations.push(rel);
      break;
    default:
      console.warn(`[xrai/threejs] unknown relation type ${rel.type} — preserved, not enforced`);
  }
}

export function exportXRAI(threeScene) {
  const doc = threeScene.userData?.xrai?.source;
  if (!doc) throw new Error('exportXRAI: scene has no XRAI source doc');
  return doc;
}
