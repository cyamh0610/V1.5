// 戰鬥邏輯（不碰畫面）。畫面與 QTE 透過 hooks 傳入：hooks.emit(事件)、hooks.qte(設定)
const rnd = (a, b) => a + Math.random() * (b - a);
const STAT = { atk: '攻擊', def: '防禦' };

export function getPlayerStats(b, level = 1) {
  const g = b.playerGrowthPerLevel || {}, p = b.playerBase, L = Math.max(1, level) - 1;
  return { hp: p.hp + (g.hp || 0) * L, atk: p.atk + (g.atk || 0) * L, def: p.def + (g.def || 0) * L };
}
// 角色已選技能；沒選或選的已不存在時，使用預設技能
export function resolveSkills(ch, all, b) {
  const byId = new Map(all.map(s => [s.id, s]));
  let ids = (ch.skills || []).filter(i => byId.has(i));
  if (!ids.length) ids = all.filter(s => !s.enemyOnly).slice(0, b.defaultSkillCount || 3).map(s => s.id);
  return ids.slice(0, b.maxSkills || 4).map(i => byId.get(i));
}

export class Battle {
  constructor({ player, enemy, inventory, itemsById, cfg, startBuffs }) {
    this.cfg = cfg; this.items = itemsById; this.inventory = { ...inventory }; this.turn = 1; this.over = null;
    const mk = (d, isPlayer) => ({ name: d.name, maxHp: d.hp, hp: Math.max(1, Math.min(d.hp, d.startHp ?? d.hp)), atk: d.atk, def: d.def, buffs: [], guard: false, isPlayer,
      skills: (d.skills || []).map(s => ({ def: s, cd: 0, uses: 0 })), skillChance: d.skillChance ?? 0.4 });
    this.player = mk(player, true); this.enemy = mk(enemy, false);
    this.player.buffs = (startBuffs || []).map(b => ({ ...b, turns: Infinity }));   // 從上一場帶來的「持續 N 場戰鬥」強化
  }
  stat(u, k) { return u[k] * u.buffs.filter(b => b.stat === k).reduce((m, b) => m * b.mult, 1); }
  calc(a, t, power) {
    const v = 1 + rnd(-this.cfg.damageVariance, this.cfg.damageVariance);
    let d = (this.stat(a, 'atk') * power - this.stat(t, 'def') * 0.5) * v;
    if (t.guard) d *= this.cfg.guardDamageMultiplier;
    return d;
  }
  async hit(src, tgt, power, mult, hooks) {
    const dmg = Math.max(1, Math.round(this.calc(src, tgt, power) * mult));
    tgt.hp = Math.max(0, tgt.hp - dmg);
    await hooks.emit({ type: 'hit', src, tgt, dmg });
  }
  addBuff(u, d) {
    const b = { stat: d.stat, mult: d.multiplier, turns: d.battles ? Infinity : d.turns };
    if (d.battles) b.battlesLeft = d.battles;
    u.buffs.push(b);
  }
  // 戰鬥結束後，要帶到下一場的「持續 N 場戰鬥」強化
  carryBuffs() { return this.player.buffs.filter(b => b.battlesLeft !== undefined).map(b => ({ stat: b.stat, mult: b.mult, battlesLeft: b.battlesLeft - 1 })).filter(b => b.battlesLeft > 0); }
  usable(slot) { return slot.cd <= 0 && (!slot.def.maxUses || slot.uses < slot.def.maxUses); }
  async buff(u, d, hooks) { this.addBuff(u, d); await hooks.emit({ type: 'buff', target: u, text: `${u.name} 的${STAT[d.stat] || ''}提升了！` }); }
  async heal(u, amount, hooks) {
    const a = Math.max(0, Math.min(u.maxHp - u.hp, Math.round(amount))); u.hp += a;
    await hooks.emit({ type: 'heal', target: u, amount: a });
  }

  async perform(u, t, sk, hooks) {
    await hooks.emit({ type: 'text', text: (sk.useText || '{user} 使用了 {skill}！').replace('{user}', u.name).replace('{skill}', sk.name) });
    if (sk.type === 'attack') {
      let mult = 1;
      if (sk.qte && !u.isPlayer) {
        const q = this.cfg.qte, ok = await hooks.qte(q);
        mult = ok ? q.successDamageMultiplier : q.failDamageMultiplier;
        await hooks.emit({ type: 'text', text: ok ? '成功應對！傷害降低了。' : '沒能應對……', fast: true });
      }
      for (let i = 0; i < (sk.hits || 1) && t.hp > 0; i++) await this.hit(u, t, sk.power ?? 1, mult, hooks);
    } else if (sk.type === 'heal') await this.heal(u, u.maxHp * (sk.healPercent || 0), hooks);
    else if (sk.type === 'buff') await this.buff(u, sk, hooks);
  }

  async playerTurn(action, hooks) {
    const P = this.player, E = this.enemy;
    if (action.type === 'attack') {
      await hooks.emit({ type: 'text', text: `${P.name} 發動攻擊！`, fast: true });
      await this.hit(P, E, 1, 1, hooks);
    } else if (action.type === 'skill') {
      const slot = P.skills.find(s => s.def.id === action.id);
      await this.perform(P, E, slot.def, hooks); slot.cd = (slot.def.cooldown || 0) + 1; slot.uses++;
    } else if (action.type === 'item') {
      const it = this.items.get(action.id); this.inventory[it.id]--;
      await hooks.emit({ type: 'text', text: `${P.name} 使用了 ${it.name}！` });
      if (it.type === 'heal') await this.heal(P, it.amount, hooks);
      else if (it.type === 'damage') { E.hp = Math.max(0, E.hp - it.amount); await hooks.emit({ type: 'hit', src: P, tgt: E, dmg: it.amount }); }
      else if (it.type === 'buff') await this.buff(P, it, hooks);
    } else if (action.type === 'guard') {
      P.guard = true; await hooks.emit({ type: 'guard', target: P });
      await hooks.emit({ type: 'text', text: `${P.name} 擺出了防禦姿態。`, fast: true });
    }
    if (E.hp <= 0) return this.finish('win', hooks);
    await this.enemyTurn(hooks);
    if (P.hp <= 0) return this.finish('lose', hooks);
    this.tick(); this.turn++;
  }
  async enemyTurn(hooks) {
    const E = this.enemy, P = this.player;
    const ready = E.skills.filter(s => this.usable(s));
    if (ready.length && Math.random() < E.skillChance) {
      let r = Math.random() * ready.reduce((a, s) => a + (s.def.weight ?? 1), 0), slot = ready[0];
      for (const s of ready) { r -= s.def.weight ?? 1; if (r <= 0) { slot = s; break; } }
      await this.perform(E, P, slot.def, hooks); slot.cd = (slot.def.cooldown || 0) + 1; slot.uses++;
    } else {
      await hooks.emit({ type: 'text', text: `${E.name} 發動攻擊！`, fast: true });
      await this.hit(E, P, 1, 1, hooks);
    }
  }
  tick() {
    for (const u of [this.player, this.enemy]) {
      u.buffs.forEach(b => b.turns--); u.buffs = u.buffs.filter(b => b.turns > 0);
      u.skills.forEach(s => { if (s.cd > 0) s.cd--; }); u.guard = false;
    }
  }
  async finish(result, hooks) {
    this.over = result;
    await hooks.emit({ type: 'text', text: result === 'win' ? `${this.enemy.name} 被擊倒了！` : `${this.player.name} 倒下了……` });
  }
}
