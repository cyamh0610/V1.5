// 冒險規則：樓層、敵人強化、等級、戰利品、成就（不碰畫面）
import { getPlayerStats } from '../battle/battleEngine.js?v=5';

export const isBossFloor = (st, f) => f % st.bossEvery === 0;
export function createRun(mode, characterId) {
  return { mode, characterId, floor: 1, hp: null, level: 1, exp: 0, inventory: {}, held: [], tempBuffs: [] };
}
// 標準模式：等級跟著這次冒險；輕鬆模式：等級永久保留（玩家全域）
export const levelState = (save, run) => run.mode === 'casual' ? save.shared : run;
export const expNeeded = (st, lv) => st.leveling.expToNext.base + st.leveling.expToNext.perLevel * (lv - 1);
export const expGain = (st, floor) => st.leveling.expPerWin.base + st.leveling.expPerWin.perFloor * floor;
export function gainExp(st, state, amount) {
  const from = state.level;
  state.exp += amount;
  while (state.level < st.leveling.maxLevel && state.exp >= expNeeded(st, state.level)) { state.exp -= expNeeded(st, state.level); state.level++; }
  if (state.level >= st.leveling.maxLevel) state.exp = 0;
  return { from, to: state.level };
}
export function playerStats(cfg, save, run, itemsById) {
  const s = getPlayerStats(cfg, levelState(save, run).level);
  run.held.forEach(id => { const it = itemsById.get(id); if (it?.type === 'passive') s[it.stat] += it.bonus; });
  return s;
}
export function enemyForFloor(st, floor, enemiesById, skillsById) {
  const ov = st.overrides.find(o => o.floor === floor);
  let id, mult = 1;
  if (ov) id = ov.enemy;
  else if (isBossFloor(st, floor)) {
    const b = st.bosses[floor] || st.bosses.default || Object.values(st.bosses)[0];
    id = b.enemy; mult = b.statMultiplier ?? 1;
  } else id = st.normalEnemies[Math.floor(Math.random() * st.normalEnemies.length)];
  const e = enemiesById.get(id), k = f => 1 + f * (floor - 1);
  return { ...e, hp: Math.round(e.hp * k(st.scaling.hpPerFloor) * mult), atk: Math.round(e.atk * k(st.scaling.atkPerFloor) * mult),
    def: Math.round(e.def * k(st.scaling.defPerFloor) * mult), skills: (e.skills || []).map(s => skillsById.get(s)) };
}
// 依權重不重複抽出戰利品
export function rollRewards(st, items, floor) {
  const pool = items.filter(i => i.reward && (!i.minFloor || floor >= i.minFloor)), out = [];
  while (out.length < st.rewardCount && pool.length) {
    let r = Math.random() * pool.reduce((a, i) => a + (i.weight ?? 1), 0), k = 0;
    for (; k < pool.length - 1; k++) { r -= pool[k].weight ?? 1; if (r <= 0) break; }
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}
export function applyReward(run, it) {
  if (it.type === 'passive') run.held.push(it.id); else run.inventory[it.id] = (run.inventory[it.id] || 0) + 1;
}
export const rewardLabel = it => ({ heal: '消耗品（戰鬥中使用）', damage: '消耗品（戰鬥中使用）', passive: '持有型（本次冒險持續有效）',
  buff: it.battles ? `強化（持續 ${it.battles} 場戰鬥）` : `強化（持續 ${it.turns} 回合）` })[it.type];
export function checkAchievements(st, save, floor, boss) {
  const have = save.shared.unlocks.achievements, got = [];
  st.achievements.forEach(a => {
    const hit = a.type === 'defeatBoss' ? boss && floor === a.floor : a.type === 'reachFloor' ? floor >= a.floor : false;
    if (hit && !have.includes(a.id)) { have.push(a.id); got.push(a); }
  });
  return got;
}
