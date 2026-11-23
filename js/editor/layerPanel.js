// 圖層列表：選取、上下移動、複製（鏡像）、移除
import { el } from '../ui/dom.js?v=5';
export function renderLayerList(root, o) {
  root.textContent = '';
  if (!o.layers.length) { root.append(el('p', 'empty', '目前沒有任何圖層。')); return; }
  root.append(el('p', 'muted small', '列表由上到下＝畫面由前到後。點名稱可選取圖層並在下方調整。'));
  const mk = (t, title, fn) => { const b = el('button', 'ly-btn', t); b.title = title; b.setAttribute('aria-label', title); b.addEventListener('click', fn); return b; };
  [...o.layers].reverse().forEach(l => {
    const p = o.lib.getPart(l.partId), c = o.lib.getCategory(p.category);
    const row = el('div', 'ly-row' + (l.uid === o.sel ? ' on' : ''));
    const name = el('button', 'ly-name', `${c.name}：${p.name || p.id}`);
    name.addEventListener('click', () => o.onSelect(l));
    row.append(name, mk('▲', '往前一層', () => o.onMove(l, 1)), mk('▼', '往後一層', () => o.onMove(l, -1)));
    if (c.multi) row.append(mk('鏡像複製', '複製此圖層並左右鏡像', () => o.onDup(l)));
    if (c.optional) row.append(mk('✕', '移除此圖層', () => o.onRemove(l)));
    root.append(row);
  });
}
