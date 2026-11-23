// 復原／重做：保存外觀的快照
const clone = o => JSON.parse(JSON.stringify(o));
export class History {
  constructor(initial, limit = 100) { this.stack = [clone(initial)]; this.i = 0; this.limit = limit; }
  push(state) {
    this.stack = this.stack.slice(0, this.i + 1);
    this.stack.push(clone(state));
    if (this.stack.length > this.limit) this.stack.shift();
    this.i = this.stack.length - 1;
  }
  get canUndo() { return this.i > 0; }
  get canRedo() { return this.i < this.stack.length - 1; }
  undo() { if (this.canUndo) this.i--; return clone(this.stack[this.i]); }
  redo() { if (this.canRedo) this.i++; return clone(this.stack[this.i]); }
}
