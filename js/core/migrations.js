// 存檔版本與舊版遷移。
// 未來若更改存檔格式：把 SAVE_VERSION 加 1，並在 steps 加一個函式，把舊格式轉成新格式。
// 例：steps[1] = save => { /* 把版本 1 改成版本 2 的格式 */ return save; };
export const SAVE_VERSION = 1;
export class FutureVersionError extends Error {}

export const defaultShared = () => ({
  level: 1, exp: 0,
  records: { highestFloor: 0, bossesDefeated: [], battles: 0, deaths: 0 },
  unlocks: { achievements: [], titles: [], codex: [] },
  inventory: [],
});
export const defaultSave = () => ({
  saveVersion: SAVE_VERSION,
  meta: { createdAt: new Date().toISOString(), lastBackupAt: null },
  settings: {}, characters: [], shared: defaultShared(), currentRun: null,
});

const steps = {};

export function migrate(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('invalid');
  let v = Number.isInteger(obj.saveVersion) ? obj.saveVersion : 1;
  if (v > SAVE_VERSION) throw new FutureVersionError();
  while (v < SAVE_VERSION) { obj = steps[v](obj); v++; }
  obj.saveVersion = SAVE_VERSION;
  return obj;
}
// 補齊缺少的欄位，避免舊存檔少了新欄位而出錯
export function normalizeSave(s) {
  const d = defaultSave(), sh = s.shared || {};
  return { ...d, ...s,
    meta: { ...d.meta, ...(s.meta || {}) },
    shared: { ...d.shared, ...sh, records: { ...d.shared.records, ...(sh.records || {}) }, unlocks: { ...d.shared.unlocks, ...(sh.unlocks || {}) } },
    characters: Array.isArray(s.characters) ? s.characters : [] };
}
