// 冒險流程畫面：續玩、樓層主頁、戰利品、通關、倒下
import { el } from '../ui/dom.js?v=5';
import { renderCharacter } from '../editor/renderer.js?v=5';
import { resolveSkills } from '../battle/battleEngine.js?v=5';
import * as R from './runManager.js?v=5';

export function createAdventure({ root, lib, data, save, persist, showPage, battleScreen, openStatus, createBlank, toSetup, toMenu }) {
  const st = data.stages, cfg = data.settings.battle;
  const enemiesById = new Map(data.enemies.map(e => [e.id, e])), skillsById = new Map(data.skills.map(s => [s.id, s]));
  const itemsById = new Map(data.items.map(i => [i.id, i]));
  const run = () => save.currentRun, ch = () => save.characters.find(c => c.id === run().characterId);
  const modeName = m => st.modes[m].name;
  const show = (...kids) => { root.textContent = ''; const box = el('div', 'adv'); box.append(...kids); root.append(box); showPage('adventure'); };
  const btn = (t, fn, cls = '') => { const b = el('button', 'btn ' + cls, t); b.addEventListener('click', fn); return b; };
  const paras = arr => (arr || []).filter(x => x.trim()).map(x => el('p', 'prose-pre', x));
  const names = ids => ids.map(id => itemsById.get(id)?.name).filter(Boolean);

  function begin(mode, charId) {
    let c = save.characters.find(x => x.id === charId);
    if (!c) c = createBlank();
    if (!c) return false;
    save.currentRun = R.createRun(mode, c.id);
    persist(); hub(); return true;
  }
  function resume() {
    if (!ch()) { save.currentRun = null; persist(); return toSetup(); }
    show(el('h2', '', '尚未完成的冒險'), el('p', '', `${modeName(run().mode)}　第 ${run().floor} / ${st.totalFloors} 層　角色：${ch().name}`),
      btn('繼續冒險', hub, 'primary'),
      btn('重新開始（放棄目前進度）', () => { if (confirm('確定要放棄目前的冒險進度嗎？')) { save.currentRun = null; persist(); toSetup(); } }),
      btn('返回主選單', toMenu));
  }
  function info() {
    const r = run(), stats = R.playerStats(cfg, save, r, itemsById);
    return { level: R.levelState(save, r).level, stats: { hp: r.hp ?? stats.hp, maxHp: stats.hp, atk: stats.atk, def: stats.def },
      skillNames: resolveSkills(ch(), data.skills, cfg).map(k => k.name),
      itemLines: [...Object.entries(r.inventory).filter(([i, n]) => n > 0 && itemsById.has(i)).map(([i, n]) => `${itemsById.get(i).name}×${n}`), ...names(r.held)],
      achievementNames: save.shared.unlocks.achievements.map(id => st.achievements.find(a => a.id === id)?.name).filter(Boolean) };
  }

  function hub() {
    const r = run(), c = ch(), stats = R.playerStats(cfg, save, r, itemsById), lv = R.levelState(save, r);
    if (r.hp == null || r.hp > stats.hp) r.hp = stats.hp;
    const boss = R.isBossFloor(st, r.floor);
    const cv = el('canvas', 'adv-thumb'); renderCharacter(cv, c.appearance, lib);
    const bar = el('div', 'bt-hpbar'), fill = el('div', 'bt-fill'); fill.style.width = r.hp / stats.hp * 100 + '%'; bar.append(fill);
    const side = el('div', 'adv-side', ''); side.append(el('div', 'cm-name', c.name), bar, el('div', 'muted small', `HP ${r.hp} / ${stats.hp}`),
      el('div', 'muted small', `等級 ${lv.level}　經驗 ${lv.exp} / ${lv.level >= st.leveling.maxLevel ? '—' : R.expNeeded(st, lv.level)}`),
      el('div', 'muted small', modeName(r.mode)));
    const row = el('div', 'adv-row'); row.append(cv, side);
    const items = [...Object.entries(r.inventory).filter(([i, n]) => n > 0 && itemsById.has(i)).map(([i, n]) => `${itemsById.get(i).name}×${n}`), ...names(r.held)];
    show(el('h2', '', `第 ${r.floor} / ${st.totalFloors} 層${boss ? '　強敵出現' : ''}`), row,
      el('p', 'muted small', '持有物品：' + (items.length ? items.join('、') : '無')),
      btn('進入戰鬥', fight, 'primary'), btn('角色狀態', () => openStatus(c, info(), 'adventure')),
      btn('暫時離開（進度會保留）', toMenu), btn('放棄這次冒險', () => { if (confirm('確定要放棄這次冒險嗎？進度會消失。')) { save.currentRun = null; persist(); toMenu(); } }, 'subtle'));
  }

  function fight() {
    const r = run(), c = ch(), stats = R.playerStats(cfg, save, r, itemsById);
    const enemy = R.enemyForFloor(st, r.floor, enemiesById, skillsById);
    battleScreen.start({ character: c, name: c.name || '未命名角色', level: R.levelState(save, r).level, stats, startHp: r.hp,
      skillDefs: resolveSkills(c, data.skills, cfg), enemy, inventory: { ...r.inventory }, startBuffs: r.tempBuffs, allowRetry: false,
      onEnd: (res, battle) => res === 'win' ? won(battle, R.isBossFloor(st, r.floor)) : died() });
    showPage('battle');
  }

  function won(battle, boss) {
    const r = run(), rec = save.shared.records, lv = R.levelState(save, r);
    r.inventory = Object.fromEntries(Object.entries(battle.inventory).filter(([, n]) => n > 0));
    r.tempBuffs = battle.carryBuffs();
    rec.battles++; rec.highestFloor = Math.max(rec.highestFloor, r.floor);
    if (boss && !rec.bossesDefeated.includes(r.floor)) rec.bossesDefeated.push(r.floor);
    const before = R.playerStats(cfg, save, r, itemsById).hp;
    const gain = R.expGain(st, r.floor), lvl = R.gainExp(st, lv, gain);
    const after = R.playerStats(cfg, save, r, itemsById).hp;
    r.hp = Math.min(after, battle.player.hp + Math.max(0, after - before) + Math.round(after * (st.modes[r.mode].restHealPercent ?? st.restHealPercent)));
    const unlocked = R.checkAchievements(st, save, r.floor, boss);
    const lines = [el('p', '', `獲得經驗 ${gain}`)];
    if (lvl.to > lvl.from) lines.push(el('p', 'adv-up', `升級！ Lv ${lvl.from} → Lv ${lvl.to}`));
    unlocked.forEach(a => lines.push(el('p', 'adv-up', `解鎖：${a.name}`)));
    if (r.floor >= st.totalFloors) {
      save.currentRun = null; save.shared.records.clears = (save.shared.records.clears || 0) + 1; persist();
      return show(el('h2', '', st.clearTitle || `已通過第 ${st.totalFloors} 層！`), ...paras(st.clearBody), ...lines, btn('返回主選單', toMenu, 'primary'));
    }
    const rewards = R.rollRewards(st, data.items, r.floor);
    persist();
    const cards = el('div', 'adv-cards');
    const next = () => { r.floor++; persist(); hub(); };
    rewards.forEach(it => {
      const b = el('button', 'adv-card'); b.append(el('div', 'cm-name', it.name), el('div', 'muted small', R.rewardLabel(it)), el('div', 'small', it.desc || ''));
      b.addEventListener('click', () => { R.applyReward(r, it); next(); }); cards.append(b);
    });
    show(el('h2', '', `第 ${r.floor} 層完成！`), ...lines, el('h3', '', rewards.length ? '選擇一項戰利品' : ''), cards, rewards.length ? el('span') : btn('繼續', next, 'primary'));
  }

  function died() {
    save.shared.records.deaths++; save.shared.records.battles++;
    const mode = run().mode, floor = run().floor;
    save.shared.records.highestFloor = Math.max(save.shared.records.highestFloor, floor);
    save.currentRun = null; persist();
    show(el('h2', '', '倒下了……'), el('p', '', `在第 ${floor} 層倒下。`),
      el('p', 'muted', st.modes[mode].deathText || (mode === 'standard' ? '這次冒險的等級與道具都已清空。' : '等級會保留，這次冒險的道具已清空。')),
      btn('重新開始（可更改模式）', toSetup, 'primary'), btn('返回主選單', toMenu));
  }
  return { begin, resume };
}
