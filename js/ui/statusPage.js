// 角色狀態頁面（一般與戰鬥中共用）。info 可帶入：stats、skillNames、itemLines
import { renderCharacter } from '../editor/renderer.js?v=5';
import { el } from './dom.js?v=5';
export function renderStatus(root, ch, lib, save, info = {}) {
  root.textContent = '';
  const wrap = el('div', 'st'), cv = el('canvas', 'st-canvas'), box = el('div', 'st-info');
  renderCharacter(cv, ch.appearance, lib);
  box.append(el('h2', '', ch.name), el('p', 'muted', ch.identity || '（未填寫身份）'), el('p', 'prose-pre', ch.bio || '（未填寫簡介）'));
  const r = save.shared.records, s = info.stats;
  const rows = [['等級', info.level ?? save.shared.level],
    ['HP', s ? `${s.hp} / ${s.maxHp}` : '—'], ['攻擊／防禦', s ? `${s.atk}／${s.def}` : '—'],
    ['已選擇技能', info.skillNames?.length ? info.skillNames.join('、') : '尚未選擇'],
    ['持有物品', info.itemLines?.length ? info.itemLines.join('、') : '無'],
    ...(info.achievementNames ? [['成就／稱號', info.achievementNames.length ? info.achievementNames.join('、') : '尚無']] : []),
    ['冒險紀錄', `最高樓層 ${r.highestFloor}　戰鬥 ${r.battles} 次　擊敗強敵 ${r.bossesDefeated.length} 位　倒下 ${r.deaths} 次`]];
  const dl = el('dl', 'st-list');
  rows.forEach(([k, v]) => dl.append(el('dt', '', k), el('dd', '', String(v))));
  box.append(dl); wrap.append(cv, box); root.append(wrap);
}
