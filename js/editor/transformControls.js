// 所選圖層的調整面板：顏色（含左右分色）、大小、位置、旋轉
import { el } from '../ui/dom.js?v=5';
export function createControls({ getLayer, getPart, canTransform, onLive, onCommit }) {
  const root = el('div', 'ctl');
  function slider(label, min, max, step, nudge, get, set, fmt = v => v) {
    const row = el('div', 'ctl-row');
    const inp = el('input'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = get();
    const out = el('output', '', fmt(get()));
    const upd = v => { v = Math.min(max, Math.max(min, +v.toFixed(3))); set(v); inp.value = v; out.textContent = fmt(v); };
    inp.addEventListener('input', () => { upd(+inp.value); onLive(); });
    inp.addEventListener('change', onCommit);
    const b = (t, d) => { const x = el('button', 'ctl-btn', t); x.setAttribute('aria-label', label + (d < 0 ? ' 減少' : ' 增加')); x.addEventListener('click', () => { upd(get() + d * nudge); onLive(); onCommit(); }); return x; };
    row.append(el('span', 'ctl-name', label), b('−', -1), inp, b('＋', 1), out);
    return row;
  }
  function colorRow(label, get, set) {
    const row = el('div', 'ctl-row');
    const inp = el('input'); inp.type = 'color'; inp.value = get();
    inp.addEventListener('input', () => { set(inp.value); onLive(); });
    inp.addEventListener('change', onCommit);
    row.append(el('span', 'ctl-name', label), inp, el('output', '', ''));
    return row;
  }
  function refresh() {
    root.textContent = '';
    const l = getLayer();
    if (!l) { root.append(el('p', 'muted small', '請先選擇一個素材或圖層，才能調整顏色與位置。')); return; }
    const p = getPart(l);
    root.append(el('h3', '', `調整：${p.name || p.id}`));
    if (p.mode === 'none') root.append(el('p', 'muted small', '這個素材不能上色。'));
    else if (p.splitX) {
      const [a, b] = p.splitLabels || ['左側', '右側'];
      root.append(colorRow(a, () => l.color, v => { l.color = v; }), colorRow(b, () => l.colorR || l.color, v => { l.colorR = v; }));
      const same = el('button', 'btn small', '左右使用相同顏色');
      same.addEventListener('click', () => { delete l.colorR; onCommit(); });
      root.append(same);
    } else root.append(colorRow(p.category === 'body' ? '膚色' : '顏色', () => l.color, v => { l.color = v; }));
    if (!canTransform(l)) return;
    root.append(
      slider('大小', 0.2, 3, 0.01, 0.01, () => l.scale ?? 1, v => { l.scale = v; }, v => Math.round(v * 100) + '%'),
      slider('水平位置', -256, 256, 1, 1, () => l.x || 0, v => { l.x = v; }),
      slider('垂直位置', -384, 384, 1, 1, () => l.y || 0, v => { l.y = v; }),
      slider('旋轉', -180, 180, 1, 1, () => l.rotation || 0, v => { l.rotation = v; }, v => v + '°'));
    const reset = el('button', 'btn small', '重設位置／大小／旋轉');
    reset.addEventListener('click', () => { Object.assign(l, { x: 0, y: 0, scale: 1, rotation: 0 }); onCommit(); });
    root.append(reset, el('p', 'muted small', '電腦版可直接在預覽圖上按住滑鼠拖曳，移動所選圖層。'));
  }
  return { root, refresh };
}
