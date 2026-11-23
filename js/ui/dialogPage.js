// 文字小說式對話：點一下（或 Enter／空白鍵）繼續，可略過
import { el } from './dom.js?v=5';
export function playDialog(root, lines, { onDone }) {
  root.textContent = '';
  const valid = lines.filter(l => l && typeof l.text === 'string' && l.text.trim());
  if (!valid.length) { onDone(); return; }
  const vn = el('div', 'vn'), name = el('div', 'vn-name'), box = el('div', 'vn-box'), txt = el('p', 'vn-text'),
    hint = el('div', 'vn-hint', '點一下繼續 ▼'), skip = el('button', 'btn small vn-skip', '略過');
  box.append(name, txt, hint); vn.append(skip, box); root.append(vn);
  let i = 0, timer = 0, full = '', pos = 0, typing = false, ended = false;
  const finishLine = () => { clearInterval(timer); typing = false; txt.textContent = full; hint.hidden = false; };
  function show() {
    const l = valid[i];
    if (l.bg) { vn.style.backgroundImage = `url("${l.bg}")`; vn.classList.add('has-bg'); }
    name.textContent = l.speaker || ''; name.hidden = !l.speaker;
    full = l.text; pos = 0; typing = true; txt.textContent = ''; hint.hidden = true; clearInterval(timer);
    timer = setInterval(() => { pos++; txt.textContent = full.slice(0, pos); if (pos >= full.length) finishLine(); }, 30);
  }
  function end() { if (ended) return; ended = true; clearInterval(timer); document.removeEventListener('keydown', onKey); onDone(); }
  function next() { if (ended) return; if (typing) return finishLine(); if (++i >= valid.length) end(); else show(); }
  const onKey = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
  vn.addEventListener('click', e => { if (e.target !== skip) next(); });
  skip.addEventListener('click', end);
  document.addEventListener('keydown', onKey);
  show();
}
