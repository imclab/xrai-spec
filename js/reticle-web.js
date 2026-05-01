// reticle-web.js
// ─────────────────────────────────────────────────────────────────────────────
// Visible feedback layer for hands-web.js.
//
// Subscribes to:
//   • hands:available  {mode}            — auto-show gesture key for 6s
//   • hands:pointer-move {x, y, hand}    — moves on-screen reticle
//   • hands:click       {x, y, hand}     — pinch flash
//   • hands:zoom        {dir, factor}    — brief pulse
//
// Renders:
//   • A small radical reticle (≤16px) at the pointer position. Per-hand color.
//   • Optional thin laser line from the bottom-right preview-cam to the reticle
//     (toggle via the gesture-key UI; off by default).
//   • A semi-transparent "gesture key" cheat-sheet card. Auto-shows on hands
//     enable; auto-hides after 6s of no use; press "?" to summon again.
//
// Doctrine: constitution § Wonder + Expressive Freedom — Pointing addendum.
// Implements spec 029 tasks.md Phase 6.4 (per-finger ray viz, index-finger v1).
// ─────────────────────────────────────────────────────────────────────────────

const HAND_COLORS = ['#F7FFA8', '#A8E0FF']; // hand 0 = brand yellow, hand 1 = cyan
const RETICLE_SIZE = 14;
const KEY_AUTOHIDE_MS = 6000;

export class Reticle {
  constructor() {
    this.reticles = {};         // per-hand DOM nodes
    this.lastMoveAt = 0;
    this.keyEl = null;
    this.keyTimer = null;
    this.style = 'reticle';     // 'reticle' | 'laser' | 'cone'
  }

  init() {
    this._injectStyles();
    this._buildKey();
    document.addEventListener('hands:available', (e) => this._onHandsAvailable(e));
    document.addEventListener('hands:pointer-move', (e) => this._onMove(e));
    document.addEventListener('hands:click', (e) => this._onClick(e));
    document.addEventListener('hands:zoom', () => this._pulseKey());
    document.addEventListener('jarvis:wake', (e) => {
      // First wake of session also surfaces the gesture key (modified mini-map style)
      if (e.detail?.firstEver) this._showKey(true);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) this._showKey(true);
    });
  }

  _injectStyles() {
    if (document.getElementById('reticle-styles')) return;
    const s = document.createElement('style');
    s.id = 'reticle-styles';
    s.textContent = `
      .reticle{
        position:fixed; pointer-events:none; z-index:18;
        width:${RETICLE_SIZE}px; height:${RETICLE_SIZE}px;
        margin-left:-${RETICLE_SIZE/2}px; margin-top:-${RETICLE_SIZE/2}px;
        border-radius:50%; border:1.5px solid currentColor;
        box-shadow:0 0 8px currentColor, inset 0 0 4px currentColor;
        background:radial-gradient(circle, currentColor 0 1.5px, transparent 2.5px);
        opacity:.85; transition:transform .06s linear, opacity .25s ease;
        will-change:transform, opacity;
      }
      .reticle.click{ animation:retClick .35s ease-out; }
      @keyframes retClick{
        0%  { transform:scale(1);   opacity:1;   }
        40% { transform:scale(2.6); opacity:.9;  }
        100%{ transform:scale(1);   opacity:.85; }
      }
      .reticle.laser::before{
        content:''; position:absolute; left:50%; top:50%;
        width:1px; height:160px; transform-origin:top center;
        background:linear-gradient(180deg, currentColor, transparent);
        opacity:.45;
      }
      .reticle.cone::before{
        content:''; position:absolute; left:50%; top:50%;
        width:0; height:0; transform-origin:top center;
        border-left:36px solid transparent; border-right:36px solid transparent;
        border-top:160px solid currentColor; opacity:.18; filter:blur(1px);
        margin-left:-36px;
      }

      #gesture-key{
        position:fixed; top:84px; right:16px; z-index:17;
        max-width:240px; padding:10px 12px;
        background:rgba(8,10,14,0.55); backdropFilter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        border:1px solid rgba(247,255,168,0.25); border-radius:10px;
        color:rgba(247,255,168,0.92);
        font:11px/1.45 ui-monospace, "SF Mono", Menlo, monospace;
        opacity:0; transform:translateY(-6px);
        transition:opacity .35s ease, transform .35s ease;
        pointer-events:auto;
      }
      #gesture-key.show{ opacity:1; transform:translateY(0); }
      #gesture-key h4{
        margin:0 0 6px; font-size:10px; letter-spacing:.12em; text-transform:uppercase;
        color:rgba(247,255,168,0.65); font-weight:500;
      }
      #gesture-key ul{ margin:0; padding:0; list-style:none; }
      #gesture-key li{ display:flex; gap:8px; padding:2px 0; }
      #gesture-key .g{ flex:0 0 88px; color:#F7FFA8; }
      #gesture-key .a{ flex:1; color:rgba(247,255,168,0.78); }
      #gesture-key .row{ display:flex; gap:6px; margin-top:8px; }
      #gesture-key button{
        flex:1; appearance:none; background:transparent; cursor:pointer;
        border:1px solid rgba(247,255,168,0.25); border-radius:6px;
        color:rgba(247,255,168,0.78); font:inherit; padding:3px 0;
      }
      #gesture-key button.active{ background:rgba(247,255,168,0.12); color:#F7FFA8; }
      #gesture-key .hint{ margin-top:6px; opacity:.55; font-size:10px; }
      #gesture-key .x{
        position:absolute; top:6px; right:8px; cursor:pointer;
        color:rgba(247,255,168,0.55); font-size:12px;
      }
    `;
    document.head.appendChild(s);
  }

  _buildKey() {
    if (document.getElementById('gesture-key')) return;
    const el = document.createElement('div');
    el.id = 'gesture-key';
    el.innerHTML = `
      <span class="x" title="hide (press ? to summon)">×</span>
      <h4>gesture key</h4>
      <ul>
        <li><span class="g">pinch ✊</span><span class="a">index + thumb → click / select</span></li>
        <li><span class="g">two-hand ✋✋</span><span class="a">spread/contract → zoom</span></li>
        <li><span class="g">point ☝︎</span><span class="a">index tip → reticle (where you're aiming)</span></li>
        <li><span class="g">say ⌨︎</span><span class="a">"hey jarvis" → wake</span></li>
      </ul>
      <div class="row">
        <button data-style="reticle" class="active">reticle</button>
        <button data-style="laser">laser</button>
        <button data-style="cone">cone</button>
      </div>
      <div class="hint">press <b>?</b> to summon · click × to hide</div>
    `;
    el.querySelector('.x').addEventListener('click', () => this._showKey(false));
    el.querySelectorAll('button[data-style]').forEach(b => {
      b.addEventListener('click', () => {
        this.style = b.dataset.style;
        el.querySelectorAll('button[data-style]').forEach(x => x.classList.toggle('active', x === b));
        Object.values(this.reticles).forEach(r => {
          r.classList.remove('laser', 'cone');
          if (this.style !== 'reticle') r.classList.add(this.style);
        });
      });
    });
    document.body.appendChild(el);
    this.keyEl = el;
  }

  _onHandsAvailable(e) {
    if (e.detail?.mode === 'webcam' || e.detail?.mode === 'webxr') {
      this._showKey(true);
    }
  }

  _showKey(show) {
    if (!this.keyEl) return;
    this.keyEl.classList.toggle('show', !!show);
    clearTimeout(this.keyTimer);
    if (show) {
      this.keyTimer = setTimeout(() => {
        // Only auto-hide if user has interacted with hands recently
        if (performance.now() - this.lastMoveAt < KEY_AUTOHIDE_MS) {
          this._showKey(false);
        }
      }, KEY_AUTOHIDE_MS);
    }
  }

  _pulseKey() {
    if (!this.keyEl?.classList.contains('show')) return;
    this.keyEl.style.transition = 'opacity .12s ease';
    this.keyEl.style.opacity = '.55';
    setTimeout(() => { this.keyEl.style.opacity = '1'; this.keyEl.style.transition = ''; }, 140);
  }

  _ensureReticle(handIdx) {
    if (this.reticles[handIdx]) return this.reticles[handIdx];
    const r = document.createElement('div');
    r.className = 'reticle' + (this.style !== 'reticle' ? ' ' + this.style : '');
    r.style.color = HAND_COLORS[handIdx % HAND_COLORS.length];
    r.style.transform = 'translate(-9999px,-9999px)';
    document.body.appendChild(r);
    this.reticles[handIdx] = r;
    return r;
  }

  _onMove(e) {
    const { x, y, hand } = e.detail || {};
    if (typeof x !== 'number' || typeof y !== 'number') return;
    const r = this._ensureReticle(hand || 0);
    const px = x * window.innerWidth;
    const py = y * window.innerHeight;
    r.style.transform = `translate(${px}px, ${py}px)`;
    this.lastMoveAt = performance.now();
  }

  _onClick(e) {
    const r = this._ensureReticle(e.detail?.hand || 0);
    r.classList.remove('click');
    // Force reflow so the animation restarts
    void r.offsetWidth;
    r.classList.add('click');
  }
}

// Auto-init when imported
if (typeof window !== 'undefined') {
  const reticle = new Reticle();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => reticle.init());
  } else {
    reticle.init();
  }
  window.__reticle = reticle;
}
