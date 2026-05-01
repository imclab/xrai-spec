// dimension-morph.js
// ─────────────────────────────────────────────────────────────────────────────
// Seamless 2D ↔ 2.5D ↔ 3D ↔ 4D-temporal ↔ hypergraph morph for 3d-force-graph.
// Critical breakthrough pattern (constitution § Sight Triad → infinite zoom).
//
// Modes:
//   2D       — flatten z, top-down camera (no parallax)
//   2.5D     — isometric tilt, gentle parallax
//   3D       — default ForceGraph3D (full physics, free orbit)
//   4D       — 3D + temporal-flow edges drawn from window.__trace events
//              (consecutive layer-firings get a fading directional edge,
//              showing what touched what in the last 5 seconds)
//   hyper    — 3D + group hyperedges (translucent hulls per node.group)
//
// Spec: 029 Phase 6.22 (under-the-hood) extension.
// ─────────────────────────────────────────────────────────────────────────────

const MODES = ['2D', '2.5D', '3D', '4D', 'hyper'];
const MODE_HINTS = {
  '2D':    'top-down · z=0 · no parallax',
  '2.5D':  'isometric tilt · gentle depth',
  '3D':    'full physics · free orbit (default)',
  '4D':    '3D + temporal trace edges (last 5s)',
  'hyper': '3D + group hulls (hyperedges)',
};

export class DimensionMorph {
  constructor({ Graph, THREE }) {
    this.Graph = Graph;
    this.THREE = THREE;
    this.mode = '3D';
    this.tempEdges = [];          // {from,to,t,line} — 4D mode
    this.hulls = [];              // THREE.Mesh[] — hyper mode
    this.tempEdgeUnsub = null;
  }

  init() {
    this._injectStyles();
    this._buildUI();
    this._tickTempEdges();
  }

  _injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
      #dim-morph{position:fixed;top:16px;right:16px;z-index:17;display:flex;gap:4px;background:rgba(8,10,14,0.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(247,255,168,0.25);border-radius:10px;padding:4px;font:11px ui-monospace,Menlo,monospace;}
      #dim-morph button{appearance:none;background:transparent;cursor:pointer;border:1px solid transparent;border-radius:6px;color:rgba(247,255,168,0.65);font:inherit;padding:3px 9px;letter-spacing:.04em;}
      #dim-morph button.active{background:rgba(247,255,168,0.14);color:#F7FFA8;border-color:rgba(247,255,168,0.4);}
      #dim-morph button:hover{color:#F7FFA8;}
      #dim-hint{position:fixed;top:48px;right:16px;z-index:16;padding:3px 8px;background:rgba(8,10,14,0.55);border:1px solid rgba(247,255,168,0.18);border-radius:6px;color:rgba(247,255,168,0.65);font:10px ui-monospace,Menlo,monospace;opacity:0;transition:opacity .35s;}
      #dim-hint.show{opacity:1;}
    `;
    document.head.appendChild(s);
  }

  _buildUI() {
    const wrap = document.createElement('div'); wrap.id = 'dim-morph';
    MODES.forEach(m => {
      const b = document.createElement('button');
      b.textContent = m; b.dataset.mode = m;
      if (m === this.mode) b.classList.add('active');
      b.addEventListener('click', () => this.setMode(m));
      wrap.appendChild(b);
    });
    document.body.appendChild(wrap);
    const hint = document.createElement('div'); hint.id = 'dim-hint';
    document.body.appendChild(hint);
    this.hintEl = hint;
  }

  _showHint(text) {
    if (!this.hintEl) return;
    this.hintEl.textContent = text; this.hintEl.classList.add('show');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => this.hintEl.classList.remove('show'), 2400);
  }

  setMode(mode) {
    if (!MODES.includes(mode)) return;
    this.mode = mode;
    document.querySelectorAll('#dim-morph button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    this._showHint(`${mode} · ${MODE_HINTS[mode]}`);
    this._clearOverlays();
    if (mode === '2D')      this._apply2D();
    if (mode === '2.5D')    this._apply2_5D();
    if (mode === '3D')      this._apply3D();
    if (mode === '4D')      { this._apply3D(); this._enableTempEdges(); }
    if (mode === 'hyper')   { this._apply3D(); this._enableHulls(); }
  }

  _apply2D() {
    const G = this.Graph;
    // Flatten: lock all node z to 0 by overriding force
    G.d3Force('z', null);
    const data = G.graphData();
    data.nodes.forEach(n => { n.fz = 0; });
    G.cameraPosition({ x: 0, y: 0, z: 360 }, { x: 0, y: 0, z: 0 }, 800);
  }
  _apply2_5D() {
    const G = this.Graph;
    const data = G.graphData();
    data.nodes.forEach(n => { delete n.fz; });
    G.cameraPosition({ x: 220, y: 220, z: 220 }, { x: 0, y: 0, z: 0 }, 800);
  }
  _apply3D() {
    const G = this.Graph;
    const data = G.graphData();
    data.nodes.forEach(n => { delete n.fz; });
    G.cameraPosition({ x: 0, y: 0, z: 320 }, { x: 0, y: 0, z: 0 }, 800);
  }

  // ---- 4D: temporal trace edges ----
  _enableTempEdges() {
    if (!window.__trace) { this._showHint('4D unavailable — trace.js not loaded'); return; }
    let lastNodeForLayer = {};
    this.tempEdgeUnsub = window.__trace.on(evt => {
      if (!evt) { this._clearTempEdges(); lastNodeForLayer = {}; return; }
      // Map layer id → node id (M_JARVIS / M_GEMINI / etc)
      const layerToNode = { pipeline: 'M_JARVIS', llm: 'M_GEMINI', wake: 'M_JARVIS', tts: 'M_JARVIS', frame: 'M_FRAME' };
      const toId = layerToNode[evt.layer]; if (!toId) return;
      const fromId = lastNodeForLayer.__last;
      lastNodeForLayer.__last = toId;
      if (!fromId || fromId === toId) return;
      this._addTempEdge(fromId, toId);
    });
  }
  _addTempEdge(fromId, toId) {
    const data = this.Graph.graphData();
    const a = data.nodes.find(n => n.id === fromId);
    const b = data.nodes.find(n => n.id === toId);
    if (!a || !b || a.x == null || b.x == null) return;
    const T = this.THREE;
    const geom = new T.BufferGeometry().setFromPoints([new T.Vector3(a.x, a.y, a.z||0), new T.Vector3(b.x, b.y, b.z||0)]);
    const mat = new T.LineBasicMaterial({ color: 0xF7FFA8, transparent: true, opacity: 0.85 });
    const line = new T.Line(geom, mat);
    this.Graph.scene().add(line);
    this.tempEdges.push({ line, mat, born: performance.now() });
  }
  _tickTempEdges() {
    requestAnimationFrame(() => this._tickTempEdges());
    const now = performance.now();
    this.tempEdges = this.tempEdges.filter(e => {
      const age = (now - e.born) / 5000; // fade over 5s
      if (age >= 1) { try { this.Graph.scene().remove(e.line); e.line.geometry.dispose(); e.mat.dispose(); } catch {}; return false; }
      e.mat.opacity = 0.85 * (1 - age);
      return true;
    });
  }
  _clearTempEdges() {
    this.tempEdges.forEach(e => { try { this.Graph.scene().remove(e.line); e.line.geometry.dispose(); e.mat.dispose(); } catch {} });
    this.tempEdges = [];
    if (this.tempEdgeUnsub) { try { this.tempEdgeUnsub(); } catch {} this.tempEdgeUnsub = null; }
  }

  // ---- hypergraph: group hulls ----
  _enableHulls() {
    const T = this.THREE;
    const data = this.Graph.graphData();
    const groups = {};
    data.nodes.forEach(n => { if (!n.group || n.x == null) return; (groups[n.group] = groups[n.group] || []).push(n); });
    const colors = { runtime: 0x5eff8a, demo: 0xF7FFA8, doc: 0xA8E0FF, rfc: 0xff8aF7, runtime2: 0xffaf5e, concept: 0xF7FFA8, person: 0xff8a8a, place: 0x8aF7FF, structure: 0xc0c0c0, xrai: 0xF7D34A, video: 0xF7FFA8 };
    Object.entries(groups).forEach(([g, gNodes]) => {
      if (gNodes.length < 3) return;
      const pts = gNodes.map(n => new T.Vector3(n.x, n.y, n.z || 0));
      const geom = new T.ConvexGeometry ? new T.ConvexGeometry(pts) : new T.SphereGeometry(40, 8, 8);
      const mat = new T.MeshBasicMaterial({ color: colors[g] || 0xF7FFA8, transparent: true, opacity: 0.07, depthWrite: false });
      const hull = new T.Mesh(geom, mat);
      this.Graph.scene().add(hull);
      this.hulls.push({ hull, mat, geom });
    });
    if (!this.hulls.length) this._showHint('hyper · no convex-geom (load THREE/examples/geometries/ConvexGeometry to enable hulls)');
  }
  _clearOverlays() {
    this.hulls.forEach(h => { try { this.Graph.scene().remove(h.hull); h.geom.dispose(); h.mat.dispose(); } catch {} });
    this.hulls = [];
    this._clearTempEdges();
  }
}
