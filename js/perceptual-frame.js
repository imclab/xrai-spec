// perceptual-frame.js
// ─────────────────────────────────────────────────────────────────────────────
// Always-on keeper of jARvis's live perceptual frame.
// Constitution: § Wonder + Expressive Freedom → Perceptual Frame Invariant (Paramount).
// Spec: 029 tasks.md Phase 6.11.
//
// Tracks:
//   • screen_focus      — focused node id, camera position, active panel
//   • recent_history    — ring buffer (last 20) of nav/click/voice/gesture
//   • predicted_next    — placeholder until agent.world_model wired
//   • session_arc       — start time, time-on-task, last prompt
//   • t                 — ISO timestamp
// ─────────────────────────────────────────────────────────────────────────────

const HISTORY_MAX = 20;

export class PerceptualFrame {
  constructor() {
    this.frame = {
      screen_focus: { focused_entity_id: null, focused_label: null, camera_position: null, active_panel: null, open_modal: null, selection_set: [] },
      camera_frame_summary: { unavailable: 'mediapipe_not_yet_subscribed' },
      recent_history: [],
      predicted_next: [],
      attention_distribution: {},
      session_arc: { started_at: new Date().toISOString(), time_on_task_s: 0, active_goal: null, completed_actions: [], abandoned_actions: [], last_prompt: null },
      t: new Date().toISOString(),
    };
    this._startTime = Date.now();
  }

  attach({ Graph, nodes }) {
    this.Graph = Graph;
    this.nodes = nodes || [];
    // Tick refresh frame at ~4Hz (Constitution invariant: refresh ≥ 4Hz)
    this._tickHandle = setInterval(() => this._refresh(), 250);
    // Subscribe to navigation events from jarvis-web.js + hands-web.js + the page
    document.addEventListener('jarvis:wake',     () => this._push('wake', {}));
    document.addEventListener('jarvis:zoom',     (e) => this._push('zoom', e.detail || {}));
    document.addEventListener('hands:click',     (e) => this._push('hands.click', e.detail || {}));
    document.addEventListener('hands:zoom',      (e) => this._push('hands.zoom', e.detail || {}));
    // Hook into page-level openNode if present
    if (typeof window.openNode === 'function' && !window.openNode.__pfWrapped) {
      const orig = window.openNode;
      const self = this;
      window.openNode = function(node) {
        self._setFocus(node);
        self._push('open', { id: node?.id, label: node?.label, type: node?.type });
        return orig.apply(this, arguments);
      };
      window.openNode.__pfWrapped = true;
    }
  }

  detach() { clearInterval(this._tickHandle); }

  recordPrompt(text) {
    this.frame.session_arc.last_prompt = { text, t: new Date().toISOString() };
    this._push('prompt', { text: text.slice(0, 80) });
  }

  setActiveGoal(goal) { this.frame.session_arc.active_goal = goal; }

  _setFocus(node) {
    if (!node) return;
    this.frame.screen_focus.focused_entity_id = node.id;
    this.frame.screen_focus.focused_label = node.label;
    this.frame.attention_distribution[node.id] = (this.frame.attention_distribution[node.id] || 0) + 250;
  }

  _push(type, detail) {
    this.frame.recent_history.push({ t: new Date().toISOString(), type, ...detail });
    if (this.frame.recent_history.length > HISTORY_MAX) this.frame.recent_history.shift();
  }

  _refresh() {
    this.frame.t = new Date().toISOString();
    this.frame.session_arc.time_on_task_s = Math.round((Date.now() - this._startTime) / 1000);
    if (this.Graph) {
      try { this.frame.screen_focus.camera_position = this.Graph.cameraPosition(); } catch {}
    }
  }

  getFrame() {
    // Compact copy for sending across to LLM context
    return {
      screen_focus: this.frame.screen_focus,
      recent_history: this.frame.recent_history.slice(-8),
      session_arc: this.frame.session_arc,
      t: this.frame.t,
      camera_frame_summary: this.frame.camera_frame_summary,
    };
  }
}

if (typeof window !== 'undefined') {
  window.__perceptualFrame = new PerceptualFrame();
  // Will be attached after Graph is ready (index.html calls window.__perceptualFrame.attach)
}
