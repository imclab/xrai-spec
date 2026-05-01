// xray-graph.js
// ─────────────────────────────────────────────────────────────────────────────
// Inject live runtime module nodes into the 3d-force-graph + bind every node
// to the inspector. Click any node → x-ray opens routed to that layer/file.
// Pulse module nodes by `window.__X.active`.
//
// Constitution: § Sight Triad → x-ray vision. § Wonder + Expressive Freedom.
// Spec: 029 Phase 6.22 (under-the-hood) extended into the 3D graph.
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_NODES = [
  { id: 'M_TRACE',    type: 'module', group: 'runtime', glyph: '◉', label: 'trace.js',          file: 'js/trace.js',             size: 8,  probe: () => !!window.__trace,                 layerHint: 'pipeline' },
  { id: 'M_FRAME',    type: 'module', group: 'runtime', glyph: '◉', label: 'perceptual-frame',  file: 'js/perceptual-frame.js',  size: 9,  probe: () => !!window.__perceptualFrame,        layerHint: 'frame'    },
  { id: 'M_JARVIS',   type: 'module', group: 'runtime', glyph: '◉', label: 'jarvis-web',        file: 'js/jarvis-web.js',        size: 11, probe: () => !!window.__jarvis?.active,         layerHint: 'pipeline' },
  { id: 'M_GEMINI',   type: 'module', group: 'runtime', glyph: '◉', label: 'gemini-web',        file: 'js/gemini-web.js',        size: 11, probe: () => { try { return !!localStorage.getItem('gemini_key'); } catch { return false; } }, layerHint: 'llm' },
  { id: 'M_HANDS',    type: 'module', group: 'runtime', glyph: '◉', label: 'hands-web',         file: 'js/hands-web.js',         size: 9,  probe: () => !!window.__hands?.active,          layerHint: null       },
  { id: 'M_RETICLE',  type: 'module', group: 'runtime', glyph: '◉', label: 'reticle-web',       file: 'js/reticle-web.js',       size: 7,  probe: () => !!window.__reticle,                layerHint: null       },
  { id: 'M_LIVE',     type: 'module', group: 'runtime', glyph: '◉', label: 'live-web',          file: 'js/live-web.js',          size: 9,  probe: () => !!window.__live?.connected,        layerHint: null       },
  { id: 'M_INSPECTOR',type: 'module', group: 'runtime', glyph: '◉', label: 'stack-inspector',   file: 'js/stack-inspector.js',   size: 9,  probe: () => !!window.__inspector,              layerHint: null       },
];

const MODULE_LINKS = [
  { source: 'M_JARVIS',  target: 'M_TRACE',     rel: 'fires-events' },
  { source: 'M_JARVIS',  target: 'M_FRAME',     rel: 'consults-before-answer' },
  { source: 'M_JARVIS',  target: 'M_GEMINI',    rel: 'delegates-to-llm' },
  { source: 'M_HANDS',   target: 'M_RETICLE',   rel: 'drives-viz' },
  { source: 'M_HANDS',   target: 'M_FRAME',     rel: 'feeds-attention' },
  { source: 'M_GEMINI',  target: 'M_FRAME',     rel: 'reads-context' },
  { source: 'M_INSPECTOR',target:'M_TRACE',     rel: 'subscribes' },
  { source: 'M_INSPECTOR',target:'M_FRAME',     rel: 'reads' },
];

export function attachXray({ Graph, nodes, links, openInspectorForNode, distillForFile }) {
  // 1. Inject module nodes + module-internal links
  const existingIds = new Set(nodes.map(n => n.id));
  MODULE_NODES.forEach(n => { if (!existingIds.has(n.id)) nodes.push({ ...n }); });
  MODULE_LINKS.forEach(l => { if (nodes.find(n => n.id === l.source) && nodes.find(n => n.id === l.target)) links.push({ ...l }); });

  // 2. Refresh graph data so new nodes appear
  Graph.graphData({ nodes, links });

  // 3. Pulse module nodes by live state every 1s — color + size modulation
  const baseColor = (n) => {
    if (n.type !== 'module') return null;
    const probe = MODULE_NODES.find(m => m.id === n.id)?.probe;
    return probe?.() ? '#5eff8a' : 'rgba(247,255,168,0.35)';
  };
  Graph.nodeColor((n) => baseColor(n) || (Graph.__origNodeColor ? Graph.__origNodeColor(n) : '#F7FFA8'));
  setInterval(() => Graph.refresh && Graph.refresh(), 1200);

  // 4. Click any node → inspector → pre-route by layerHint, or essence-distill if it has a file
  const orig = Graph.onNodeClick();
  Graph.onNodeClick(async (node, event) => {
    // Preserve any existing handler (the page sets one for openNode)
    try { if (typeof orig === 'function') orig(node, event); } catch {}
    if (!node) return;
    const moduleSpec = MODULE_NODES.find(m => m.id === node.id);
    if (event?.shiftKey && node.file && distillForFile) {
      // Shift-click → distill essence
      distillForFile(node.file);
      return;
    }
    if (openInspectorForNode) await openInspectorForNode(node, moduleSpec);
  });

  return {
    moduleNodes: MODULE_NODES,
    spec: (id) => MODULE_NODES.find(m => m.id === id),
  };
}

export const __xray = { MODULE_NODES, MODULE_LINKS };
