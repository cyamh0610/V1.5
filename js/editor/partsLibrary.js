// 素材清單管理：讀取 data/parts.json 後提供查詢
export class PartsLibrary {
  constructor(data) {
    this.canvas = data.canvas;
    this.categories = data.categories;
    this.parts = data.parts;
    this._byId = new Map(data.parts.map(p => [p.id, p]));
    this._cat = new Map(data.categories.map(c => [c.id, c]));
  }
  getPart(id) { return this._byId.get(id); }
  getCategory(id) { return this._cat.get(id); }
  partsOf(catId) { return this.parts.filter(p => p.category === catId); }
  zOf(part) { return this._cat.get(part.category).z; }
}
