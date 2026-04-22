// pipelines-web.js — mini node editor + module swap + live pipeline view
// No-dep 2D SVG editor. Nodes = modules (adapter | transform | renderer).
// Exposed via `pipelines.html` AND surfaced in the Unity editor hub WebView.
// Portable: RN can import this file through webview bridge; core has zero DOM.

import { AVAILABLE } from './adapters/index.js';
import { encode, merge, newScene } from './xrai-core.js';

// ─── Pipeline model (portable) ─────────────────────────────────────────
// { id, title, nodes: [{ id, kind, op, input?, x, y }], wires: [{from,to}] }
// kind: 'adapter' | 'transform' | 'renderer' | 'sink'
// Mutations via addNode/addWire/run — no rendering in model file.

export class Pipeline {
  constructor({ id = `pipe_${Date.now()}`, title = 'Untitled' } = {}) {
    this.id = id; this.title = title;
    this.nodes = []; this.wires = [];
  }
  addNode(n) { this.nodes.push({ x: 80, y: 80, ...n }); return n.id; }
  addWire(from, to) { this.wires.push({ from, to }); }
  toJSON() { return { id: this.id, title: this.title, nodes: this.nodes, wires: this.wires }; }
  static fromJSON(j) {
    const p = new Pipeline({ id: j.id, title: j.title });
    p.nodes = [...(j.nodes || [])]; p.wires = [...(j.wires || [])];
    return p;
  }
  async run({ onProgress, rendererFns = {} } = {}) {
    // Topo-run: adapter nodes emit docs → transforms merge → renderer consumes.
    const outputs = new Map();
    const deps = new Map(this.nodes.map(n => [n.id, []]));
    this.wires.forEach(w => deps.get(w.to).push(w.from));
    const ready = () => this.nodes.filter(n => !outputs.has(n.id)
      && deps.get(n.id).every(d => outputs.has(d)));
    while (ready().length) {
      for (const n of ready()) {
        onProgress?.({ node: n.id, stage: 'start' });
        try {
          if (n.kind === 'adapter') {
            outputs.set(n.id, await encode(n.op, n.input, n.opts || {}));
          } else if (n.kind === 'transform' && n.op === 'merge') {
            const inputs = deps.get(n.id).map(d => outputs.get(d));
            outputs.set(n.id, inputs.reduce((a, b) => merge(a, b), newScene()));
          } else if (n.kind === 'renderer') {
            const doc = outputs.get(deps.get(n.id)[0]);
            const fn = rendererFns[n.op];
            if (fn) await fn(doc, n.opts || {});
            outputs.set(n.id, doc);
          } else if (n.kind === 'sink') {
            const doc = outputs.get(deps.get(n.id)[0]);
            outputs.set(n.id, doc);
          }
          onProgress?.({ node: n.id, stage: 'done' });
        } catch (e) {
          onProgress?.({ node: n.id, stage: 'error', error: e.message });
          throw e;
        }
      }
    }
    return outputs;
  }
}

// ─── Module registry (hot-swap) ────────────────────────────────────────
export const MODULES = {
  adapters: AVAILABLE,
  transforms: [
    { name: 'merge', label: 'Merge XRAI docs' },
  ],
  renderers: [
    { name: 'force-graph',   label: 'Force graph (current)' },
    { name: 'echarts-gl',    label: 'ECharts GL (WebGPU)' },
    { name: 'playcanvas',    label: 'PlayCanvas' },
    { name: 'needle',        label: 'Needle' },
    { name: 'icosa',         label: 'Icosa' },
    { name: 'portals-ios',   label: 'Portals iOS (app)' },
    { name: 'unity-editor',  label: 'Unity Editor hub' },
  ],
  sinks: [
    { name: 'download',      label: 'Download .xrai.json' },
    { name: 'livekit',       label: 'Publish to live room' },
    { name: 'mcp',           label: 'Save via Spatial MCP' },
  ],
};

// ─── SVG 2D editor — minimal, no deps ──────────────────────────────────
export class PipelineEditor {
  constructor(root, pipeline) {
    this.root = root;
    this.pipeline = pipeline || new Pipeline();
    this.selected = null; this.dragging = null; this.wiring = null;
    this._buildDom();
    this._render();
  }
  _buildDom() {
    this.root.innerHTML = `
      <div class="pipe-toolbar">
        <select id="pipe-add-kind">
          <option value="adapter">+ adapter</option>
          <option value="transform">+ transform</option>
          <option value="renderer">+ renderer</option>
          <option value="sink">+ sink</option>
        </select>
        <select id="pipe-add-op"></select>
        <button id="pipe-add">add</button>
        <button id="pipe-run">run ▸</button>
        <button id="pipe-save">save</button>
        <button id="pipe-load">load</button>
        <button id="pipe-clear">clear</button>
        <span id="pipe-status"></span>
      </div>
      <svg id="pipe-svg" width="100%" height="520">
        <defs>
          <marker id="pipe-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill="#F7FFA8" />
          </marker>
        </defs>
        <g id="pipe-wires"></g>
        <g id="pipe-nodes"></g>
      </svg>`;
    this.svg = this.root.querySelector('#pipe-svg');
    this.wiresG = this.root.querySelector('#pipe-wires');
    this.nodesG = this.root.querySelector('#pipe-nodes');
    const kind = this.root.querySelector('#pipe-add-kind');
    const op = this.root.querySelector('#pipe-add-op');
    const syncOps = () => {
      const k = kind.value;
      const list = k === 'adapter' ? MODULES.adapters
        : k === 'transform' ? MODULES.transforms
        : k === 'renderer' ? MODULES.renderers
        : MODULES.sinks;
      op.innerHTML = list.map(m => `<option value="${m.name}">${m.label}</option>`).join('');
    };
    kind.addEventListener('change', syncOps); syncOps();
    this.root.querySelector('#pipe-add').addEventListener('click', () => {
      this.pipeline.addNode({
        id: `n${this.pipeline.nodes.length + 1}`,
        kind: kind.value, op: op.value,
        x: 60 + (this.pipeline.nodes.length % 5) * 180,
        y: 60 + Math.floor(this.pipeline.nodes.length / 5) * 110,
      });
      this._render();
    });
    this.root.querySelector('#pipe-run').addEventListener('click', () => this._run());
    this.root.querySelector('#pipe-save').addEventListener('click', () => this._save());
    this.root.querySelector('#pipe-load').addEventListener('click', () => this._load());
    this.root.querySelector('#pipe-clear').addEventListener('click', () => {
      this.pipeline = new Pipeline(); this._render();
    });
    this.svg.addEventListener('mousemove', e => this._onMove(e));
    this.svg.addEventListener('mouseup', () => { this.dragging = null; this.wiring = null; this._render(); });
  }
  _status(m) { this.root.querySelector('#pipe-status').textContent = m || ''; }
  _nodeColor(n) {
    return n.kind === 'adapter' ? '#A8A8FF'
      : n.kind === 'transform' ? '#F7FFA8'
      : n.kind === 'renderer' ? '#3498db'
      : '#2ecc71';
  }
  _render() {
    this.nodesG.innerHTML = '';
    this.wiresG.innerHTML = '';
    this.pipeline.nodes.forEach(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${n.x},${n.y})`);
      g.innerHTML = `
        <rect width="160" height="60" rx="4" fill="rgba(0,0,0,0.6)" stroke="${this._nodeColor(n)}" />
        <text x="10" y="22" fill="${this._nodeColor(n)}" font-family="JetBrains Mono, monospace" font-size="10" text-transform="uppercase">${n.kind}</text>
        <text x="10" y="42" fill="#FFF" font-family="Satoshi, sans-serif" font-size="13" font-weight="700">${n.op}</text>
        <circle class="in"  cx="0"   cy="30" r="5" fill="#000" stroke="${this._nodeColor(n)}" />
        <circle class="out" cx="160" cy="30" r="5" fill="${this._nodeColor(n)}" />
        <text x="150" y="56" fill="#888" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="end">${n.id}</text>`;
      g.querySelector('rect').addEventListener('mousedown', e => {
        this.dragging = { id: n.id, dx: e.offsetX - n.x, dy: e.offsetY - n.y };
      });
      g.querySelector('rect').addEventListener('dblclick', () => this._editNode(n));
      g.querySelector('.out').addEventListener('mousedown', e => {
        e.stopPropagation();
        this.wiring = { from: n.id };
      });
      g.querySelector('.in').addEventListener('mouseup', e => {
        e.stopPropagation();
        if (this.wiring && this.wiring.from !== n.id) {
          this.pipeline.addWire(this.wiring.from, n.id);
        }
        this.wiring = null; this._render();
      });
      this.nodesG.appendChild(g);
    });
    this.pipeline.wires.forEach(w => {
      const a = this.pipeline.nodes.find(n => n.id === w.from);
      const b = this.pipeline.nodes.find(n => n.id === w.to);
      if (!a || !b) return;
      const x1 = a.x + 160, y1 = a.y + 30, x2 = b.x, y2 = b.y + 30;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cx = (x1 + x2) / 2;
      p.setAttribute('d', `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`);
      p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#F7FFA8');
      p.setAttribute('stroke-opacity', '0.7'); p.setAttribute('marker-end', 'url(#pipe-arrow)');
      this.wiresG.appendChild(p);
    });
  }
  _onMove(e) {
    if (this.dragging) {
      const n = this.pipeline.nodes.find(x => x.id === this.dragging.id);
      n.x = Math.max(0, e.offsetX - this.dragging.dx);
      n.y = Math.max(0, e.offsetY - this.dragging.dy);
      this._render();
    }
  }
  _editNode(n) {
    const hint = (MODULES.adapters.find(a => a.name === n.op) || {}).inputHint || '';
    const cur = typeof n.input === 'string' ? n.input : JSON.stringify(n.input || '');
    const val = prompt(`Input for ${n.op}\n(${hint})`, cur);
    if (val == null) return;
    try { n.input = JSON.parse(val); } catch { n.input = val; }
    this._render();
  }
  async _run() {
    this._status('running…');
    try {
      const out = await this.pipeline.run({
        onProgress: ev => this._status(`${ev.stage}: ${ev.node}`),
        rendererFns: this._rendererFns(),
      });
      this._status(`done · ${out.size} nodes`);
      // Emit final doc via event for page-level renderer to consume
      const last = this.pipeline.nodes[this.pipeline.nodes.length - 1];
      if (last && out.has(last.id)) {
        document.dispatchEvent(new CustomEvent('pipeline:result', { detail: { doc: out.get(last.id) } }));
      }
    } catch (e) {
      this._status(`error: ${e.message}`);
    }
  }
  _rendererFns() {
    return {
      'force-graph': (doc) => {
        document.dispatchEvent(new CustomEvent('pipeline:render', { detail: { engine: 'force-graph', doc } }));
      },
      'portals-ios': (doc) => {
        document.dispatchEvent(new CustomEvent('pipeline:portals-ios', { detail: { doc } }));
      },
      'unity-editor': (doc) => {
        // Reach the Unity hub via window.unityBridge (set by Unity WebView)
        try { window.unityBridge?.postMessage?.(JSON.stringify({ type: 'xrai-doc', doc })); } catch {}
      },
    };
  }
  _save() {
    const blob = new Blob([JSON.stringify(this.pipeline.toJSON(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${this.pipeline.id}.pipeline.json`; a.click();
    URL.revokeObjectURL(a.href);
  }
  _load() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = async () => {
      const f = inp.files?.[0]; if (!f) return;
      this.pipeline = Pipeline.fromJSON(JSON.parse(await f.text()));
      this._render();
    };
    inp.click();
  }
}
