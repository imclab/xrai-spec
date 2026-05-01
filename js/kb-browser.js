// kb-browser.js — browse the bundled knowledge base (374 entries) by structure.
// Groups by filename prefix (_AI_*, _VFX_*, _XRAI_*, etc) → cluster view.
// Color by usage frequency from localStorage log. Surface gaps + click-to-source.
// Spec: 029 Phase 6.22 (drill-down KB structure view).

const KB_USAGE_KEY = 'xrai.kb.usage';

function bumpUsage(file) {
  try {
    const u = JSON.parse(localStorage.getItem(KB_USAGE_KEY) || '{}');
    u[file] = (u[file] || 0) + 1;
    localStorage.setItem(KB_USAGE_KEY, JSON.stringify(u));
  } catch {}
}
function getUsage() {
  try { return JSON.parse(localStorage.getItem(KB_USAGE_KEY) || '{}'); } catch { return {}; }
}

function clusterOf(filename) {
  // _AI_FOO_BAR.md → _AI · _3D_FOO.md → _3D · _VFX_FOO.md → _VFX · etc.
  const m = filename.match(/^_([A-Z0-9]+)_/);
  return m ? `_${m[1]}` : '_OTHER';
}

let kbCache = null;
async function loadKb() {
  if (kbCache) return kbCache;
  const res = await fetch('data/kb-index.json');
  if (!res.ok) throw new Error('kb-index.json missing');
  kbCache = await res.json();
  return kbCache;
}

export async function renderInto(targetEl, { showToast } = {}) {
  targetEl.innerHTML = '<div style="opacity:.6;">loading kb-index…</div>';
  let kb;
  try { kb = await loadKb(); } catch (e) {
    targetEl.innerHTML = `<div style="color:#ff8a8a;">KB load failed: ${e.message}<br/>Run: <code>node scripts/build_kb_index.cjs</code></div>`;
    return;
  }

  const usage = getUsage();
  const clusters = {};
  kb.entries.forEach(e => {
    const c = clusterOf(e.file);
    (clusters[c] = clusters[c] || []).push(e);
  });
  const clusterKeys = Object.keys(clusters).sort((a, b) => clusters[b].length - clusters[a].length);

  const head = `
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
      <span><b>${kb.count}</b> entries · <b>${clusterKeys.length}</b> clusters · built ${kb.built_at?.slice(0,10) || '?'}</span>
      <span style="opacity:.55;font-size:10px;">click cluster → expand · ★ usage</span>
    </div>
    <input id="kb-filter" placeholder="filter (e.g. vfx, intent, ar)" style="width:100%;padding:4px 6px;background:rgba(0,0,0,0.4);border:1px solid rgba(247,255,168,0.2);color:#F7FFA8;border-radius:4px;font:inherit;" />
    <div id="kb-clusters" style="margin-top:6px;"></div>
  `;
  targetEl.innerHTML = head;
  const list = targetEl.querySelector('#kb-clusters');

  function paint(filterStr = '') {
    const f = filterStr.toLowerCase();
    list.innerHTML = '';
    for (const ck of clusterKeys) {
      const items = clusters[ck].filter(e => !f || e.file.toLowerCase().includes(f) || (e.summary || '').toLowerCase().includes(f));
      if (!items.length) continue;
      const wrap = document.createElement('div');
      wrap.style.cssText = 'border-top:1px solid rgba(247,255,168,0.12);padding:4px 0;';
      const head = document.createElement('div');
      head.style.cssText = 'cursor:pointer;color:#F7FFA8;display:flex;justify-content:space-between;';
      head.innerHTML = `<span>▸ <b>${ck}</b> (${items.length})</span><span style="opacity:.55;font-size:10px;">${ck === '_OTHER' ? 'unprefixed' : 'cluster'}</span>`;
      const body = document.createElement('div');
      body.style.cssText = 'display:none;margin-top:4px;padding-left:12px;';
      head.addEventListener('click', () => { body.style.display = body.style.display === 'none' ? 'block' : 'none'; });
      items.sort((a, b) => (usage[b.file] || 0) - (usage[a.file] || 0));
      items.forEach(e => {
        const u = usage[e.file] || 0;
        const row = document.createElement('div');
        row.style.cssText = 'padding:2px 0;font-size:10px;cursor:pointer;display:flex;gap:6px;';
        row.innerHTML = `<span style="color:${u ? '#5eff8a' : 'rgba(247,255,168,0.55)'};flex:0 0 24px;">${u ? '★'.repeat(Math.min(u, 3)) : ''}</span><span style="flex:1;color:#F7FFA8;">${e.file}</span>`;
        row.title = e.summary || '';
        row.addEventListener('click', () => {
          bumpUsage(e.file);
          const path = e.path_global || e.path_project || e.file;
          if (showToast) showToast(`KB · ${e.file} (${e.tag})`, 3500);
          const detail = document.createElement('div');
          detail.style.cssText = 'margin:4px 0 6px 24px;padding:4px 6px;background:rgba(0,0,0,0.4);border-radius:4px;font-size:10px;';
          detail.innerHTML = `<div style="opacity:.55;margin-bottom:2px;">${path}</div><div>${e.summary || '(empty summary)'}</div>`;
          // Toggle / replace
          if (row.nextSibling?.classList?.contains('kb-detail')) row.nextSibling.remove();
          else { detail.classList.add('kb-detail'); row.parentNode.insertBefore(detail, row.nextSibling); }
        });
        body.appendChild(row);
      });
      wrap.appendChild(head);
      wrap.appendChild(body);
      list.appendChild(wrap);
    }
  }
  paint();
  targetEl.querySelector('#kb-filter').addEventListener('input', (e) => paint(e.target.value));
}

export const __kbBrowser = { loadKb, getUsage, bumpUsage };
