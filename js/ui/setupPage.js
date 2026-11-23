// 出發前：選角色與冒險模式
import { renderCharacter } from '../editor/renderer.js?v=5';
import { el } from './dom.js?v=5';
export function renderSetup(root, { save, lib, stages, state, hasIntro, onStart, onCreate, onReplay, onBack }) {
  root.textContent = '';
  const ids = save.characters.map(c => c.id);
  if (!state.charId || (state.charId !== '__blank' && !ids.includes(state.charId))) state.charId = ids[0] || '__blank';
  if (!stages.modes[state.mode]) state.mode = 'standard';
  root.append(el('h2', '', '選擇出戰角色'));
  const add = (value, thumb, title, sub) => {
    const lab = el('label', 'su-row'), r = el('input'); r.type = 'radio'; r.name = 'char'; r.checked = state.charId === value;
    r.addEventListener('change', () => { state.charId = value; });
    lab.append(r); if (thumb) lab.append(thumb);
    const t = el('div'); t.append(el('div', 'cm-name', title), el('div', 'muted small', sub || '')); lab.append(t); root.append(lab);
  };
  save.characters.forEach(c => { const cv = el('canvas', 'cm-thumb su-thumb'); renderCharacter(cv, c.appearance, lib); add(c.id, cv, c.name, c.identity); });
  add('__blank', null, '直接開始（使用初始空白角色）', '會自動建立並保存一個初始外觀的角色，之後可以在「角色管理」修改。');
  const mk = (t, fn, cls = '') => { const b = el('button', 'btn ' + cls, t); b.addEventListener('click', fn); return b; };
  root.append(mk('＋ 先建立新角色', onCreate));
  root.append(el('h2', '', '選擇冒險模式'));
  Object.entries(stages.modes).forEach(([key, m]) => {
    const lab = el('label', 'su-row'), r = el('input'); r.type = 'radio'; r.name = 'mode'; r.checked = state.mode === key;
    r.addEventListener('change', () => { state.mode = key; });
    const t = el('div'); t.append(el('div', 'cm-name', m.name), el('div', 'small', m.desc)); lab.append(r, t); root.append(lab);
  });
  const row = el('div', 'su-btns');
  row.append(mk('開始冒險', () => onStart(state.charId, state.mode), 'primary'));
  if (hasIntro) row.append(mk('重看開場對話', onReplay));
  row.append(mk('返回主選單', onBack)); root.append(row);
}
