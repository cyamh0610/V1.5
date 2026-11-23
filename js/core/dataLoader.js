// 讀取並驗證 data/ 內的 JSON，錯誤以白話中文回報
export class DataError extends Error {
  constructor(file, msg) { super(msg); this.file = file; }
}

export async function loadJSON(path) {
  let res;
  try { res = await fetch(path, { cache: 'no-cache' }); }
  catch (e) { throw new DataError(path, '讀不到這個檔案。若是直接雙擊 index.html 開啟，請改用本機伺服器（見 GUIDE.md）。'); }
  if (!res.ok) throw new DataError(path, `找不到檔案（代碼 ${res.status}），請確認檔名與資料夾位置是否正確。`);
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) {
    let where = '';
    const m = /position (\d+)/.exec(e.message);
    const l = /line (\d+)/.exec(e.message);
    if (m) where = `大約在第 ${text.slice(0, +m[1]).split('\n').length} 行附近。`;
    else if (l) where = `大約在第 ${l[1]} 行附近。`;
    throw new DataError(path, `JSON 格式有誤。${where}常見原因：漏了逗號、最後一項多了逗號、引號沒有成對。`);
  }
}

const isStr = v => typeof v === 'string' && v.trim() !== '';

export function validateCredits(list) {
  if (!Array.isArray(list)) return ['最外層必須是以 [ ] 包起來的清單。'];
  const p = [];
  list.forEach((c, i) => {
    const n = `第 ${i + 1} 筆`;
    if (typeof c !== 'object' || c === null) { p.push(`${n}：格式不正確。`); return; }
    ['name', 'creator', 'license'].forEach(k => { if (!isStr(c[k])) p.push(`${n}：缺少「${k}」或內容是空的。`); });
    if (c.url && !/^https?:\/\//.test(c.url)) p.push(`${n}：url 必須以 http:// 或 https:// 開頭。`);
  });
  return p;
}
export function validateText(t) {
  if (typeof t !== 'object' || t === null || Array.isArray(t)) return ['最外層必須是以 { } 包起來。'];
  const p = [];
  if (typeof t.gameTitle !== 'string') p.push('缺少「gameTitle」（遊戲名稱，可填空字串 ""）。');
  if (!Array.isArray(t.worldIntro)) p.push('「worldIntro」必須是清單，例如 ["第一段","第二段"]，沒內容可填 []。');
  else if (t.worldIntro.some(x => typeof x !== 'string')) p.push('「worldIntro」每一項都必須是文字。');
  return p;
}
export function validateSettings(s) {
  if (typeof s !== 'object' || s === null) return ['最外層必須是以 { } 包起來。'];
  const p = [];
  if (!Number.isInteger(s.maxCharacters) || s.maxCharacters < 1) p.push('「maxCharacters」必須是 1 以上的整數。');
  const b = s.battle;
  if (!b || !b.playerBase || !['hp', 'atk', 'def'].every(k => typeof b.playerBase[k] === 'number')) p.push('「battle.playerBase」需要 hp、atk、def 三個數字。');
  else if (!b.qte || !b.qte.letters || !(b.qte.keyCount >= 1) || !(b.qte.timeLimitMs > 0)) p.push('「battle.qte」需要 letters、keyCount、timeLimitMs。');
  else if (typeof b.damageVariance !== 'number' || typeof b.guardDamageMultiplier !== 'number') p.push('「battle」需要 damageVariance 與 guardDamageMultiplier（數字）。');
  ['nameMaxLength', 'identityMaxLength', 'bioMaxLength'].forEach(k => { if (s[k] !== undefined && (!Number.isInteger(s[k]) || s[k] < 1)) p.push(`「${k}」必須是 1 以上的整數。`); });
  return p;
}

export function validateParts(d) {
  if (typeof d !== 'object' || d === null) return ['最外層必須是以 { } 包起來。'];
  const p = [];
  if (!d.canvas || !(d.canvas.width > 0) || !(d.canvas.height > 0)) p.push('「canvas」需要 width 與 height（正整數）。');
  if (!Array.isArray(d.categories) || !d.categories.length) return [...p, '「categories」必須是至少含一個類別的清單。'];
  if (!Array.isArray(d.parts)) return [...p, '「parts」必須是清單。'];
  const cats = new Set();
  d.categories.forEach((c, i) => {
    if (!isStr(c.id)) p.push(`categories 第 ${i + 1} 筆：缺少 id。`);
    else if (cats.has(c.id)) p.push(`categories：id「${c.id}」重複。`);
    else cats.add(c.id);
    if (!isStr(c.name)) p.push(`categories 第 ${i + 1} 筆：缺少 name。`);
    if (typeof c.z !== 'number') p.push(`categories 第 ${i + 1} 筆：z 必須是數字（數字越大越在上層）。`);
  });
  const ids = new Set();
  d.parts.forEach((x, i) => {
    const n = `parts 第 ${i + 1} 筆${x && x.id ? '（' + x.id + '）' : ''}`;
    if (!x || !isStr(x.id)) { p.push(`${n}：缺少 id。`); return; }
    if (ids.has(x.id)) p.push(`${n}：id 重複。`); ids.add(x.id);
    if (!cats.has(x.category)) p.push(`${n}：category「${x.category}」不在 categories 內。`);
    if (!isStr(x.file)) p.push(`${n}：缺少 file（圖片路徑）。`);
    if (!['none', 'tint', 'mask'].includes(x.mode)) p.push(`${n}：mode 必須是 none、tint 或 mask。`);
    if (x.mode === 'mask' && !isStr(x.maskFile)) p.push(`${n}：mode 為 mask 時必須填 maskFile。`);
    if (x.splitX !== undefined && typeof x.splitX !== 'number') p.push(`${n}：splitX 必須是數字（左右眼分界的 x 座標）。`);
    if (x.excludes !== undefined && !Array.isArray(x.excludes)) p.push(`${n}：excludes 必須是清單。`);
    if (x.defaultColor && !/^#[0-9a-fA-F]{6}$/.test(x.defaultColor)) p.push(`${n}：defaultColor 必須是 #rrggbb 格式。`);
  });
  return p;
}

const num = v => typeof v === 'number' && Number.isFinite(v);
export function validateSkills(list) {
  if (!Array.isArray(list)) return ['最外層必須是以 [ ] 包起來的清單。'];
  const p = [], ids = new Set();
  list.forEach((s, i) => {
    const n = `第 ${i + 1} 筆${s && s.id ? '（' + s.id + '）' : ''}`;
    if (!s || !isStr(s.id)) { p.push(`${n}：缺少 id。`); return; }
    if (ids.has(s.id)) p.push(`${n}：id 重複。`); ids.add(s.id);
    if (!isStr(s.name)) p.push(`${n}：缺少 name。`);
    if (!['attack', 'heal', 'buff'].includes(s.type)) p.push(`${n}：type 必須是 attack、heal 或 buff。`);
    if (s.type === 'attack' && !num(s.power)) p.push(`${n}：attack 需要 power（傷害倍率，數字）。`);
    if (s.type === 'heal' && !num(s.healPercent)) p.push(`${n}：heal 需要 healPercent（例如 0.3 代表 30%）。`);
    if (s.type === 'buff' && !(['atk', 'def'].includes(s.stat) && num(s.multiplier) && num(s.turns))) p.push(`${n}：buff 需要 stat（atk 或 def）、multiplier、turns。`);
    if (s.maxUses !== undefined && !(Number.isInteger(s.maxUses) && s.maxUses >= 1)) p.push(`${n}：maxUses 必須是 1 以上的整數。`);
    if (s.cooldown !== undefined && !(Number.isInteger(s.cooldown) && s.cooldown >= 0)) p.push(`${n}：cooldown 必須是 0 以上的整數。`);
  });
  return p;
}
export function validateItems(list) {
  if (!Array.isArray(list)) return ['最外層必須是以 [ ] 包起來的清單。'];
  const p = [], ids = new Set();
  list.forEach((s, i) => {
    const n = `第 ${i + 1} 筆${s && s.id ? '（' + s.id + '）' : ''}`;
    if (!s || !isStr(s.id)) { p.push(`${n}：缺少 id。`); return; }
    if (ids.has(s.id)) p.push(`${n}：id 重複。`); ids.add(s.id);
    if (!isStr(s.name)) p.push(`${n}：缺少 name。`);
    if (!['heal', 'damage', 'buff', 'passive'].includes(s.type)) p.push(`${n}：type 必須是 heal、damage、buff 或 passive。`);
    if (s.type === 'passive' && !(['atk', 'def', 'hp'].includes(s.stat) && num(s.bonus))) p.push(`${n}：passive 需要 stat（atk、def 或 hp）與 bonus（數字）。`);
    if (['heal', 'damage'].includes(s.type) && !num(s.amount)) p.push(`${n}：需要 amount（數字）。`);
    if (s.type === 'buff' && !(['atk', 'def'].includes(s.stat) && num(s.multiplier) && (num(s.turns) || num(s.battles)))) p.push(`${n}：buff 需要 stat（atk 或 def）、multiplier，以及 turns（回合數）或 battles（戰鬥場數）。`);
  });
  return p;
}
export function validateEnemies(list, all) {
  if (!Array.isArray(list)) return ['最外層必須是以 [ ] 包起來的清單。'];
  const p = [], ids = new Set(), skillIds = new Set(Array.isArray(all?.skills) ? all.skills.map(s => s.id) : []);
  list.forEach((e, i) => {
    const n = `第 ${i + 1} 筆${e && e.id ? '（' + e.id + '）' : ''}`;
    if (!e || !isStr(e.id)) { p.push(`${n}：缺少 id。`); return; }
    if (ids.has(e.id)) p.push(`${n}：id 重複。`); ids.add(e.id);
    if (!isStr(e.name)) p.push(`${n}：缺少 name。`);
    if (!(num(e.hp) && e.hp > 0)) p.push(`${n}：hp 必須是大於 0 的數字。`);
    if (!num(e.atk) || !num(e.def)) p.push(`${n}：atk 與 def 必須是數字。`);
    (e.skills || []).forEach(k => { if (!skillIds.has(k)) p.push(`${n}：技能「${k}」不存在於 skills.json。`); });
  });
  return p;
}

export function validateStages(d, all) {
  if (typeof d !== 'object' || d === null) return ['最外層必須是以 { } 包起來。'];
  const p = [], ids = new Set(Array.isArray(all?.enemies) ? all.enemies.map(e => e.id) : []);
  if (!Number.isInteger(d.totalFloors) || d.totalFloors < 1) p.push('「totalFloors」必須是 1 以上的整數。');
  if (!Number.isInteger(d.bossEvery) || d.bossEvery < 1) p.push('「bossEvery」必須是 1 以上的整數。');
  if (!Array.isArray(d.normalEnemies) || !d.normalEnemies.length) p.push('「normalEnemies」必須是至少含一個敵人 id 的清單。');
  else d.normalEnemies.forEach(e => { if (!ids.has(e)) p.push(`normalEnemies：敵人「${e}」不存在於 enemies.json。`); });
  if (!d.bosses || typeof d.bosses !== 'object' || !Object.keys(d.bosses).length) p.push('「bosses」至少要有一個強敵設定。');
  else Object.entries(d.bosses).forEach(([k, b]) => { if (!b || !ids.has(b.enemy)) p.push(`bosses 第 ${k} 層：敵人「${b && b.enemy}」不存在於 enemies.json。`); });
  if (!Array.isArray(d.overrides)) p.push('「overrides」必須是清單（沒有可填 []）。');
  else d.overrides.forEach((o, i) => { if (!o || !Number.isInteger(o.floor) || !ids.has(o.enemy)) p.push(`overrides 第 ${i + 1} 筆：需要 floor（整數）與存在的 enemy。`); });
  const sc = d.scaling;
  if (!sc || !['hpPerFloor', 'atkPerFloor', 'defPerFloor'].every(k => num(sc[k]))) p.push('「scaling」需要 hpPerFloor、atkPerFloor、defPerFloor（數字）。');
  const lv = d.leveling;
  if (!lv || !lv.expToNext || !lv.expPerWin || !num(lv.expToNext.base) || !num(lv.expToNext.perLevel) || !num(lv.expPerWin.base) || !num(lv.expPerWin.perFloor) || !(lv.maxLevel >= 1)) p.push('「leveling」需要 expToNext、expPerWin（各含 base 與 perLevel／perFloor）與 maxLevel。');
  if (!num(d.restHealPercent)) p.push('「restHealPercent」必須是數字（0.25＝每場勝利後回復 25%）。');
  if (!Number.isInteger(d.rewardCount) || d.rewardCount < 1) p.push('「rewardCount」必須是 1 以上的整數。');
  ['standard', 'casual'].forEach(m => { if (!d.modes || !d.modes[m] || !isStr(d.modes[m].name) || !isStr(d.modes[m].desc)) p.push(`「modes.${m}」需要 name 與 desc。`); else if (d.modes[m].restHealPercent !== undefined && !num(d.modes[m].restHealPercent)) p.push(`「modes.${m}.restHealPercent」必須是數字。`); });
  if (!Array.isArray(d.achievements)) p.push('「achievements」必須是清單。');
  return p;
}
export function validateIntro(d) {
  if (typeof d !== 'object' || d === null || !Array.isArray(d.lines)) return ['需要「lines」清單。'];
  return d.lines.flatMap((l, i) => (!l || typeof l !== 'object' || typeof l.text !== 'string') ? [`lines 第 ${i + 1} 句：需要 text（文字，可留空）。`] : []);
}

export const DATA_FILES = [
  { key: 'stages', path: 'data/stages.json', validate: validateStages },
  { key: 'intro', path: 'data/intro.json', validate: validateIntro },
  { key: 'skills', path: 'data/skills.json', validate: validateSkills },
  { key: 'items', path: 'data/items.json', validate: validateItems },
  { key: 'enemies', path: 'data/enemies.json', validate: validateEnemies },
  { key: 'parts', path: 'data/parts.json', validate: validateParts },
  { key: 'credits', path: 'data/credits.json', validate: validateCredits },
  { key: 'text', path: 'data/text.json', validate: validateText },
  { key: 'settings', path: 'data/settings.json', validate: validateSettings },
];

export async function loadAll(base = '') {
  const out = {};
  for (const f of DATA_FILES) out[f.key] = await loadJSON(base + f.path);
  for (const f of DATA_FILES) {
    const problems = f.validate(out[f.key], out);
    if (problems.length) throw new DataError(f.path, problems.join('\n'));
  }
  return out;
}
