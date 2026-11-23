import { loadAll, DataError } from './core/dataLoader.js?v=5';
import { showError, initErrorBox } from './core/errors.js?v=5';
import { initRouter, showPage } from './core/router.js?v=5';
import { loadSave, writeSave } from './core/storage.js?v=5';
import { renderCredits } from './ui/credits.js?v=5';
import { renderReminder } from './ui/backupReminder.js?v=5';
import { renderStatus } from './ui/statusPage.js?v=5';
import { renderSettings } from './ui/settingsPage.js?v=5';
import { playDialog } from './ui/dialogPage.js?v=5';
import { renderSetup } from './ui/setupPage.js?v=5';
import { PartsLibrary } from './editor/partsLibrary.js?v=5';
import { initEditor } from './editor/editorPage.js?v=5';
import { createManager } from './editor/characterManager.js?v=5';
import { createBattleScreen } from './battle/battleUI.js?v=5';
import { getPlayerStats, resolveSkills } from './battle/battleEngine.js?v=5';
import { createAdventure } from './adventure/adventureUI.js?v=5';

const $ = id => document.getElementById(id);
function fillParagraphs(el, arr, emptyMsg) {
  el.textContent = '';
  if (!arr.some(s => s.trim())) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = emptyMsg; el.append(p); return; }
  arr.forEach(s => { const p = document.createElement('p'); p.textContent = s; el.append(p); });
}

async function start() {
  window.__gameStarted = true;
  $('boot-loading')?.remove();
  initErrorBox(); initRouter(); showPage('menu');
  try {
    const data = await loadAll();
    const t = data.text, settings = data.settings, cfg = settings.battle, stages = data.stages;
    document.title = t.gameTitle || '網頁小遊戲';
    $('game-title').textContent = t.gameTitle || '（遊戲名稱待填寫）';
    $('game-subtitle').textContent = t.subtitle || '';
    fillParagraphs($('help-body'), t.help || [], '（遊戲說明尚未填寫，請編輯 data/text.json 的 help）');
    renderCredits(data.credits, $('credits-list'));
    window.GAME_DATA = data;

    const lib = new PartsLibrary(data.parts);
    const itemsById = new Map(data.items.map(i => [i.id, i]));
    const limits = { name: settings.nameMaxLength || 20, identity: settings.identityMaxLength || 30, bio: settings.bioMaxLength || 300 };
    const loaded = loadSave(), save = loaded.save;
    if (loaded.warning) showError('存檔提醒', '', loaded.warning);
    try { navigator.storage?.persist?.(); } catch (_) {}
    const persist = () => { const r = writeSave(save); if (!r.ok) showError('無法儲存', '', r.message); return r.ok; };

    let manager, adventure, editorReturn = 'characters';
    const setupState = { charId: null, mode: 'standard' };
    const toMenu = () => { refreshReminders(); showPage('menu'); };
    const toSetup = () => showPage('setup');
    const refreshReminders = () => {
      renderReminder($('backup-reminder-menu'), save, () => showPage('characters'), '前往備份');
      renderReminder($('backup-reminder-chars'), save, () => manager.exportAll(), '立即匯出備份');
    };
    const openStatus = (ch, info, backTo) => {
      renderStatus($('status-root'), ch, lib, save, info);
      $('status-back').dataset.go = backTo; $('status-back').textContent = backTo === 'adventure' ? '返回冒險' : '返回角色管理';
      showPage('status');
    };

    const editor = initEditor($('editor-root'), lib, { limits, skills: data.skills, maxSkills: cfg.maxSkills || 4,
      onSave: ch => { const ok = manager.saveCharacter(ch); if (ok) setupState.charId = ch.id; return ok; },
      onExit: () => { const to = editorReturn; editorReturn = 'characters'; if (to === 'characters') manager.render(); showPage(to); } });

    const run = save.currentRun;
    const normalInfo = ch => {
      const lv = run && run.mode === 'standard' ? run.level : save.shared.level, s = getPlayerStats(cfg, lv);
      return { level: lv, stats: { hp: s.hp, maxHp: s.hp, atk: s.atk, def: s.def }, skillNames: resolveSkills(ch, data.skills, cfg).map(k => k.name),
        achievementNames: save.shared.unlocks.achievements.map(id => stages.achievements.find(a => a.id === id)?.name).filter(Boolean) };
    };
    manager = createManager({ lib, settings, limits, save, persist, root: $('characters-root'), noticeEl: $('char-notice'),
      openEditor: ch => { editorReturn = 'characters'; editor.open(ch); showPage('editor'); },
      openStatus: ch => openStatus(ch, normalInfo(ch), 'characters'), onChange: refreshReminders });

    const battleScreen = createBattleScreen({ root: $('battle-root'), lib, cfg, itemsById,
      getQteMode: () => save.settings.qteMode || 'normal',
      renderStatus: (box, battle, opts) => renderStatus(box, opts.character, lib, save, {
        level: opts.level,
        stats: { hp: battle.player.hp, maxHp: battle.player.maxHp, atk: Math.round(battle.stat(battle.player, 'atk')), def: Math.round(battle.stat(battle.player, 'def')) },
        skillNames: battle.player.skills.map(s => s.def.name + (s.cd > 0 ? `（冷卻 ${s.cd}）` : '')),
        itemLines: Object.entries(battle.inventory).filter(([id, n]) => n > 0 && itemsById.has(id)).map(([id, n]) => `${itemsById.get(id).name}×${n}`) }) });

    adventure = createAdventure({ root: $('adventure-root'), lib, data, save, persist, showPage, battleScreen, openStatus,
      createBlank: () => manager.createBlank(), toSetup, toMenu });

    // 開場對話：沒有填 intro.json 時，沿用 text.json 的 worldIntro
    const introLines = data.intro.lines.some(l => l.text && l.text.trim()) ? data.intro.lines : t.worldIntro.map(text => ({ text }));
    const hasIntro = introLines.some(l => l.text && l.text.trim());
    // 開場內容有修改時，玩家會自動再看一次
    const introKey = String([...JSON.stringify(introLines)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7));
    const playIntro = () => { showPage('dialog'); playDialog($('dialog-root'), introLines, { onDone: () => { if (save.settings.introSeen !== introKey) { save.settings.introSeen = introKey; persist(); } toSetup(); } }); };
    $('btn-start').addEventListener('click', () => {
      if (save.currentRun) adventure.resume();
      else if (hasIntro && save.settings.introSeen !== introKey) playIntro();
      else toSetup();
    });

    document.addEventListener('game:pageshow', ev => {
      if (ev.detail === 'characters') manager.render();
      if (ev.detail === 'settings') renderSettings($('settings-root'), save, persist);
      if (ev.detail === 'setup') renderSetup($('setup-root'), { save, lib, stages, state: setupState, hasIntro,
        onCreate: () => { editorReturn = 'setup'; editor.open(manager.newCharacter()); showPage('editor'); },
        onStart: (charId, mode) => { if (!adventure.begin(mode, charId)) showError('無法開始', '', '角色數量已達上限，無法自動建立新角色。請先到「角色管理」刪除不需要的角色，或選擇現有角色。'); },
        onReplay: playIntro, onBack: toMenu });
    });
    refreshReminders();
  } catch (e) {
    if (e instanceof DataError) showError('資料檔有問題，遊戲無法正常啟動', e.file, e.message);
    else showError('發生未預期的錯誤', '', String(e.message || e));
    console.error(e);
  }
}
start();
