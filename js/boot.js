// 開機診斷（舊瀏覽器也能執行，不使用模組）。遊戲啟動失敗時，列出找不到的檔案與錯誤訊息。
(function () {
  var FILES = ["index.html", "css/adventure.css", "css/base.css", "css/battle.css", "css/editor.css", "css/theme.css", "js/adventure/adventureUI.js", "js/adventure/runManager.js", "js/battle/battleEngine.js", "js/battle/battleUI.js", "js/battle/effects.js", "js/battle/qte.js", "js/core/dataLoader.js", "js/core/errors.js", "js/core/importExport.js", "js/core/migrations.js", "js/core/router.js", "js/core/storage.js", "js/editor/characterManager.js", "js/editor/editorPage.js", "js/editor/history.js", "js/editor/layerPanel.js", "js/editor/partsLibrary.js", "js/editor/randomizer.js", "js/editor/renderer.js", "js/editor/transformControls.js", "js/main.js", "js/ui/backupReminder.js", "js/ui/credits.js", "js/ui/dialogPage.js", "js/ui/dom.js", "js/ui/settingsPage.js", "js/ui/setupPage.js", "js/ui/statusPage.js", "data/credits.json", "data/enemies.json", "data/intro.json", "data/items.json", "data/parts.json", "data/settings.json", "data/skills.json", "data/stages.json", "data/text.json", "js/boot.js"];
  window.__FILES = FILES;
  function diagnose() {
    var out = document.getElementById('boot-missing');
    if (!out || !window.fetch) return;
    var missing = [], n = 0;
    FILES.forEach(function (f) {
      fetch(f, { cache: 'no-cache' }).then(function (r) { if (!r.ok) missing.push(f); })
        .catch(function () { missing.push(f); })
        .then(function () {
          if (++n === FILES.length) out.textContent = missing.length ? '找不到這些檔案：' + missing.join('、') : '所有檔案都找得到。若仍無法啟動，請把下方技術訊息告訴製作者。';
        });
    });
  }
  window.showBoot = function () {
    var w = document.getElementById('boot-warning');
    if (w) { w.hidden = false; diagnose(); }
  };
  window.addEventListener('error', function (e) {
    var d = document.getElementById('boot-detail');
    if (d && e.message) d.textContent = '技術訊息：' + e.message;
  });
  window.addEventListener('unhandledrejection', function (e) {
    var d = document.getElementById('boot-detail');
    if (d) d.textContent = '技術訊息：' + (e.reason && e.reason.message ? e.reason.message : e.reason);
  });
  setTimeout(function () { if (!window.__gameStarted) window.showBoot(); }, 2000);
})();
