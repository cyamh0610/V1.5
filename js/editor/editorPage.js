// 捏角頁面（2C：加入角色資料、儲存、返回）
import { renderCharacter, loadImage } from './renderer.js?v=5';
import { History } from './history.js?v=5';
import { randomAppearance } from './randomizer.js?v=5';
import { createControls } from './transformControls.js?v=5';
import { renderLayerList } from './layerPanel.js?v=5';
import { el } from '../ui/dom.js?v=5';

let seq = 0;
export const newLayerFor = p => ({ uid: 'l' + Date.now().toString(36) + (++seq), partId: p.id,
  color: p.defaultColor || '#ffffff', x: 0, y: 0, scale: 1, rotation: 0, flipX: false });
export function createDefaultAppearance(lib) {
  const layers = [];
  lib.categories.forEach(c => { if (c.defaultOn) { const p = lib.partsOf(c.id)[0]; if (p) layers.push(newLayerFor(p)); } });
  return { layers };
}
const clone = o => JSON.parse(JSON.stringify(o));
const LAYERS = '__layers', INFO = '__info';

export function initEditor(root, lib, { limits, skills = [], maxSkills = 4, onSave, onExit }) {
  let ch = null, appearance = createDefaultAppearance(lib), tab = INFO, sel = null;
  let history = new History(appearance), rev = 0, savedRev = 0, infoDirty = false;
  lib.parts.forEach(p => { loadImage(p.file); if (p.maskFile) loadImage(p.maskFile); });

  const wrap = el('div', 'editor'), preview = el('div', 'ed-preview'), canvas = el('canvas', 'ed-canvas'), hint = el('p', 'ed-hint');
  preview.append(canvas, hint);
  const panel = el('div', 'ed-panel'), bar = el('div', 'ed-bar'), tabs = el('div', 'ed-tabs'), main = el('div', 'ed-main');
  const canTransform = l => lib.getCategory(lib.getPart(l.partId).category).transform !== false;
  const controls = createControls({
    getLayer: () => appearance.layers.find(l => l.uid === sel), getPart: l => lib.getPart(l.partId),
    canTransform, onLive: () => draw(), onCommit: () => commit(),
  });
  panel.append(bar, tabs, main, controls.root);
  wrap.append(preview, panel); root.append(wrap);

  const dirty = () => rev !== savedRev || infoDirty;
  const btn = (text, fn, cls = '') => { const b = el('button', 'btn small ' + cls, text); b.addEventListener('click', fn); bar.append(b); return b; };
  btn('💾 儲存', () => save(), 'primary');
  btn('← 返回', () => { if (!dirty() || confirm('有尚未儲存的變更，確定要離開嗎？')) onExit(); });
  const bUndo = btn('↶ 復原', () => restore(history.undo()));
  const bRedo = btn('↷ 重做', () => restore(history.redo()));
  btn('🎲 隨機', () => { appearance = randomAppearance(lib, newLayerFor); sel = null; commit(); });
  btn('重設外觀', () => { if (confirm('確定要重設成初始外觀嗎？（可以用「復原」找回）')) { appearance = createDefaultAppearance(lib); sel = null; commit(); } });
  const status = el('span', 'ed-status'); preview.append(status);

  const effz = l => l.z ?? lib.zOf(lib.getPart(l.partId));
  const sorted = () => appearance.layers.map((l, i) => ({ l, i })).filter(o => lib.getPart(o.l.partId))
    .sort((a, b) => effz(a.l) - effz(b.l) || a.i - b.i).map(o => o.l);
  const layersOf = cat => appearance.layers.filter(l => lib.getPart(l.partId)?.category === cat);

  function draw() {
    renderCharacter(canvas, appearance, lib).then(m => {
      hint.textContent = m.length ? `找不到 ${m.length} 張圖片：${[...new Set(m)].join('、')}` : '';
    });
  }
  function updateStatus() { status.textContent = dirty() ? '● 有未儲存的變更' : '✓ 已儲存'; }
  function refresh() {
    if (!appearance.layers.some(l => l.uid === sel)) sel = null;
    bUndo.disabled = !history.canUndo; bRedo.disabled = !history.canRedo;
    updateStatus(); renderTabs(); renderMain(); controls.refresh();
  }
  function commit() { history.push(appearance); rev++; draw(); refresh(); }
  function restore(state) { appearance = state; rev++; draw(); refresh(); }
  function save() {
    ch.name = (ch.name || '').trim() || '未命名角色';
    ch.appearance = clone(appearance);
    if (onSave(clone(ch))) { savedRev = rev; infoDirty = false; refresh(); }
  }

  function pick(cat, part) {
    const c = lib.getCategory(cat), ex = layersOf(cat), has = ex.find(l => l.partId === part.id);
    if (c.multi) {
      if (has) { appearance.layers = appearance.layers.filter(l => l !== has); if (sel === has.uid) sel = null; }
      else { const l = newLayerFor(part); appearance.layers.push(l); sel = l.uid; }
    } else {
      const l = newLayerFor(part);
      if (ex[0]) { l.color = ex[0].color; if (ex[0].colorR && part.splitX) l.colorR = ex[0].colorR; }
      appearance.layers = [...appearance.layers.filter(x => !ex.includes(x)), l]; sel = l.uid;
    }
    commit();
  }
  function remove(layers) { appearance.layers = appearance.layers.filter(l => !layers.includes(l)); commit(); }
  function move(layer, dir) {
    const s = sorted(), i = s.indexOf(layer), j = i + dir;
    if (j < 0 || j >= s.length) return;
    const vals = s.map(effz); [s[i], s[j]] = [s[j], s[i]];
    s.forEach((l, k) => { l.z = Math.floor(vals[k]) + k * 0.001; });
    commit();
  }
  function dup(layer) {
    const c = { ...clone(layer), uid: newLayerFor(lib.getPart(layer.partId)).uid, flipX: !layer.flipX, x: -(layer.x || 0) };
    appearance.layers.splice(appearance.layers.indexOf(layer) + 1, 0, c); sel = c.uid; commit();
  }

  function renderTabs() {
    tabs.textContent = '';
    const add = (id, name) => {
      const b = el('button', 'ed-tab' + (id === tab ? ' on' : ''), name);
      b.addEventListener('click', () => { tab = id; if (id !== LAYERS && id !== INFO) sel = layersOf(id)[0]?.uid ?? null; refresh(); });
      tabs.append(b);
    };
    add(INFO, '角色資料');
    lib.categories.forEach(c => add(c.id, c.name));
    add(LAYERS, '圖層');
  }
  function field(label, key, max, multiline) {
    const wrapF = el('label', 'fld'); wrapF.append(el('span', '', label));
    const i = el(multiline ? 'textarea' : 'input'); i.maxLength = max; i.value = ch[key] || '';
    if (multiline) i.rows = 5; else i.type = 'text';
    i.addEventListener('input', () => { ch[key] = i.value; infoDirty = true; updateStatus(); });
    wrapF.append(i, el('small', 'muted', `最多 ${max} 字`)); return wrapF;
  }
  function skillPicker() {
    const box = el('div', 'fld'); box.append(el('span', '', `技能（最多 ${maxSkills} 個）`));
    const list = skills.filter(s => !s.enemyOnly);
    if (!list.length) { box.append(el('small', 'muted', '目前沒有可選擇的技能。')); return box; }
    const chosen = new Set(ch.skills || []);
    list.forEach(sk => {
      const lab = el('label', 'sk-row'), cb = el('input'); cb.type = 'checkbox'; cb.checked = chosen.has(sk.id); cb.disabled = !cb.checked && chosen.size >= maxSkills;
      cb.addEventListener('change', () => { const set = new Set(ch.skills || []); cb.checked ? set.add(sk.id) : set.delete(sk.id); ch.skills = [...set]; infoDirty = true; updateStatus(); renderMain(); });
      lab.append(cb, document.createTextNode(' ' + sk.name)); if (sk.desc) lab.append(el('small', 'muted', ' — ' + sk.desc));
      box.append(lab);
    });
    box.append(el('small', 'muted', '不選時，戰鬥會自動使用預設技能。'));
    return box;
  }
  function renderMain() {
    main.textContent = '';
    if (tab === INFO) {
      main.append(field('名稱', 'name', limits.name), field('身份', 'identity', limits.identity), field('簡介', 'bio', limits.bio, true), skillPicker());
      return;
    }
    if (tab === LAYERS) {
      renderLayerList(main, { layers: sorted(), lib, sel, onSelect: l => { sel = l.uid; refresh(); },
        onMove: move, onRemove: l => remove([l]), onDup: dup });
      return;
    }
    const grid = el('div', 'ed-grid'), c = lib.getCategory(tab), chosen = new Set(layersOf(tab).map(l => l.partId));
    if (c.optional) {
      const b = el('button', 'ed-item' + (chosen.size === 0 ? ' on' : ''), '無');
      b.addEventListener('click', () => remove(layersOf(tab))); grid.append(b);
    }
    const parts = lib.partsOf(tab);
    if (!parts.length) grid.append(el('p', 'empty', '這個類別還沒有素材。'));
    parts.forEach(p => {
      const b = el('button', 'ed-item' + (chosen.has(p.id) ? ' on' : ''));
      const img = new Image(); img.src = p.file; img.alt = ''; img.loading = 'lazy';
      b.append(img, el('span', '', p.name || p.id));
      b.addEventListener('click', () => pick(tab, p)); grid.append(b);
    });
    main.append(grid);
  }

  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    const l = appearance.layers.find(x => x.uid === sel);
    if (!l || e.pointerType === 'touch' || !canTransform(l)) return;
    drag = { l, sx: e.clientX, sy: e.clientY, ox: l.x || 0, oy: l.y || 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const k = lib.canvas.width / canvas.getBoundingClientRect().width;
    drag.l.x = Math.round(drag.ox + (e.clientX - drag.sx) * k); drag.l.y = Math.round(drag.oy + (e.clientY - drag.sy) * k);
    draw();
  });
  const endDrag = () => { if (drag) { drag = null; commit(); } };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

  document.addEventListener('keydown', e => {
    if (!root.offsetParent || !(e.ctrlKey || e.metaKey)) return;
    const t = document.activeElement;
    if (t && /INPUT|TEXTAREA/.test(t.tagName) && t.type !== 'range') return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); restore(history.undo()); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); restore(history.redo()); }
  });

  // 開啟一個角色（新角色或既有角色）進行編輯
  function open(character) {
    ch = clone(character); appearance = clone(ch.appearance); history = new History(appearance);
    rev = savedRev = 0; infoDirty = false; sel = null; tab = INFO;
    draw(); refresh();
    window.scrollTo(0, 0);
  }
  return { open };
}
