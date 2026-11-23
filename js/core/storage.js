// 瀏覽器本地儲存（localStorage）：讀取、寫入、失敗處理
import { migrate, normalizeSave, defaultSave, FutureVersionError } from './migrations.js?v=5';
const KEY = 'oc_game_save';
let locked = false;   // 鎖定時不寫入，避免弄壞較新版本的存檔

export function loadSave() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); }
  catch (e) {
    locked = true;
    return { save: defaultSave(), warning: '這個瀏覽器不允許保存資料（可能開啟了無痕／隱私模式）。本次建立的角色在關閉頁面後會消失，請記得匯出備份。' };
  }
  if (!raw) return { save: defaultSave() };
  try { return { save: normalizeSave(migrate(JSON.parse(raw))) }; }
  catch (e) {
    if (e instanceof FutureVersionError) {
      locked = true;
      return { save: defaultSave(), warning: '你的存檔來自較新版本的遊戲。為避免弄壞存檔，這個版本不會儲存任何資料，請改用最新版遊戲。' };
    }
    try { localStorage.setItem(KEY + '_corrupt_' + Date.now(), raw); } catch (_) {}
    return { save: defaultSave(), warning: '讀取存檔時發現資料已損壞，已另外保留一份損壞的資料並建立新存檔。如果你有匯出過備份，可以用「匯入」找回角色。' };
  }
}
export function writeSave(save) {
  if (locked) return { ok: false, message: '目前無法儲存資料（瀏覽器不允許，或存檔版本較新）。請先匯出備份。' };
  try { localStorage.setItem(KEY, JSON.stringify(save)); return { ok: true }; }
  catch (e) {
    const full = e && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, message: full ? '瀏覽器的儲存空間已滿，無法儲存。請刪除不需要的角色，或先匯出備份。' : '儲存失敗：' + (e.message || e) };
  }
}
