// 隨機造型：規則全部由 data/parts.json 控制
//  category.randomChance  可選類別被選中的機率（預設 0.6）
//  category.colorGroup    相同群組的類別使用同一個隨機顏色（例如前髮與後髮）
//  category.randomColors  該類別隨機顏色的候選清單（例如膚色）
//  part.excludes          選了此素材後，不可同時出現的素材 id 或類別 id
const pick = a => a[Math.floor(Math.random() * a.length)];
function hslHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}
const randColor = () => hslHex(Math.random() * 360, 40 + Math.random() * 45, 35 + Math.random() * 35);

export function randomAppearance(lib, newLayer) {
  const layers = [], banned = new Set(), shared = {};
  for (const c of lib.categories) {
    if (banned.has(c.id)) continue;
    const parts = lib.partsOf(c.id).filter(p => !banned.has(p.id));
    if (!parts.length) continue;
    const chance = c.optional ? (c.randomChance ?? 0.6) : 1;
    if (Math.random() >= chance) continue;
    const p = pick(parts);
    const g = c.colorGroup || c.id;
    if (!(g in shared)) shared[g] = c.randomColors?.length ? pick(c.randomColors) : randColor();
    const l = newLayer(p);
    if (p.mode !== 'none') l.color = shared[g];
    if (p.splitX && Math.random() < 0.25) l.colorR = randColor();
    layers.push(l);
    (p.excludes || []).forEach(x => banned.add(x));
  }
  return { layers };
}
