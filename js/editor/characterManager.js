// 角色管理：列表、新增、複製、刪除、匯入、匯出
import { renderCharacter } from './renderer.js?v=5';
import { createDefaultAppearance } from './editorPage.js?v=5';
import { buildExport, downloadJSON, parseImport, newId } from '../core/importExport.js?v=5';
import { el } from '../ui/dom.js?v=5';

const clone = o => JSON.parse(JSON.stringify(o));
const safeName = s => s.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 30) || 'character';
const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

export function createManager({ lib, settings, limits, save, persist, root, noticeEl, openEditor, openStatus, onChange }) {
  const max = settings.maxCharacters;
  const notice = (msg, bad) => { noticeEl.textContent = msg; noticeEl.className = 'notice' + (bad ? ' bad' : ''); noticeEl.hidden = !msg; };
  const input = el('input'); input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
  document.body.append(input);

  function newCharacter() {
    const now = new Date().toISOString();
    return { id: newId(), name: '', identity: '', bio: '', appearance: createDefaultAppearance(lib), skills: [], progress: {}, createdAt: now, updatedAt: now };
  }
  function saveCharacter(ch) {
    ch.updatedAt = new Date().toISOString();
    const i = save.characters.findIndex(c => c.id === ch.id);
    const before = clone(save.characters);
    if (i >= 0) save.characters[i] = ch; else save.characters.push(ch);
    if (!persist()) { save.characters = before; return false; }
    onChange(); return true;
  }
  function exportAll() {
    downloadJSON(`oc-game-backup-${today()}.json`, buildExport(save.characters, save.shared));
    save.meta.lastBackupAt = new Date().toISOString(); persist(); onChange(); render();
    notice('已匯出備份檔，請把下載的檔案保存在安全的地方。');
  }
  async function doImport(file) {
    const res = parseImport(await file.text(), lib, limits);
    if (!res.ok) { notice(res.error, true); return; }
    const room = max - save.characters.length;
    const take = res.characters.slice(0, Math.max(0, room));
    const msgs = [...res.warnings];
    if (take.length < res.characters.length) msgs.push(`角色數量上限是 ${max}，只匯入了前 ${take.length} 個。`);
    if (!take.length) { notice('角色數量已達上限，無法匯入。請先刪除不需要的角色。', true); return; }
    const before = clone(save.characters);
    save.characters.push(...take);
    if (res.shared && confirm('這個檔案內含冒險進度（等級、紀錄等）。要用它取代目前的冒險進度嗎？\n按「取消」會保留目前的進度，只匯入角色。')) {
      const d = clone(save.shared); save.shared = { ...d, ...res.shared };
    }
    if (!persist()) { save.characters = before; return; }
    onChange(); render();
    notice(`已新增 ${take.length} 個角色（匯入的角色都是新增，不會覆蓋原有角色）。` + (msgs.length ? '\n' + msgs.join('\n') : ''));
  }
  input.addEventListener('change', () => { if (input.files[0]) doImport(input.files[0]); input.value = ''; });

  function render() {
    root.textContent = '';
    const full = save.characters.length >= max;
    const top = el('div', 'cm-top');
    const b = (t, fn, dis) => { const x = el('button', 'btn small', t); x.disabled = !!dis; x.addEventListener('click', fn); return x; };
    top.append(el('span', 'cm-count', `角色 ${save.characters.length} / ${max}`),
      b('＋ 新增角色', () => openEditor(newCharacter()), full),
      b('匯入角色', () => input.click(), full),
      b('匯出全部（備份）', exportAll, !save.characters.length));
    root.append(top);
    if (!save.characters.length) root.append(el('p', 'empty', '還沒有角色。按「新增角色」開始捏造你的第一個角色。'));
    save.characters.forEach(ch => {
      const row = el('div', 'cm-row'), cv = el('canvas', 'cm-thumb'), info = el('div', 'cm-info');
      renderCharacter(cv, ch.appearance, lib);
      info.append(el('div', 'cm-name', ch.name), el('div', 'muted small', ch.identity || ''), el('div', 'cm-bio small', ch.bio || ''));
      const acts = el('div', 'cm-acts');
      acts.append(b('編輯', () => openEditor(clone(ch))), b('狀態', () => openStatus(ch)),
        b('複製', () => {
          const c = clone(ch); c.id = newId(); c.name = (ch.name + ' (副本)').slice(0, limits.name);
          c.createdAt = c.updatedAt = new Date().toISOString();
          if (saveCharacter(c)) { render(); notice(`已複製「${ch.name}」。`); }
        }, full),
        b('匯出', () => downloadJSON(`character-${safeName(ch.name)}.json`, buildExport([ch], null))),
        b('刪除', () => {
          if (!confirm(`確定要刪除「${ch.name}」嗎？此動作無法復原，建議先匯出備份。`)) return;
          const before = clone(save.characters);
          save.characters = save.characters.filter(c => c.id !== ch.id);
          if (!persist()) { save.characters = before; return; }
          onChange(); render(); notice(`已刪除「${ch.name}」。`);
        }));
      row.append(cv, info, acts); root.append(row);
    });
  }
  // 「直接開始」使用：自動建立並保存一個初始空白角色
  function createBlank() {
    if (save.characters.length >= max) return null;
    const ch = newCharacter(); ch.name = '未命名角色';
    return saveCharacter(ch) ? ch : null;
  }
  return { render, saveCharacter, exportAll, notice, newCharacter, createBlank };
}
