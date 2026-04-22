// jarvis-web.js — v1 conversational jARvis for xrai.dev
// ─────────────────────────────────────────────────────────────────────────────
// Patterns adapted from portals_v4/src/services/jarvis/ + voice-intelligence/.
//
// v1 capabilities:
//   - "Hey jarvis" wake-word (fuzzy phonetic match, 8 variants)
//   - Conversation mode: after wake, mic stays live + chats turn-by-turn
//   - Content index: auto-builds per-node summary cache on first visit
//     (localStorage, 24h TTL). jARvis searches it before falling back.
//   - Navigation commands: close, back, home, clear, rotate, zoom, next,
//     previous, read, show, open…
//   - Web search fallback: Wikipedia REST for unknown questions
//   - Compact HUD pullout (not the big panel) — semi-transparent, auto-dismiss
//   - Per-user identity: UUID in localStorage, cookie mirror for cross-tab
//   - Memory: query log, node visits, preferences, facts — auto-compacting
//   - Auto-compounding: suggests based on history, "last time you…" resume
//   - Human voice: prefers premium / neural / enhanced browser voices, lowered
//     pitch, natural pacing, ellipsis-sensitive pauses
// ─────────────────────────────────────────────────────────────────────────────

const WAKE_PHRASES = [
  'hey jarvis', 'hey jarvas', 'hey jar vis', 'a jarvis',
  'hi jarvis', 'ok jarvis', 'jarvis', 'jarvas', 'j.a.r.v.i.s',
];
const EXIT_PHRASES = [
  'thanks', 'thank you', 'goodbye', 'bye', 'that\'s all',
  'thats all', 'stop listening', 'go to sleep', 'sleep',
];
const NAV_VERBS = {
  close:    ['close', 'dismiss', 'hide', 'shut'],
  back:     ['back', 'go back', 'previous one', 'prior'],
  home:     ['home', 'start over', 'reset', 'take me home'],
  clear:    ['clear', 'clear scene', 'reset graph'],
  zoom_in:  ['zoom in', 'closer', 'get closer'],
  zoom_out: ['zoom out', 'further', 'step back', 'overview'],
  rotate:   ['rotate', 'spin', 'orbit'],
};

const LOG_KEY = 'xrai.jarvis.log';
const CTX_KEY = 'xrai.jarvis.context';
const USER_KEY = 'xrai.user.id';
const INDEX_KEY = 'xrai.content.index';
const INDEX_TTL = 24 * 60 * 60 * 1000; // 24h
const MAX_LOG = 80;
const CONVERSATION_TIMEOUT = 18000;   // 18s silence → exit conversation

function detectSR() {
  return typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

// ─── Content index — scans known files, builds searchable per-node cache ────
async function buildContentIndex(nodes) {
  const existing = localStorage.getItem(INDEX_KEY);
  if (existing) {
    try {
      const idx = JSON.parse(existing);
      if (idx.builtAt && Date.now() - idx.builtAt < INDEX_TTL) return idx.entries;
    } catch {}
  }
  const entries = {};
  const fetchable = nodes.filter(n => n.file && !n.file.startsWith('__inline__:'));
  // Concurrent fetch, 6 at a time
  const queue = [...fetchable];
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const n = queue.shift();
      try {
        const res = await fetch(n.file);
        if (!res.ok) continue;
        const raw = await res.text();
        // Summary: first ~600 non-header chars, normalized
        const clean = raw
          .replace(/^---[\s\S]*?---/, '')       // strip frontmatter
          .replace(/^#{1,6}\s+.*$/gm, '')       // strip headers
          .replace(/```[\s\S]*?```/g, '')       // strip code blocks
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
          .replace(/[*_`>#|]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const summary = clean.slice(0, 560);
        // Keywords: most-frequent non-stopword tokens > 4 chars
        const tokens = clean.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
        const STOP = new Set(['this','that','with','from','into','there','these','those','about','have','been','which','their','would','could','should','will','when','then','than','also','more','such','where','because','through','between','across','under','over','only','much','very','some','many','most','other','each','what','they','your','our','they']);
        const freq = {};
        tokens.forEach(t => { if (!STOP.has(t)) freq[t] = (freq[t] || 0) + 1; });
        const keywords = Object.entries(freq)
          .sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k);
        entries[n.id] = { label: n.label, summary, keywords, file: n.file };
      } catch {}
    }
  });
  await Promise.all(workers);
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify({ builtAt: Date.now(), entries }));
  } catch {}
  return entries;
}

// ─── Web search fallback — Wikipedia REST (CORS-enabled, no auth) ──────────
async function webSearchWikipedia(query) {
  try {
    const q = encodeURIComponent(query.slice(0, 120));
    // Step 1: search for a title
    const sRes = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/title?q=${q}&limit=1`);
    if (!sRes.ok) return null;
    const sData = await sRes.json();
    const title = sData.pages?.[0]?.key;
    if (!title) return null;
    // Step 2: summary
    const pRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!pRes.ok) return null;
    const pData = await pRes.json();
    return {
      source: 'wikipedia',
      title: pData.title,
      extract: pData.extract,
      url: pData.content_urls?.desktop?.page,
    };
  } catch { return null; }
}

// ─── Jarvis ─────────────────────────────────────────────────────────────────
export class Jarvis {
  constructor({ resolveQuery, openNode, showToast, Graph, nodes, onHudShow }) {
    this.resolveQuery = resolveQuery;
    this.openNode = openNode;
    this.showToast = showToast || (m => console.log(m));
    this.Graph = Graph;
    this.nodes = nodes;
    this.onHudShow = onHudShow || (() => {});

    this.active = false;
    this.listening = false;
    this.inConversation = false;    // after wake, stays true across turns
    this.rec = null;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.toggleBtn = null;
    this.dot = null;
    this.voice = null;
    this.conversationTimer = null;

    this.user = this._loadUser();
    this.log = this._loadLog();
    this.context = this._loadContext();
    this.index = {};   // hydrated async via ensureIndex()
  }

  // ─── identity ─────────────────────────────────────────────────────────────
  _loadUser() {
    let id = localStorage.getItem(USER_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(USER_KEY, id);
      // mirror to cookie for cross-subdomain later
      try {
        document.cookie = `xrai_user_id=${id}; path=/; max-age=${60 * 60 * 24 * 365 * 2}; SameSite=Lax`;
      } catch {}
    }
    return { id };
  }

  // ─── memory ───────────────────────────────────────────────────────────────
  _loadLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
  }
  _saveLog() {
    try {
      this.log = this.log.slice(-MAX_LOG);
      localStorage.setItem(LOG_KEY, JSON.stringify(this.log));
    } catch {}
  }
  _loadContext() {
    try {
      const raw = localStorage.getItem(CTX_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { visits: 0, firstSeen: null, lastSeen: null, recentNodes: [], facts: [], preferences: {} };
  }
  _saveContext() {
    try { localStorage.setItem(CTX_KEY, JSON.stringify(this.context)); } catch {}
  }
  record(entry) {
    this.log.push({ ...entry, t: Date.now(), uid: this.user.id });
    // Fact extraction — cheap heuristic: query that maps to a node becomes a fact
    if (entry.q && entry.hit) {
      const fact = `asked-about:${entry.hit}`;
      const existing = this.context.facts.find(f => f.k === fact);
      if (existing) existing.n++;
      else this.context.facts.push({ k: fact, n: 1, first: Date.now() });
      this.context.facts.sort((a, b) => b.n - a.n);
      this.context.facts = this.context.facts.slice(0, 40);
      this._saveContext();
    }
    this._saveLog();
  }

  async ensureIndex() {
    if (Object.keys(this.index).length) return this.index;
    this.index = await buildContentIndex(this.nodes || []);
    return this.index;
  }

  // ─── voice ────────────────────────────────────────────────────────────────
  _selectVoice() {
    if (!this.synth) return null;
    if (this.voice) return this.voice;
    const voices = this.synth.getVoices();
    if (!voices.length) return null;
    const enVoices = voices.filter(v => /^en[-_]/i.test(v.lang));
    // Prefer premium / neural / enhanced quality indicators
    const premium = enVoices.find(v => /(premium|enhanced|neural|google|natural)/i.test(v.name));
    const male = enVoices.find(v => /(daniel|alex|fred|aaron|thomas|jamie|lee|oliver|gordon|ralph)/i.test(v.name));
    this.voice = premium || male || enVoices[0] || voices[0];
    return this.voice;
  }
  speak(text, { onend } = {}) {
    if (!this.synth || !text) { onend && onend(); return; }
    try { this.synth.cancel(); } catch {}
    // Natural pacing: split on ellipsis for pause effect
    const chunks = text.split(/(\.{3,}|—)/).filter(Boolean);
    let idx = 0;
    const speakChunk = () => {
      if (idx >= chunks.length) { onend && onend(); return; }
      const u = new SpeechSynthesisUtterance(chunks[idx].trim());
      const v = this._selectVoice();
      if (v) u.voice = v;
      u.rate = 1.02;
      u.pitch = 0.95;
      u.volume = 0.9;
      u.onend = () => { idx++; setTimeout(speakChunk, 220); };
      this.synth.speak(u);
    };
    speakChunk();
  }

  // ─── lifecycle ────────────────────────────────────────────────────────────
  async enable() {
    const SR = detectSR();
    if (!SR) {
      this.showToast('SpeechRecognition not supported — try Chrome, Edge, or Safari.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      this.showToast('Microphone permission denied.', 4200);
      return false;
    }

    this.rec = new SR();
    this.rec.continuous = true;
    this.rec.interimResults = true;
    this.rec.lang = 'en-US';

    this.rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) continue;
        const t = r[0].transcript.trim().toLowerCase();
        if (!t) continue;

        if (!this.inConversation) {
          if (WAKE_PHRASES.some(p => t.includes(p))) this._onWake(t);
        } else {
          // In conversation — every final utterance is either a command,
          // an exit phrase, or a continued question.
          if (EXIT_PHRASES.some(p => t === p || t.endsWith(' ' + p))) {
            this._endConversation('natural');
          } else {
            this._onTurn(t);
          }
        }
      }
    };
    this.rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'audio-capture') return;
      if (e.error === 'not-allowed') { this.disable(); this.showToast('Mic access denied.'); }
    };
    this.rec.onend = () => {
      this.listening = false;
      this._updateDot();
      if (this.active) setTimeout(() => this._start(), 180);
    };

    this.active = true;
    this.context.visits = (this.context.visits || 0) + 1;
    if (!this.context.firstSeen) this.context.firstSeen = Date.now();
    this.context.lastSeen = Date.now();
    this._saveContext();

    // Hydrate index in background
    this.ensureIndex().then(n => {
      const count = Object.keys(n).length;
      if (count) this.showToast(`jARvis indexed ${count} nodes.`, 2600);
    });

    this._start();

    // Personalized greeting — human, brief, references memory
    const greet = this._composeGreeting();
    this.speak(greet);
    this.showToast('jARvis listening — say "hey jarvis"', 3600);
    this._updateBtn();
    return true;
  }
  disable() {
    this.active = false;
    this.inConversation = false;
    clearTimeout(this.conversationTimer);
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
    } catch {}
  }

  _composeGreeting() {
    const v = this.context.visits;
    if (v === 1) return 'jARvis here. Say "hey jarvis" and ask anything.';
    const last = this.log[this.log.length - 1];
    const topFact = this.context.facts[0];
    if (last && topFact) {
      return `Welcome back. Last time you asked about ${last.q.split(' ').slice(0, 5).join(' ')}. Say "hey jarvis" to pick up.`;
    }
    if (last) return `Good to see you again. Say "hey jarvis" when you're ready.`;
    return `jARvis ready. Say "hey jarvis" to start.`;
  }

  _onWake(_utterance) {
    this.inConversation = true;
    this._updateDot();
    this._resetConversationTimer();
    this.speak('yes?');
    this.showToast('listening — keep talking', 4000);
  }
  _resetConversationTimer() {
    clearTimeout(this.conversationTimer);
    this.conversationTimer = setTimeout(() => this._endConversation('silence'), CONVERSATION_TIMEOUT);
  }
  _endConversation(reason) {
    if (!this.inConversation) return;
    this.inConversation = false;
    this._updateDot();
    clearTimeout(this.conversationTimer);
    if (reason === 'natural') this.speak('anytime.');
  }

  async _onTurn(utterance) {
    this._resetConversationTimer();
    this.record({ q: utterance });

    // 1. Navigation commands
    for (const [verb, phrases] of Object.entries(NAV_VERBS)) {
      if (phrases.some(p => utterance === p || utterance.startsWith(p + ' ') || utterance.endsWith(' ' + p))) {
        this._doNav(verb);
        return;
      }
    }

    // 2. Local graph match
    const hit = this.resolveQuery ? this.resolveQuery(utterance) : null;
    if (hit) {
      this._openHit(hit, utterance);
      return;
    }

    // 3. Content-index fuzzy match
    const indexed = this._searchIndex(utterance);
    if (indexed) {
      const node = (this.nodes || []).find(n => n.id === indexed.id);
      if (node) {
        this._openHit(node, utterance, indexed.summary);
        return;
      }
    }

    // 4. Web search fallback (Wikipedia)
    this.showToast('jARvis: searching…', 2000);
    const web = await webSearchWikipedia(utterance);
    if (web && web.extract) {
      this.record({ q: utterance, webHit: web.title });
      const answer = web.extract.split(/\.\s+/)[0] + '.';
      this.speak(answer);
      this.onHudShow({
        title: web.title,
        body: web.extract,
        source: `wikipedia · ${web.url}`,
        url: web.url,
      });
      return;
    }

    // 5. Give up gracefully
    this.speak(`I don't have "${utterance}" in my index yet. Try a different phrasing.`);
    this.showToast(`jARvis: nothing for "${utterance.slice(0, 40)}"`, 4000);
  }

  _searchIndex(query) {
    const q = query.toLowerCase();
    const qTokens = q.match(/[a-z][a-z-]{3,}/g) || [];
    if (!qTokens.length) return null;
    let best = null; let bestScore = 0;
    for (const [id, entry] of Object.entries(this.index)) {
      let score = 0;
      if (entry.label.toLowerCase().includes(q)) score += 10;
      qTokens.forEach(t => {
        if (entry.keywords.includes(t)) score += 3;
        if (entry.summary.toLowerCase().includes(t)) score += 1;
      });
      if (score > bestScore) { bestScore = score; best = { id, ...entry }; }
    }
    return bestScore >= 3 ? best : null;
  }

  _openHit(node, query, bodyOverride) {
    this.openNode(node);
    this._flyTo(node);
    this.context.recentNodes = [node.id, ...(this.context.recentNodes || []).filter(x => x !== node.id)].slice(0, 12);
    this._saveContext();
    this.record({ q: query, hit: node.id });
    // Compact HUD with the summary
    const summary = bodyOverride || this.index[node.id]?.summary || '';
    this.onHudShow({
      title: node.label,
      body: summary,
      meta: `${node.type}${node.file ? ' · ' + node.file : ''}`,
    });
    this.speak(this._phraseFor(node, summary));
  }

  _flyTo(node) {
    if (!this.Graph) return;
    const d = 110;
    const r = 1 + d / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
    try {
      this.Graph.cameraPosition(
        { x: (node.x || 1) * r, y: (node.y || 1) * r, z: (node.z || 1) * r },
        node, 1400
      );
    } catch {}
  }

  _phraseFor(node, summary) {
    const short = (summary || '').split(/[.!?]\s/)[0].slice(0, 180);
    const lead = {
      concept:  `Opening ${node.label}.`,
      file:     `Pulling up ${node.label}.`,
      rfc:      `${node.label} — a spec-change proposal.`,
      example:  `Here's the ${node.label} example.`,
      runtime:  `${node.label} runtime documentation.`,
      person:   `That's ${node.label}.`,
      place:    `${node.label}.`,
      xrai:     `The ${node.label} primitive.`,
      structure: `Inside ${node.label}.`,
    }[node.type] || `Opening ${node.label}.`;
    return short ? `${lead} ${short}` : lead;
  }

  _doNav(verb) {
    switch (verb) {
      case 'close':
        this.onHudShow(null);
        document.dispatchEvent(new CustomEvent('jarvis:close-panel'));
        this.speak('closed.');
        break;
      case 'back':
        if (this.context.recentNodes.length > 1) {
          const prev = this.context.recentNodes[1];
          const node = (this.nodes || []).find(n => n.id === prev);
          if (node) { this._openHit(node, 'back'); return; }
        }
        this.speak('no prior node.');
        break;
      case 'home':
        this.onHudShow(null);
        document.dispatchEvent(new CustomEvent('jarvis:close-panel'));
        try { this.Graph && this.Graph.cameraPosition({ x: 0, y: 0, z: 480 }, { x: 0, y: 0, z: 0 }, 1400); } catch {}
        this.speak('back to overview.');
        break;
      case 'clear':
        this.onHudShow(null);
        this.speak('cleared.');
        break;
      case 'zoom_in':  document.dispatchEvent(new CustomEvent('jarvis:zoom', { detail: { dir: 'in' } })); this.speak('closer.'); break;
      case 'zoom_out': document.dispatchEvent(new CustomEvent('jarvis:zoom', { detail: { dir: 'out' } })); this.speak('overview.'); break;
      case 'rotate':   document.dispatchEvent(new CustomEvent('jarvis:rotate')); this.speak('rotating.'); break;
    }
  }

  // ─── DOM ──────────────────────────────────────────────────────────────────
  wireToDOM() {
    this.toggleBtn = document.getElementById('jarvis-toggle');
    this.dot = document.getElementById('jarvis-dot');
    if (!this.toggleBtn) return;
    if (!detectSR()) {
      this.toggleBtn.title = 'SpeechRecognition not supported';
      this.toggleBtn.textContent = 'jarvis n/a';
      this.toggleBtn.disabled = true;
      return;
    }
    this.toggleBtn.addEventListener('click', () => {
      if (this.active) this.disable(); else this.enable();
    });
    this._updateBtn();
    if (this.synth) {
      this.synth.onvoiceschanged = () => this._selectVoice();
      this._selectVoice();
    }
    // Pre-build index quietly so first wake-word response is instant
    setTimeout(() => this.ensureIndex(), 2500);
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
    if (this.inConversation) this.dot.classList.add('awaiting');
    else if (this.listening) this.dot.classList.add('listening');
    else this.dot.classList.add('idle');
  }
}
