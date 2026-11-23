// 角色圖層合成引擎（捏角、角色列表、戰鬥畫面共用）
const cache = new Map();
export function loadImage(src) {
  if (!cache.has(src)) {
    cache.set(src, new Promise(res => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = src;
    }));
  }
  return cache.get(src);
}
const blank = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// 乘法上色：保留灰階明暗；透明處維持透明
function tinted(img, color) {
  const c = blank(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(img, 0, 0);
  return c;
}
function buildSprite(part, img, mask, color) {
  if (part.mode === 'tint') return tinted(img, color);
  if (part.mode === 'mask') {
    const c = blank(img.width, img.height), x = c.getContext('2d');
    x.drawImage(img, 0, 0); x.drawImage(tinted(mask, color), 0, 0);
    return c;
  }
  return img;
}

// 回傳找不到圖片的檔名清單
export async function renderCharacter(canvas, appearance, lib) {
  const token = canvas._token = (canvas._token || 0) + 1;
  const { width: W, height: H } = lib.canvas;
  const items = appearance.layers
    .map((layer, i) => ({ layer, i, part: lib.getPart(layer.partId) }))
    .filter(o => o.part)
    .sort((a, b) => (a.layer.z ?? lib.zOf(a.part)) - (b.layer.z ?? lib.zOf(b.part)) || a.i - b.i);
  const loaded = await Promise.all(items.map(async o => ({
    ...o, img: await loadImage(o.part.file),
    mask: o.part.mode === 'mask' ? await loadImage(o.part.maskFile) : null,
  })));
  if (token !== canvas._token) return [];
  const off = blank(W, H), ctx = off.getContext('2d'), missing = [];
  for (const { layer, part, img, mask } of loaded) {
    if (!img) { missing.push(part.file); continue; }
    if (part.mode === 'mask' && !mask) { missing.push(part.maskFile); continue; }
    const color = layer.color || part.defaultColor || '#ffffff';
    let sprite = buildSprite(part, img, mask, color);
    if (part.splitX && layer.colorR && layer.colorR !== color && part.mode !== 'none') {
      const s2 = buildSprite(part, img, mask, layer.colorR);
      const c = blank(img.width, img.height), x = c.getContext('2d'), sx = part.splitX;
      x.drawImage(sprite, 0, 0, sx, img.height, 0, 0, sx, img.height);
      x.drawImage(s2, sx, 0, img.width - sx, img.height, sx, 0, img.width - sx, img.height);
      sprite = c;
    }
    const t = lib.getCategory(part.category).transform !== false;   // 類別設 transform:false（如身體）就忽略位置／大小／旋轉
    ctx.save();
    ctx.translate(W / 2 + (t ? layer.x || 0 : 0), H / 2 + (t ? layer.y || 0 : 0));
    ctx.rotate(((t ? layer.rotation || 0 : 0) * Math.PI) / 180);
    ctx.scale((t ? layer.scale ?? 1 : 1) * (t && layer.flipX ? -1 : 1), t ? layer.scale ?? 1 : 1);
    ctx.drawImage(sprite, -img.width / 2, -img.height / 2);
    ctx.restore();
  }
  canvas.width = W; canvas.height = H;
  canvas.getContext('2d').drawImage(off, 0, 0);
  return missing;
}
