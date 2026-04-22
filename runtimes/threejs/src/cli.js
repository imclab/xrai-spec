#!/usr/bin/env node
// xrai/threejs CLI — headless loader + conformance-harness contract.
// Reads XRAI JSON, parses via loadXRAI, emits summary or normalized JSON.
// Exit 0 on success, non-zero on failure. Used by runtimes/_conformance harness.

import { readFileSync } from 'fs';
import { loadXRAI, exportXRAI } from './index.js';

// Minimal THREE shim — adapter is geometry-neutral when running headless.
const THREE = {
  Color: class { constructor(c){ this.hex=c; } },
  Vector3: class { constructor(x,y,z){this.x=x;this.y=y;this.z=z;} },
  Quaternion: class {},
  Group: class {
    constructor(){ this.name=''; this.userData={}; this.children=[];
      this.position={set:()=>{}}; this.quaternion={set:()=>{}}; this.scale={set:()=>{}}; }
    add(o){ this.children.push(o); }
  },
  Mesh: class {
    constructor(){ this.userData={}; this.children=[];
      this.position={set:()=>{}}; this.quaternion={set:()=>{}}; this.scale={set:()=>{}}; }
    add(o){ this.children.push(o); }
  },
  PointLight: class {
    constructor(){ this.userData={}; this.children=[];
      this.position={set:()=>{}}; this.quaternion={set:()=>{}}; this.scale={set:()=>{}}; }
    add(o){ this.children.push(o); }
  },
  BoxGeometry: class {}, SphereGeometry: class {}, CylinderGeometry: class {},
  CapsuleGeometry: class {}, PlaneGeometry: class {}, TubeGeometry: class {},
  CatmullRomCurve3: class {},
  MeshBasicMaterial: class {}, MeshStandardMaterial: class {}, MeshPhysicalMaterial: class {},
};

const args = process.argv.slice(2);
const jsonFlag = args.includes('--json');
const src = args.find(a => a !== '--json');

if (!src) { console.error('usage: cli.js <path|-> [--json]'); process.exit(2); }

let raw;
try { raw = src === '-' ? readFileSync(0, 'utf8') : readFileSync(src, 'utf8'); }
catch (e) { console.error(`read failed: ${e.message}`); process.exit(2); }

let doc;
try { doc = JSON.parse(raw); }
catch (e) { console.error(`JSON parse failed: ${e.message}`); process.exit(3); }

let result;
try { result = loadXRAI(doc, THREE); }
catch (e) { console.error(`loadXRAI failed: ${e.message}`); process.exit(4); }

if (jsonFlag) {
  console.log(JSON.stringify(exportXRAI(result.scene), null, 2));
} else {
  const entCount = result.entities.size;
  const relCount = doc.scene.relations?.length || 0;
  const evtCount = doc.scene.events?.length || 0;
  console.log(`✓ parsed ${doc.xrai_version} doc ${doc.id || '(anon)'} — ${entCount} entities, ${relCount} relations, ${evtCount} events`);
}
process.exit(0);
