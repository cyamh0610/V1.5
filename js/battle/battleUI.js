// 戰鬥畫面：指令選單、演出、QTE、暫停查看角色狀態
import { renderCharacter } from '../editor/renderer.js?v=5';
import { Battle } from './battleEngine.js?v=5';
import * as fx from './effects.js?v=5';
import { runQte } from './qte.js?v=5';
import { el } from '../ui/dom.js?v=5';

export function createBattleScreen({ root, lib, cfg, itemsById, getQteMode, renderStatus }) {
  let paused = false, keyHandler = null;
  const sleep = ms => new Promise(res => { let left = ms; const t = () => { if (!paused) left -= 50; left <= 0 ? res() : setTimeout(t, 50); }; t(); });

  function start(opts) {
    root.textContent = ''; paused = false;
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    const battle = new Battle({ player: { name: opts.name, hp: opts.stats.hp, atk: opts.stats.atk, def: opts.stats.def, skills: opts.skillDefs, startHp: opts.startHp },
      enemy: opts.enemy, inventory: opts.inventory, itemsById, cfg, startBuffs: opts.startBuffs });
    const P = battle.player, E = battle.enemy;

    const wrap = el('div', 'bt'), stage = el('div', 'bt-stage');
    if (cfg.background) { stage.classList.add('has-bg'); stage.style.backgroundImage = `url("${cfg.background}")`; }
    const mkUnit = (cls, name) => {
      const box = el('div', 'bt-unit ' + cls), hud = el('div', 'bt-hud'), bar = el('div', 'bt-hpbar'), fill = el('div', 'bt-fill'), txt = el('div', 'bt-hptext'), sp = el('div', 'bt-wrap');
      bar.append(fill); hud.append(el('div', 'bt-name', name), bar, txt); box.append(hud, sp); stage.append(box);
      return { box, sp, fill, txt };
    };
    const pu = mkUnit('player', P.name), eu = mkUnit('enemy', E.name);
    const pc = el('canvas'); pu.sp.append(pc); renderCharacter(pc, opts.character.appearance, lib);
    if (opts.enemy.image) {
      const img = new Image(); img.alt = E.name; img.src = opts.enemy.image;
      img.onerror = () => { img.replaceWith(el('div', 'bt-fallback', E.name)); };
      eu.sp.append(img);
    } else eu.sp.append(el('div', 'bt-fallback', E.name));
    const log = el('div', 'bt-log'), cmd = el('div', 'bt-cmd');
    const top = el('div', 'bt-top'), stBtn = el('button', 'btn small', '角色狀態');
    top.append(stBtn); wrap.append(top, stage, log, cmd); root.append(wrap);

    const statusBox = el('div', 'bt-status'), statusBody = el('div'), closeBtn = el('button', 'btn', '關閉並繼續戰鬥');
    statusBox.hidden = true; statusBox.append(statusBody, closeBtn); root.append(statusBox);
    const setPause = p => { paused = p; wrap.classList.toggle('paused', p); statusBox.hidden = !p; if (p) { statusBody.textContent = ''; renderStatus(statusBody, battle, opts); } };
    stBtn.addEventListener('click', () => setPause(true));
    closeBtn.addEventListener('click', () => setPause(false));
    keyHandler = e => { if (e.key === 'Escape' && paused) setPause(false); };
    document.addEventListener('keydown', keyHandler);

    const bars = () => [[P, pu], [E, eu]].forEach(([u, v]) => { v.fill.style.width = u.hp / u.maxHp * 100 + '%'; v.txt.textContent = `${u.hp} / ${u.maxHp}`; });
    const say = t => { log.append(el('p', '', t)); log.scrollTop = log.scrollHeight; };
    const view = u => u === P ? pu : eu;
    const hooks = {
      async emit(ev) {
        if (ev.type === 'text') { say(ev.text); await sleep(ev.fast ? 250 : 500); }
        else if (ev.type === 'hit') {
          await fx.lunge(view(ev.src).sp, ev.src === P ? 1 : -1, sleep);
          fx.floatNumber(stage, view(ev.tgt).sp, '-' + ev.dmg, 'dmg', sleep); bars(); say(`${ev.tgt.name} 受到 ${ev.dmg} 點傷害。`);
          await fx.hurt(view(ev.tgt).sp, sleep);
        } else if (ev.type === 'heal') { fx.floatNumber(stage, view(ev.target).sp, '+' + ev.amount, 'heal', sleep); bars(); say(`${ev.target.name} 恢復了 ${ev.amount} 點 HP。`); await sleep(450); }
        else if (ev.type === 'guard') await fx.shield(view(ev.target).sp, sleep);
        else if (ev.type === 'buff') { say(ev.text); await fx.pulse(view(ev.target).sp, sleep); }
      },
      qte: q => runQte({ stage, cfg: q, mode: getQteMode(), isPaused: () => paused }),
    };

    const btn = (t, fn, dis, sub) => { const b = el('button', 'btn', t); if (sub) b.append(el('small', 'muted', sub)); b.disabled = !!dis; b.addEventListener('click', fn); cmd.append(b); };
    function menu(kind = 'main') {
      cmd.textContent = ''; cmd.className = 'bt-cmd' + (kind === 'main' ? '' : ' list');
      if (kind === 'main') {
        btn('攻擊', () => run({ type: 'attack' })); btn('技能', () => menu('skills'));
        btn('道具', () => menu('items')); btn('防禦', () => run({ type: 'guard' }));
      } else if (kind === 'skills') {
        P.skills.forEach(s => btn(s.def.name, () => run({ type: 'skill', id: s.def.id }), !battle.usable(s), s.cd > 0 ? ` 冷卻 ${s.cd}` : s.def.desc ? ' ' + s.def.desc : ''));
        if (!P.skills.length) cmd.append(el('p', 'empty', '沒有可用的技能。'));
        btn('← 返回', () => menu());
      } else {
        const ids = Object.keys(battle.inventory).filter(id => itemsById.has(id));
        ids.forEach(id => { const it = itemsById.get(id), n = battle.inventory[id]; btn(`${it.name} ×${n}`, () => run({ type: 'item', id }), n <= 0, it.desc ? ' ' + it.desc : ''); });
        if (!ids.length) cmd.append(el('p', 'empty', '沒有道具。'));
        btn('← 返回', () => menu());
      }
    }
    async function run(action) {
      cmd.querySelectorAll('button').forEach(b => { b.disabled = true; }); stBtn.disabled = false;
      await battle.playerTurn(action, hooks); bars();
      if (battle.over) return finish();
      menu();
    }
    async function finish() {
      const won = battle.over === 'win';
      won ? fx.victory(pu.sp) : fx.defeat(pu.sp); if (won) fx.defeat(eu.sp);
      await sleep(900);
      const end = el('div', 'bt-end'); end.append(el('h3', '', won ? '勝利！' : '戰敗……'), el('p', 'muted', `共經過 ${battle.turn} 回合`));
      const row = el('div', 'bt-end-btns');
      const b1 = el('button', 'btn primary', opts.allowRetry ? '返回' : (won ? '繼續' : '確定')); b1.addEventListener('click', () => opts.onEnd(battle.over, battle));
      if (opts.allowRetry) { const b0 = el('button', 'btn', '再戰一次'); b0.addEventListener('click', () => start(opts)); row.append(b0); }
      row.append(b1); end.append(row); stage.append(end); cmd.textContent = '';
    }

    bars(); if (opts.enemy.appearText) say(opts.enemy.appearText); say(`${E.name} 出現了！`);
    menu();
  }
  return { start };
}
