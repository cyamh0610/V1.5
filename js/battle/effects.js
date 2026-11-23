// 戰鬥演出：全部是程式特效（CSS 動畫），sleep 由戰鬥畫面提供（暫停時會停住）
import { el } from '../ui/dom.js?v=5';
export async function lunge(wrap, dir, sleep) {
  wrap.style.setProperty('--dx', dir * 60 + 'px'); wrap.classList.add('lunge');
  await sleep(280); wrap.classList.remove('lunge');
}
export async function hurt(wrap, sleep) { wrap.classList.add('hurt'); await sleep(380); wrap.classList.remove('hurt'); }
export function floatNumber(stage, anchor, text, cls, sleep) {
  const s = stage.getBoundingClientRect(), a = anchor.getBoundingClientRect();
  const n = el('div', 'bt-num ' + cls, text);
  n.style.left = a.left - s.left + a.width / 2 + 'px'; n.style.top = a.top - s.top + a.height * 0.25 + 'px';
  stage.append(n); sleep(1000).then(() => n.remove());
}
export async function shield(wrap, sleep) { const s = el('div', 'bt-shield'); wrap.append(s); await sleep(650); s.remove(); }
export async function pulse(wrap, sleep) { wrap.classList.add('pulse'); await sleep(500); wrap.classList.remove('pulse'); }
export function victory(wrap) { wrap.classList.add('win'); }
export function defeat(wrap) { wrap.classList.add('down'); }
