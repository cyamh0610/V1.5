// 簡單字母 QTE：鍵盤或畫面按鈕皆可。模式：normal / easy（時間較長、按鍵較少）/ auto（自動成功）
import { el } from '../ui/dom.js?v=5';
export function runQte({ stage, cfg, mode, isPaused }) {
  if (mode === 'auto') return Promise.resolve(true);
  const easy = mode === 'easy';
  const count = easy ? Math.min(2, cfg.keyCount) : cfg.keyCount;
  const limit = cfg.timeLimitMs * (easy ? cfg.easyTimeMultiplier || 2 : 1);
  const letters = [...new Set(cfg.letters.toUpperCase())];
  const seq = Array.from({ length: count }, () => letters[Math.floor(Math.random() * letters.length)]);
  return new Promise(resolve => {
    const box = el('div', 'bt-qte'), row = el('div', 'qte-seq'), bar = el('div', 'qte-bar'), fill = el('div', 'qte-fill'), keys = el('div', 'qte-keys');
    bar.append(fill);
    const cells = seq.map(c => { const s = el('span', 'qte-cell', c); row.append(s); return s; });
    box.append(el('div', 'qte-title', '按下顯示的按鍵！'), row, bar, keys);
    let idx = 0, left = limit, last = performance.now(), done = false, raf = 0;
    const finish = ok => { if (done) return; done = true; cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); box.remove(); resolve(ok); };
    const press = k => {
      if (done || isPaused() || k !== seq[idx]) return;
      cells[idx].classList.add('ok'); idx++;
      if (idx >= count) finish(true); else cells[idx].classList.add('now');
    };
    const onKey = e => { if (e.key.length === 1) press(e.key.toUpperCase()); };
    letters.forEach(c => { const b = el('button', 'qte-key', c); b.addEventListener('pointerdown', e => { e.preventDefault(); press(c); }); keys.append(b); });
    document.addEventListener('keydown', onKey);
    cells[0].classList.add('now'); stage.append(box);
    const tick = now => {
      if (done) return;
      if (!isPaused()) left -= now - last;
      last = now; fill.style.width = Math.max(0, left / limit * 100) + '%';
      if (left <= 0) finish(false); else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
