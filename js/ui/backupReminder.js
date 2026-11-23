// 備份提醒：有角色且從未備份、或超過 7 天未備份時顯示
import { el } from './dom.js?v=5';
export function renderReminder(box, save, onAction, label) {
  box.textContent = ''; box.hidden = true;
  if (!save.characters.length) return;
  const last = save.meta.lastBackupAt;
  const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 864e5) : null;
  if (days !== null && days < 7) return;
  box.hidden = false;
  box.append(el('p', '', days === null
    ? '⚠ 你的角色只保存在這個瀏覽器裡，目前還沒有備份。更換裝置、換瀏覽器或清除網站資料時，角色會消失。'
    : `⚠ 距離上次備份已 ${days} 天，建議再匯出一次。`));
  const b = el('button', 'btn small', label); b.addEventListener('click', onAction); box.append(b);
}
