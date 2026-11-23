// 設定頁（目前：QTE 模式）
import { el } from './dom.js?v=5';
const MODES = [['normal', '一般', '需要在時間內按下顯示的按鍵。'], ['easy', '簡單', '時間比較長、按鍵比較少。'], ['auto', '自動', '遇到按鍵挑戰時自動成功，不需要操作。']];
export function renderSettings(root, save, persist) {
  root.textContent = '';
  root.append(el('h3', '', '按鍵挑戰（QTE）'));
  MODES.forEach(([v, name, desc]) => {
    const lab = el('label', 'set-row'), r = el('input'); r.type = 'radio'; r.name = 'qte'; r.checked = (save.settings.qteMode || 'normal') === v;
    r.addEventListener('change', () => { save.settings.qteMode = v; persist(); });
    const t = el('span', '', ' ' + name + '　'); t.append(el('small', 'muted', desc));
    lab.append(r, t); root.append(lab);
  });
  root.append(el('p', 'muted small', '音量等設定將於之後加入。'));
}
