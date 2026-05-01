// stack-inspector.js
// ─────────────────────────────────────────────────────────────────────────────
// Drill-down panel showing the live runtime stack. Each layer = expandable row
// with: current module · version · source path · live status · parameters ·
// available alternatives (swappable in v2).
//
// Triggered by:
//   • #inspector-toggle button  (added to top toolbar)
//   • keyboard: i
//
// Reads from:
//   • window.__jarvis    — STT/TTS/Wake/Memory/Answer pipeline
//   • window.__hands     — MediaPipe hand-tracking
//   • window.__live      — LiveKit transport
//   • window.__perceptualFrame — current frame snapshot
//   • localStorage.gemini_key  — LLM availability
//
// Spec: 029 tasks.md Phase 6.22 (under-the-hood module browser).
// ─────────────────────────────────────────────────────────────────────────────

const LAYERS = [
  {
    id: 'stt', label: 'STT (speech → text)',
    inspect: () => {
      const j = window.__jarvis;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      return {
        active: !!j?.active,
        current: SR ? 'browser WebSpeech API' : 'unsupported',
        params: { lang: j?.rec?.lang || 'en-US', continuous: j?.rec?.continuous, interimResults: j?.rec?.interimResults },
        source: 'js/jarvis-web.js:49 · detectSR()',
        alternatives: ['Whisper.cpp (WASM)', 'Vosk (WASM)', 'Gemini Live ASR (cloud)', 'Deepgram (cloud)'],
      };
    },
  },
  {
    id: 'tts', label: 'TTS (text → speech)',
    inspect: () => {
      const j = window.__jarvis;
      const v = j?.voice;
      return {
        active: !!j?.synth,
        current: v ? `${v.name} (${v.lang})` : 'browser SpeechSynthesisUtterance',
        params: { rate: 1.02, pitch: 0.95, volume: 0.9, ellipsis_pause_ms: 220 },
        source: 'js/jarvis-web.js:223 · speak()',
        alternatives: ['Gemini Live TTS', 'ElevenLabs', 'Piper (on-device)', 'OpenAI TTS', 'Cartesia'],
      };
    },
  },
  {
    id: 'wake', label: 'Wake word',
    inspect: () => ({
      active: !!window.__jarvis?.active,
      current: 'fuzzy match · 8 phrase variants · isFinal-only (~400-1200ms latency)',
      params: { phrases: ['hey jarvis', 'hey jarvas', 'hi jarvis', 'ok jarvis', 'jarvis', 'jarvas', 'j.a.r.v.i.s', 'a jarvis'], match_mode: 'isFinal' },
      source: 'js/jarvis-web.js:271',
      alternatives: ['Picovoice Porcupine (free tier)', 'interim-transcript match (Phase 6.2 — drops to ~150-300ms)', 'continuous keyword spotting'],
    }),
  },
  {
    id: 'pipeline', label: 'Answer pipeline',
    inspect: () => ({
      active: !!window.__jarvis?.active,
      current: '6-step: nav verbs → graph match → content-index → Gemini → Wikipedia → graceful giveup',
      params: { steps: ['nav-verbs', 'local-graph-match', 'content-index-keyword (24h cache)', 'Gemini Live (if key set)', 'Wikipedia REST fallback', 'graceful-giveup with screen_focus suggestion'] },
      source: 'js/jarvis-web.js:_onTurn',
      alternatives: ['Gemini Live exclusively', 'Multi-LLM router (Claude · Gemini · GPT)', 'Local LLM (Ollama)', 'RAG pipeline w/ embeddings'],
    }),
  },
  {
    id: 'llm', label: 'LLM',
    inspect: () => {
      const hasKey = (() => { try { return !!localStorage.getItem('gemini_key'); } catch { return false; } })();
      return {
        active: hasKey,
        current: hasKey ? 'gemini-2.5-flash (text mode)' : 'NONE — set localStorage.gemini_key to enable',
        params: hasKey ? { endpoint: 'generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash', temperature: 0.4, maxOutputTokens: 220 } : { warning: 'No LLM connected. Pipeline falls through to Wikipedia.' },
        source: 'js/gemini-web.js',
        alternatives: ['Claude Sonnet 4.6 / Opus 4.7 (Anthropic)', 'GPT-4o (OpenAI)', 'Llama 3 / Qwen (local via Ollama)', 'Gemini 2.5 Pro', 'Gemini Live native-audio (full duplex)'],
      };
    },
  },
  {
    id: 'sysprompt', label: 'System prompt',
    inspect: () => {
      const hasKey = (() => { try { return !!localStorage.getItem('gemini_key'); } catch { return false; } })();
      return {
        active: hasKey,
        current: hasKey ? 'grounded in (perceptual_frame + XRAI doc 11 + KB top-5 hits)' : 'N/A (no LLM)',
        params: { sections: ['identity', 'never-say-not-in-index rule', 'CURRENT PERCEPTUAL FRAME', 'XRAI SYSTEM DNA (doc 11 distilled)', 'KB ENTRIES MATCHING (top 5)'] },
        source: 'js/gemini-web.js:askGemini · sys assembly',
        alternatives: ['+ recent peer commits', '+ Constitution sections (just-in-time)', '+ patent claims (021-pthi)', '+ session-stats trend'],
      };
    },
  },
  {
    id: 'memory', label: 'Memory',
    inspect: () => ({
      active: !!window.__jarvis,
      current: 'localStorage: log (last 80 q/hits) + context (visits, lastSeen) + 12-id recentNodes',
      params: { storage: 'localStorage', max_log: 80, max_recent_nodes: 12, ttl: 'session-persistent' },
      source: 'js/jarvis-web.js:39-44 (LOG_KEY/CTX_KEY/USER_KEY)',
      alternatives: ['IndexedDB (larger)', 'Append-only XRAI deltas (Phase 6.7)', '3-tier memory: short(ring) + medium(SQLite) + long(distilled facts)', 'Cloud sync (opt-in)'],
    }),
  },
  {
    id: 'frame', label: 'Perceptual frame',
    inspect: () => {
      const pf = window.__perceptualFrame;
      const f = pf?.getFrame();
      return {
        active: !!pf,
        current: pf ? `live · refresh ~4Hz · last t=${f?.t?.slice(11,19) || '?'}` : 'NOT WIRED',
        params: pf ? {
          focused_entity_id: f?.screen_focus?.focused_entity_id || '(none)',
          focused_label: f?.screen_focus?.focused_label || '(none)',
          history_size: f?.recent_history?.length || 0,
          last_prompt: f?.session_arc?.last_prompt?.text?.slice(0, 40) || '(none)',
          time_on_task_s: f?.session_arc?.time_on_task_s || 0,
          camera_summary: f?.camera_frame_summary?.unavailable || 'live',
        } : { warning: 'window.__perceptualFrame missing' },
        source: 'js/perceptual-frame.js · refresh 250ms',
        alternatives: ['+ MediaPipe FaceLandmarker valence', '+ ARKit lookAtPoint (iOS)', '+ predicted_next from world model', '+ dwell-then-offer trigger'],
      };
    },
  },
  {
    id: 'kb', label: 'Knowledge base',
    inspect: async () => {
      let count = '?'; let built = '?';
      try {
        const res = await fetch('data/kb-index.json');
        if (res.ok) { const j = await res.json(); count = j.count; built = j.built_at; }
      } catch {}
      return {
        active: count !== '?',
        current: `static bundle · ${count} entries · built ${built?.slice(0,10) || '?'}`,
        params: { source: '~/.claude/knowledgebase/*.md + .xrai/KnowledgeBase/*.md', summary_chars: 240, sort: 'alpha' },
        source: 'data/kb-index.json (built by scripts/build_kb_index.cjs)',
        alternatives: ['Live fetch from GitHub raw', 'Embeddings + cosine search', 'ChromaDB / Vectara', 'Algolia hosted', 'Inline fts5 SQLite WASM'],
      };
    },
  },
  {
    id: 'xrai', label: 'XRAI DNA doc',
    inspect: async () => {
      try {
        const res = await fetch('examples/11-jarvis-system-dna.xrai.json');
        if (!res.ok) throw new Error('fetch failed');
        const doc = await res.json();
        return {
          active: true,
          current: `doc 11 v${doc.xrai_version} · ${doc.scene?.entities?.length || 0} entities · ${doc.scene?.relations?.length || 0} relations`,
          params: { id: doc.id, title: doc.metadata?.title?.slice(0, 80), self_describing: !!doc.metadata?.encoding },
          source: 'examples/11-jarvis-system-dna.xrai.json',
          alternatives: ['+ examples/12-voxel-burst-prompt', '+ examples/13-conducting-orchestration', '+ INDEX.xrai.json (master)', 'Live editing via in-graph editor (Phase 6.22.x)'],
        };
      } catch (e) {
        return { active: false, current: 'fetch failed', params: { error: e.message }, source: 'examples/11-jarvis-system-dna.xrai.json', alternatives: [] };
      }
    },
  },
];

export class StackInspector {
  constructor() { this.el = null; this.open = false; }

  init() {
    this._injectStyles();
    this._build();
    document.addEventListener('keydown', (e) => {
      if (e.key === 'i' && !e.target.matches('input,textarea')) this.toggle();
    });
  }

  _injectStyles() {
    if (document.getElementById('inspector-styles')) return;
    const s = document.createElement('style');
    s.id = 'inspector-styles';
    s.textContent = `
      #stack-inspector{
        position:fixed; top:84px; left:16px; z-index:18; max-width:380px; max-height:80vh;
        overflow:auto; padding:10px 12px;
        background:rgba(8,10,14,0.65); backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
        border:1px solid rgba(247,255,168,0.25); border-radius:10px;
        color:rgba(247,255,168,0.92);
        font:11px/1.45 ui-monospace,"SF Mono",Menlo,monospace;
        opacity:0; transform:translateX(-12px); transition:opacity .35s,transform .35s;
        pointer-events:none;
      }
      #stack-inspector.show{opacity:1; transform:translateX(0); pointer-events:auto;}
      #stack-inspector h4{margin:0 0 6px; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:rgba(247,255,168,0.65); font-weight:500;}
      #stack-inspector .x{position:absolute; top:6px; right:8px; cursor:pointer; color:rgba(247,255,168,0.55);}
      #stack-inspector .row{border-top:1px solid rgba(247,255,168,0.12); padding:6px 0;}
      #stack-inspector .row:first-of-type{border-top:0;}
      #stack-inspector .head{display:flex; gap:8px; align-items:center; cursor:pointer;}
      #stack-inspector .dot{width:8px; height:8px; border-radius:50%; background:#666; flex:0 0 8px; box-shadow:0 0 4px currentColor;}
      #stack-inspector .dot.on{background:#5eff8a; color:#5eff8a;}
      #stack-inspector .dot.warn{background:#F7FFA8; color:#F7FFA8;}
      #stack-inspector .dot.off{background:#444; color:#444;}
      #stack-inspector .label{flex:1; color:#F7FFA8;}
      #stack-inspector .arrow{opacity:.5;}
      #stack-inspector .body{display:none; margin-top:6px; padding:6px 8px; background:rgba(0,0,0,0.32); border-radius:6px;}
      #stack-inspector .row.open .body{display:block;}
      #stack-inspector .row.open .arrow{transform:rotate(90deg);}
      #stack-inspector .k{color:rgba(247,255,168,0.55); display:inline-block; min-width:84px;}
      #stack-inspector .v{color:#F7FFA8;}
      #stack-inspector .src{margin-top:4px; opacity:.55; font-size:10px;}
      #stack-inspector .alts{margin-top:4px; padding-top:4px; border-top:1px dashed rgba(247,255,168,0.18); font-size:10px; opacity:.78;}
      #stack-inspector .alts b{display:block; color:rgba(247,255,168,0.55); margin-bottom:2px; font-weight:400; letter-spacing:.08em; text-transform:uppercase; font-size:9px;}
      #stack-inspector .alts li{list-style:none; padding-left:0;}
      #stack-inspector pre{margin:0; white-space:pre-wrap; word-break:break-word; font-size:10px;}
      #inspector-toggle{position:fixed; top:16px; left:16px; z-index:17;}
    `;
    document.head.appendChild(s);
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'stack-inspector';
    el.innerHTML = `
      <span class="x" title="hide (press i)">×</span>
      <h4>under the hood · x-ray</h4>
      <div id="insp-tabs" style="display:flex;gap:4px;margin-bottom:6px;">
        <button data-tab="stack" class="insp-tab active">stack</button>
        <button data-tab="trace" class="insp-tab">trace</button>
        <button data-tab="kb"    class="insp-tab">kb</button>
        <button data-tab="essence" class="insp-tab">essence</button>
      </div>
      <div id="insp-body"></div>
      <div style="margin-top:8px; opacity:.55; font-size:10px;">press <b>i</b> to toggle · stack=meta · trace=runtime flow · kb=knowledge structure · essence=XRAI distill of focused node</div>
    `;
    el.querySelector('.x').addEventListener('click', () => this.toggle(false));
    el.querySelectorAll('.insp-tab').forEach(b => {
      b.addEventListener('click', () => this._switchTab(b.dataset.tab));
    });
    document.body.appendChild(el);
    this.el = el;
    this.bodyEl = el.querySelector('#insp-body');
    this.tab = 'stack';
    // Inject extra tab styles
    const s = document.createElement('style');
    s.textContent = `
      #stack-inspector .insp-tab{appearance:none;background:transparent;cursor:pointer;border:1px solid rgba(247,255,168,0.25);border-radius:4px;color:rgba(247,255,168,0.65);font:inherit;padding:2px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;}
      #stack-inspector .insp-tab.active{background:rgba(247,255,168,0.12);color:#F7FFA8;}
      #stack-inspector .trace-evt{padding:3px 6px;margin:2px 0;background:rgba(0,0,0,0.3);border-left:2px solid #F7FFA8;border-radius:3px;font-size:10px;}
      #stack-inspector .trace-evt .t{opacity:.55;font-size:9px;}
      #stack-inspector .trace-evt .l{color:#F7FFA8;font-weight:600;}
      #stack-inspector .trace-evt .s{color:rgba(247,255,168,0.85);}
      #stack-inspector .trace-evt pre{margin:2px 0 0;font-size:10px;opacity:.78;}
    `;
    document.head.appendChild(s);
  }

  async _switchTab(tab) {
    this.tab = tab;
    this.el.querySelectorAll('.insp-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    await this._renderTab();
  }

  async toggle(force) {
    this.open = (typeof force === 'boolean') ? force : !this.open;
    this.el.classList.toggle('show', this.open);
    if (this.open) await this._renderTab();
  }

  async _renderTab() {
    if (this.tab === 'stack')   return this._renderStack();
    if (this.tab === 'trace')   return this._renderTrace();
    if (this.tab === 'kb')      return this._renderKb();
    if (this.tab === 'essence') return this._renderEssence();
  }

  async _renderTrace() {
    this.bodyEl.innerHTML = '<div style="opacity:.55;font-size:10px;margin-bottom:4px;">live runtime flow · last 60 events · click ⟳ to clear</div><div style="margin-bottom:4px;"><button id="trace-clear" class="insp-tab">⟳ clear</button> <button id="trace-pause" class="insp-tab">‖ pause</button></div><div id="trace-list"></div>';
    const list = this.bodyEl.querySelector('#trace-list');
    let paused = false;
    const paint = () => {
      if (paused) return;
      const evts = window.__trace?.recent(60) || [];
      list.innerHTML = evts.length ? evts.slice().reverse().map(e =>
        `<div class="trace-evt"><span class="t">${e.t.slice(11,23)}</span> <span class="l">${escapeHtml(e.layer)}</span> <span class="s">${escapeHtml(e.step)}</span>${e.payload ? `<pre>${escapeHtml(JSON.stringify(e.payload).slice(0, 220))}</pre>` : ''}${e.source ? `<div style="opacity:.45;font-size:9px;">${escapeHtml(e.source)}</div>` : ''}</div>`
      ).join('') : '<div style="opacity:.55;">no events yet — say "hey jarvis" or click a node</div>';
    };
    paint();
    const off = window.__trace?.on(paint);
    this.bodyEl.querySelector('#trace-clear').addEventListener('click', () => { window.__trace?.clear(); paint(); });
    const pauseBtn = this.bodyEl.querySelector('#trace-pause');
    pauseBtn.addEventListener('click', () => { paused = !paused; pauseBtn.textContent = paused ? '▶ resume' : '‖ pause'; if (!paused) paint(); });
    this._tabCleanup = off;
  }

  async _renderKb() {
    if (this._tabCleanup) { try { this._tabCleanup(); } catch {} this._tabCleanup = null; }
    this.bodyEl.innerHTML = '<div style="opacity:.55;font-size:10px;margin-bottom:4px;">knowledge base · 374 entries · grouped by prefix · ★ usage</div><div id="kb-target"></div>';
    const target = this.bodyEl.querySelector('#kb-target');
    try {
      const { renderInto } = await import('./kb-browser.js');
      await renderInto(target, { showToast: window.showToast || console.log });
    } catch (e) { target.innerHTML = `<div style="color:#ff8a8a;">kb-browser load failed: ${e.message}</div>`; }
  }

  async _renderEssence() {
    if (this._tabCleanup) { try { this._tabCleanup(); } catch {} this._tabCleanup = null; }
    const focused = window.__perceptualFrame?.getFrame()?.screen_focus;
    const focusedFile = (window.__perceptualFrame?.nodes || []).find(n => n.id === focused?.focused_entity_id)?.file || null;
    this.bodyEl.innerHTML = `
      <div style="opacity:.55;font-size:10px;margin-bottom:4px;">essence · distill any file to its sparse XRAI</div>
      <div style="margin-bottom:6px;">focused: <b>${escapeHtml(focused?.focused_label || '(nothing)')}</b>${focusedFile ? `<br/><span style="opacity:.55;font-size:10px;">${escapeHtml(focusedFile)}</span>` : ''}</div>
      <button id="essence-go" class="insp-tab" ${focusedFile ? '' : 'disabled'}>distill focused</button>
      <input id="essence-path" placeholder="OR path/to/file.md" style="width:100%;margin-top:6px;padding:4px 6px;background:rgba(0,0,0,0.4);border:1px solid rgba(247,255,168,0.2);color:#F7FFA8;border-radius:4px;font:inherit;font-size:10px;" />
      <button id="essence-go2" class="insp-tab" style="margin-top:4px;">distill path</button>
      <div id="essence-out" style="margin-top:8px;"></div>
    `;
    const out = this.bodyEl.querySelector('#essence-out');
    const run = async (path) => {
      out.innerHTML = `<div style="opacity:.55;">distilling ${escapeHtml(path)}…</div>`;
      const { distill, renderInto } = await import('./essence-distiller.js');
      const result = await distill(path);
      if (!result.ok) { out.innerHTML = `<div style="color:#ff8a8a;">${escapeHtml(result.error)}: ${escapeHtml(result.message || '')}</div>`; return; }
      out.innerHTML = `<div style="opacity:.55;font-size:10px;margin-bottom:4px;">${result.cached ? 'cached' : 'fresh'} · ${escapeHtml(path)}</div>`;
      const target = document.createElement('div');
      out.appendChild(target);
      renderInto(target, result.essence);
    };
    if (focusedFile) this.bodyEl.querySelector('#essence-go').addEventListener('click', () => run(focusedFile));
    this.bodyEl.querySelector('#essence-go2').addEventListener('click', () => {
      const p = this.bodyEl.querySelector('#essence-path').value.trim();
      if (p) run(p);
    });
  }

  async _renderStack() {
    if (this._tabCleanup) { try { this._tabCleanup(); } catch {} this._tabCleanup = null; }
    this.bodyEl.innerHTML = '<div id="stack-rows"></div>';
    this.rowsEl = this.bodyEl.querySelector('#stack-rows');
    for (const layer of LAYERS) {
      const data = await Promise.resolve(layer.inspect());
      const dotCls = data.active ? 'on' : (data.current?.toLowerCase()?.includes('none') ? 'off' : 'warn');
      const row = document.createElement('div');
      row.className = 'row';
      const altsHtml = data.alternatives?.length ? `<div class="alts"><b>swap to →</b><ul>${data.alternatives.map(a => `<li>· ${a}</li>`).join('')}</ul></div>` : '';
      row.innerHTML = `
        <div class="head">
          <span class="dot ${dotCls}"></span>
          <span class="label">${layer.label}</span>
          <span class="arrow">▸</span>
        </div>
        <div class="body">
          <div><span class="k">current</span><span class="v">${escapeHtml(String(data.current ?? '—'))}</span></div>
          <div><span class="k">params</span><pre>${escapeHtml(JSON.stringify(data.params || {}, null, 2))}</pre></div>
          <div class="src">source · ${escapeHtml(data.source || '')}</div>
          ${altsHtml}
        </div>
      `;
      row.querySelector('.head').addEventListener('click', () => row.classList.toggle('open'));
      this.rowsEl.appendChild(row);
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

if (typeof window !== 'undefined') {
  const insp = new StackInspector();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => insp.init());
  else insp.init();
  window.__inspector = insp;
}
