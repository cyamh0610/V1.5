// JSON 匯出／匯入與格式驗證
import { migrate, FutureVersionError, SAVE_VERSION } from './migrations.js?v=5';
export const FORMAT = 'oc-game-export';
const HEX = /^#[0-9a-fA-F]{6}$/;
const num = (v, d, min, max) => Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const rnd = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const newId = () => 'c' + rnd();

export function buildExport(characters, shared) {
  const o = { format: FORMAT, saveVersion: SAVE_VERSION, exportedAt: new Date().toISOString(), characters };
  if (shared) o.shared = shared;
  return o;
}
export function downloadJSON(filename, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

// 驗證並清理單一角色；匯入的角色一律配發新 id，不會覆蓋既有角色
export function sanitizeCharacter(c, lib, limits, warn, label) {
  if (!c || typeof c !== 'object' || !c.appearance || !Array.isArray(c.appearance.layers)) { warn(`${label}：缺少外觀資料，已略過。`); return null; }
  const str = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  let dropped = 0; const layers = [];
  c.appearance.layers.forEach((l, i) => {
    const p = l && lib.getPart(l.partId);
    if (!p) { dropped++; return; }
    const t = lib.getCategory(p.category).transform !== false;
    layers.push({ uid: 'l' + rnd() + i, partId: p.id,
      color: HEX.test(l.color) ? l.color : (p.defaultColor || '#ffffff'),
      ...(p.splitX && HEX.test(l.colorR) ? { colorR: l.colorR } : {}),
      x: t ? num(l.x, 0, -512, 512) : 0, y: t ? num(l.y, 0, -768, 768) : 0,
      scale: t ? num(l.scale, 1, 0.2, 3) : 1, rotation: t ? num(l.rotation, 0, -180, 180) : 0, flipX: t ? !!l.flipX : false,
      ...(Number.isFinite(l.z) ? { z: l.z } : {}) });
  });
  if (dropped) warn(`${label}：有 ${dropped} 個找不到的素材（可能已從遊戲移除），已略過。`);
  const now = new Date().toISOString();
  return { id: newId(), name: str(c.name, limits.name).trim() || '未命名角色', identity: str(c.identity, limits.identity), bio: str(c.bio, limits.bio),
    appearance: { layers }, skills: Array.isArray(c.skills) ? c.skills.filter(s => typeof s === 'string') : [],
    progress: c.progress && typeof c.progress === 'object' && !Array.isArray(c.progress) ? c.progress : {},
    createdAt: typeof c.createdAt === 'string' ? c.createdAt : now, updatedAt: now };
}

export function parseImport(text, lib, limits) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: '這個檔案不是有效的 JSON（可能已損壞，或選錯了檔案）。' }; }
  if (!obj || obj.format !== FORMAT || !Array.isArray(obj.characters)) return { ok: false, error: '這不是本遊戲匯出的角色檔案。' };
  try { obj = migrate(obj); }
  catch (e) { return { ok: false, error: e instanceof FutureVersionError ? '此檔案來自較新版本的遊戲，請先更新遊戲再匯入。' : '檔案版本無法辨識。' }; }
  const warnings = [], warn = m => warnings.push(m);
  const characters = obj.characters.map((c, i) => sanitizeCharacter(c, lib, limits, warn, `第 ${i + 1} 個角色`)).filter(Boolean);
  if (!characters.length) return { ok: false, error: '檔案中沒有可匯入的角色。' + (warnings.length ? '\n' + warnings.join('\n') : '') };
  return { ok: true, characters, shared: obj.shared && typeof obj.shared === 'object' ? obj.shared : null, warnings };
}
