// 依 data/credits.json 產生致謝清單（新增素材不需改程式）
const TYPE_LABEL = { background: '背景／場景圖片', ui: 'UI 素材', bgm: 'BGM', sfx: '音效', font: '字體', other: '其他' };
const FIELDS = [['creator', '創作者'], ['url', '來源網址'], ['license', '授權方式'], ['usage', '使用位置'], ['modified', '修改情況']];

export function renderCredits(list, root) {
  root.textContent = '';
  if (!list.length) {
    const p = document.createElement('p'); p.className = 'empty'; p.textContent = '目前尚無第三方素材。';
    root.append(p); return;
  }
  const groups = {};
  list.forEach(c => { const t = c.type in TYPE_LABEL ? c.type : 'other'; (groups[t] = groups[t] || []).push(c); });
  for (const [type, items] of Object.entries(groups)) {
    const g = document.createElement('div'); g.className = 'credit-group';
    const h = document.createElement('h3'); h.textContent = TYPE_LABEL[type]; g.append(h);
    items.forEach(c => {
      const box = document.createElement('div'); box.className = 'credit';
      const n = document.createElement('div'); n.className = 'name'; n.textContent = c.name; box.append(n);
      const dl = document.createElement('dl');
      FIELDS.forEach(([k, label]) => {
        if (!c[k]) return;
        const dt = document.createElement('dt'); dt.textContent = label;
        const dd = document.createElement('dd');
        if (k === 'url') {
          const a = document.createElement('a');
          a.href = c.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = c.url;
          dd.append(a);
        } else dd.textContent = c[k];
        dl.append(dt, dd);
      });
      box.append(dl); g.append(box);
    });
    root.append(g);
  }
}
