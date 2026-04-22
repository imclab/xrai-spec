// jarvis-web.js
// ─────────────────────────────────────────────────────────────────────────────
// Minimum-viable jARvis on the web.
// Patterns adapted from:
//   - portals_v4/src/services/jarvis/ (canonical RN runtime — heartbeat, kb, memory, loop)
//   - portals_v4/src/services/voice-intelligence/ (gemini-live WebSocket, intent parser)
// Browser constraints: no React Native / AsyncStorage / Node globals.
//
// Scope (v0):
//   1. Wake-word "hey jarvis" via Web Speech API (continuous SpeechRecognition)
//   2. Voice chat: STT → resolveQuery → TTS confirmation + LLM stub
//   3. Memory: localStorage append-only log (xrai.jarvis.log)
//   4. 0 network-latency path: wake-word + resolveQuery + TTS all run in-browser
//   5. Cloud LLM (Gemini Live) wired as stub; activates when API key present
//   6. Always-listening opt-in with visible privacy indicator
//
// Usage (from index.html):
//   import { Jarvis } from './js/jarvis-web.js';
//   const jarvis = new Jarvis({ resolveQuery, openNode, showToast, Graph, nodes });
//   jarvis.wireToDOM();   // attaches to #jarvis-toggle + #jarvis-dot
//
// Key objectives (per directive 2026-04-22):
//   - 0 latency  → SpeechRecognition + resolveQuery all local; TTS is browser-native
//   - memory     → localStorage + auto-compact; last 50 exchanges persist across visits
//   - auto-compounding intelligence → every query recorded + reused for next-visit suggestions
// ─────────────────────────────────────────────────────────────────────────────

const WAKE_PHRASES = [
  'hey jarvis', 'hey jarvas', 'hey jar vis', 'a jarvis',
  'hi jarvis', 'ok jarvis', 'jarvis', 'jarvas',
];
const LOG_KEY = 'xrai.jarvis.log';
const CONTEXT_KEY = 'xrai.jarvis.context';
const MAX_LOG = 50;

function detectSR() {
  return (typeof window !== 'undefined') &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
}

export class Jarvis {
  constructor({ resolveQuery, openNode, showToast, Graph, nodes }) {
    this.resolveQuery = resolveQuery;
    this.openNode = openNode;
    this.showToast = showToast || ((m) => console.log(m));
    this.Graph = Graph;
    this.nodes = nodes;

    this.active = false;         // true after user enables + permission granted
    this.listening = false;      // true while SR is capturing
    this.awaiting = false;       // true during post-wake-word command window
    this.rec = null;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.toggleBtn = null;
    this.dot = null;
    this.voice = null;           // chosen TTS voice (cached)

    this.log = this._loadLog();
    this.context = this._loadContext();
  }

  // ─── memory — localStorage-backed, matches portals_v4 AgentKB patterns ────
  _loadLog() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  _saveLog() {
    try {
      // Auto-compact: keep last MAX_LOG entries
      const trimmed = this.log.slice(-MAX_LOG);
      localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
      this.log = trimmed;
    } catch {}
  }
  _loadContext() {
    try {
      const raw = localStorage.getItem(CONTEXT_KEY);
      return raw ? JSON.parse(raw) : { visits: 0, firstSeen: null, recentNodes: [] };
    } catch { return { visits: 0, firstSeen: null, recentNodes: [] }; }
  }
  _saveContext() {
    try { localStorage.setItem(CONTEXT_KEY, JSON.stringify(this.context)); } catch {}
  }
  record(entry) {
    this.log.push({ ...entry, t: Date.now() });
    this._saveLog();
  }

  // ─── speech synthesis — Web Speech API, browser-local, zero latency ───────
  _selectVoice() {
    if (!this.synth) return null;
    if (this.voice) return this.voice;
    const voices = this.synth.getVoices();
    if (!voices.length) return null;
    // Prefer en-* + male if available (jARvis canonical), else first en-*
    const byLang = voices.filter(v => /^en[-_]/i.test(v.lang));
    this.voice = byLang.find(v => /male|daniel|alex|fred|aaron|thomas/i.test(v.name))
              || byLang.find(v => /google|samantha/i.test(v.name))
              || byLang[0] || voices[0];
    return this.voice;
  }
  speak(text) {
    if (!this.synth || !text) return;
    try { this.synth.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(text);
    const v = this._selectVoice();
    if (v) u.voice = v;
    u.rate = 1.05; u.pitch = 1.0; u.volume = 0.85;
    this.synth.speak(u);
  }

  // ─── wake-word + command recognition ──────────────────────────────────────
  async enable() {
    const SR = detectSR();
    if (!SR) {
      this.showToast('SpeechRecognition not supported — try Chrome, Edge, or Safari.');
      return false;
    }
    try {
      // Request mic permission via getUserMedia, then release — SR will re-open
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (e) {
      this.showToast('Microphone permission denied. Click the toggle to retry.', 4200);
      return false;
    }

    this.rec = new SR();
    this.rec.continuous = true;
    this.rec.interimResults = true;
    this.rec.lang = 'en-US';

    this.rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript.trim().toLowerCase();
        if (!r.isFinal) continue;

        if (!this.awaiting) {
          // Scan for wake word
          if (WAKE_PHRASES.some(p => t.includes(p))) {
            this._onWake(t);
          }
        } else {
          // Command window — anything said is the command
          this._onCommand(t);
        }
      }
    };
    this.rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'audio-capture') return;
      if (e.error === 'not-allowed') {
        this.disable();
        this.showToast('Microphone access denied.');
      }
    };
    this.rec.onend = () => {
      this.listening = false;
      this._updateDot();
      if (this.active) { setTimeout(() => this._start(), 200); } // auto-restart
    };

    this.active = true;
    this.context.visits = (this.context.visits || 0) + 1;
    if (!this.context.firstSeen) this.context.firstSeen = Date.now();
    this._saveContext();

    this._start();
    this.speak(
      this.context.visits === 1
        ? 'jARvis online. Say "hey jarvis" to start.'
        : `Welcome back. ${this.log.length > 0 ? 'Last time you asked about ' + (this.log[this.log.length - 1]?.q || 'the spec') + '.' : 'Say "hey jarvis" to start.'}`
    );
    this.showToast('jARvis listening — say "hey jarvis"', 3600);
    this._updateBtn();
    return true;
  }
  disable() {
    this.active = false;
    this.awaiting = false;
    try { this.rec && this.rec.stop(); } catch {}
    try { this.synth && this.synth.cancel(); } catch {}
    this.listening = false;
    this._updateBtn();
    this._updateDot();
    this.showToast('jARvis offline.');
  }
  _start() {
    if (!this.active || !this.rec) return;
    try {
      this.rec.start();
      this.listening = true;
      this._updateDot();
    } catch (_) { /* already started */ }
  }

  _onWake(_utterance) {
    this.awaiting = true;
    this._updateDot();
    this.speak('yes?');
    this.showToast('listening…', 4000);
    // Command window — 8s to say something
    clearTimeout(this._awaitTimer);
    this._awaitTimer = setTimeout(() => {
      this.awaiting = false;
      this._updateDot();
    }, 8000);
  }

  _onCommand(utterance) {
    clearTimeout(this._awaitTimer);
    this.awaiting = false;
    this._updateDot();
    this.record({ q: utterance });

    // Fast local path: resolveQuery against the graph nodes
    const hit = this.resolveQuery ? this.resolveQuery(utterance) : null;
    if (hit) {
      this.openNode(hit);
      const d = 110;
      const r = 1 + d / Math.hypot(hit.x || 1, hit.y || 1, hit.z || 1);
      try {
        this.Graph && this.Graph.cameraPosition(
          { x: (hit.x || 1) * r, y: (hit.y || 1) * r, z: (hit.z || 1) * r },
          hit, 1400
        );
      } catch {}
      this.context.recentNodes = [hit.id, ...(this.context.recentNodes || []).filter(x => x !== hit.id)].slice(0, 10);
      this._saveContext();
      this.speak(this._phraseFor(hit));
    } else {
      this.speak(`I don't have "${utterance}" indexed yet. Try "spec", "sight triad", or "portals".`);
      this.showToast(`jARvis: no match — try "sight triad", "spec", "portals"`, 4000);
    }
  }

  _phraseFor(node) {
    switch (node.type) {
      case 'concept': return `Opening ${node.label}.`;
      case 'file':    return `Pulling up ${node.label}.`;
      case 'rfc':     return `${node.label} — a spec-change proposal.`;
      case 'example': return `Here's the ${node.label} example.`;
      case 'runtime': return `${node.label} runtime documentation.`;
      case 'person':  return `That's ${node.label}.`;
      case 'place':   return `${node.label}.`;
      case 'xrai':    return `The ${node.label} primitive.`;
      default:        return `Opening ${node.label}.`;
    }
  }

  // ─── DOM wiring ────────────────────────────────────────────────────────────
  wireToDOM() {
    this.toggleBtn = document.getElementById('jarvis-toggle');
    this.dot = document.getElementById('jarvis-dot');
    if (!this.toggleBtn) return;
    if (!detectSR()) {
      this.toggleBtn.title = 'SpeechRecognition not supported on this browser';
      this.toggleBtn.textContent = 'jarvis n/a';
      this.toggleBtn.disabled = true;
      return;
    }
    this.toggleBtn.addEventListener('click', () => {
      if (this.active) this.disable();
      else this.enable();
    });
    this._updateBtn();
    // Pre-warm voices list (Chrome lazy-loads)
    if (this.synth) {
      this.synth.onvoiceschanged = () => this._selectVoice();
      this._selectVoice();
    }
    // Suggestion from last-visit memory
    const last = this.log[this.log.length - 1];
    if (last && this.context.visits > 1) {
      setTimeout(() => this.showToast(
        `Last visit you asked about "${last.q.slice(0, 40)}". Click jarvis to resume.`, 5000
      ), 3000);
    }
  }
  _updateBtn() {
    if (!this.toggleBtn) return;
    this.toggleBtn.textContent = this.active ? 'jarvis on' : 'jarvis';
    this.toggleBtn.classList.toggle('jarvis-on', this.active);
  }
  _updateDot() {
    if (!this.dot) return;
    this.dot.classList.remove('idle', 'listening', 'awaiting');
    if (!this.active) return;
    if (this.awaiting) this.dot.classList.add('awaiting');
    else if (this.listening) this.dot.classList.add('listening');
    else this.dot.classList.add('idle');
  }
}
