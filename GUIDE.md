# 修改指南 GUIDE（第一階段）

## 一、如何在自己電腦測試
瀏覽器不允許直接雙擊 index.html 讀取 JSON，需要「本機伺服器」。最簡單的方法：
1. 安裝免費的 **VS Code**，再安裝外掛 **Live Server**。
2. 用 VS Code 開啟 `game` 資料夾，對 `index.html` 按右鍵 →「Open with Live Server」。
3. 之後每次存檔，網頁會自動重新整理。

## 二、部署到 GitHub Pages
1. 建立 GitHub 儲存庫，把 `game` 資料夾內**所有內容**上傳到儲存庫根目錄。
2. 儲存庫 Settings → Pages → Source 選 main 分支 / root → Save。
3. 約一～兩分鐘後即可用公開網址進入。

## 三、填寫遊戲名稱與世界觀文字（`data/text.json`）
- `gameTitle`：遊戲名稱；`subtitle`：副標題。
- `worldIntro`：世界觀介紹，每一段用引號包起來、以逗號分隔，例如：`["第一段文字", "第二段文字"]`。
- `help`：遊戲說明，寫法同上。
- 留空時，畫面會顯示「尚未填寫」的提示，不會出錯。

## 四、新增素材致謝（`data/credits.json`）
複製一整組 `{ ... }` 貼在後面（兩組之間要有逗號），並修改內容：
- `type`：`background`（背景）、`ui`、`bgm`、`sfx`、`font`、`other`
- 必填：`name`（素材名稱）、`creator`（創作者）、`license`（授權方式）
- 選填：`url`（來源網址，需以 https:// 開頭）、`usage`（使用位置）、`modified`（修改情況）
- 請先刪除或修改範例那一筆。免費素材仍須遵守其署名與使用限制。

## 五、角色數量上限（`data/settings.json`）
`maxCharacters` 是玩家可保存的角色數量，可自行調整。

## 六、如何確認修改成功
1. 開啟 `tools/check.html`（同樣用 Live Server），所有項目顯示綠色 ✓ 即正常。
2. 若顯示紅色 ✗，訊息會說明哪個檔案、大約哪一行有問題。
3. 開啟遊戲主頁，到「素材使用與致謝」確認內容。

## 七、UI 換色與換字體
所有顏色、字體、圓角都集中在 `css/theme.css`，只改這個檔案即可整體換皮。

---

# 第二階段 A：角色素材（`data/parts.json`）

## 圖片規格
- **全部素材使用相同尺寸：512 × 768 px，透明背景 PNG。**（尺寸寫在 parts.json 最上方的 canvas，若要改，所有圖都要一起改）
- 每個部位直接畫在「角色完整畫布」的正確位置上，不要裁切，這樣程式才能直接疊起來。
- 角色**面朝右邊**（戰鬥時站在畫面左側、面對右邊的敵人）。
- 目前所有 `placeholder_` 開頭的圖片都是暫代色塊，正式圖畫好後用**相同檔名**覆蓋即可，或在 parts.json 改檔名。

## 三種上色模式（`mode`）
- `none`：不能上色（如嘴巴、固定紋樣）。
- `tint`：圖片畫成**灰階／淺色**，程式會乘上玩家選的顏色，陰影會保留。越接近白色越能呈現原色。
- `mask`：需要兩張圖：`file` 是完整圖，`maskFile` 是「可上色區域」（用純白色畫出要變色的地方，其餘透明）。

## 新增一個素材（例如新髮型）
1. 把圖片放進 `assets/characters/類別資料夾/`（例如 `hair_front/`）。
2. 打開 `data/parts.json`，複製 `parts` 裡的一組 `{ ... }` 貼在最後（記得逗號），修改：
   - `id`：不可與其他重複，建議 `類別_名稱`；**上線後請不要再改 id**，否則玩家舊存檔會找不到。
   - `category`：必須是 categories 裡已有的類別 id。
   - `name`：捏角畫面顯示的名稱。
   - `file`：圖片路徑；`mode`：none / tint / mask；`defaultColor`：預設顏色（`#rrggbb`）。
   - mode 是 mask 時加上 `maskFile`。
3. 重新整理遊戲，打開 `tools/check.html` 確認全部是綠色 ✓。

## 圖層上下順序（`categories` 的 `z`）
數字越大越在上層。例如前髮 60 在服裝 40 之上。想改順序，只要改這個數字。

## 類別設定
- `multi`：true 表示可同時選多個（如耳朵、角、頭部裝飾）。
- `optional`：true 表示可選「無」。
- `defaultOn`：true 表示新角色預設自動穿上該類別的第一個素材。

---

# 第二階段 B：自由度功能

## 捏角畫面怎麼用
- **選素材**後，下方「調整」區可改顏色、大小、水平／垂直位置、旋轉、左右翻轉。滑桿兩側的 − ＋ 是微調鈕（手機建議用這個）。電腦版也可以在預覽圖上按住滑鼠拖曳。
- **圖層**分頁：列出所有圖層，可往前／往後移、移除。耳朵、角、頭部裝飾可「鏡像複製」，用來做左右不對稱的配件（複製後可分別改顏色、位置）。
- 上方按鈕：復原、重做（電腦版也可用 Ctrl+Z／Ctrl+Y）、隨機造型、重設外觀。

## 左右眼分開上色（`parts.json`）
素材加上 `"splitX": 320` 就會出現「左眼／右眼」兩個顏色。數字是**圖片上左右眼分界的 x 座標**（以 512 寬的畫布計），畫好正式眼睛後請依實際位置修改。`splitLabels` 是顯示的名稱。

## 隨機造型的規則（`parts.json`）
- 類別 `randomChance`：可選類別被選中的機率（0～1，預設 0.6）。
- 類別 `colorGroup`：相同群組名稱的類別會用同一個隨機顏色（例如前髮、後髮都是 `"hair"`）。
- 類別 `randomColors`：該類別隨機顏色的候選清單（例如膚色）。
- 素材 `excludes`：隨機時，選了這個素材就不會同時出現清單中的素材 id 或類別 id，例如 `"excludes": ["horns", "ears_placeholder_cat"]`。
- 這些規則**只影響隨機**，玩家手動搭配不受限制。

---

# 第二階段 C：角色管理與存檔

## 玩家的資料存在哪裡
- 角色存在**玩家自己的瀏覽器**（localStorage），不會上傳到任何地方。換裝置、換瀏覽器、清除網站資料都會讓角色消失，所以遊戲會在「有角色且從未備份／超過 7 天沒備份」時於主選單和角色管理頁提醒玩家匯出備份。
- **匯出全部（備份）**會下載一個 `.json` 檔，內含所有角色與冒險進度；**匯出**（單一角色）只含該角色。
- **匯入**：永遠是「新增」角色，不會覆蓋原有角色。檔案格式不對、或含有已移除的素材，會用白話訊息說明，並盡量保留能用的部分。

## 身體只能改膚色
`data/parts.json` 的類別加上 `"transform": false`，該類別就只能改顏色，不能移動／縮放／旋轉。要開放就刪掉這一行或改成 true。

## 左右翻轉
已移除手動「左右翻轉」。只有「鏡像複製」（耳朵、角、頭部裝飾）會自動鏡像，用來做左右成對的配件。

## 角色資料欄位長度（`data/settings.json`）
`maxCharacters`（角色上限）、`nameMaxLength`、`identityMaxLength`、`bioMaxLength` 可自行調整。

## 改存檔格式的注意事項（給未來更新用）
`素材 id` 上線後請不要改名或刪除，否則玩家的舊角色會找不到那個素材（匯入／讀取時會略過並提示）。需要改存檔結構時，告訴我，我會加上遷移程式，保留舊存檔。

## 如果網址上打不開
1. 按 Ctrl+F5 強制重新整理（舊版快取是最常見原因，GitHub Pages 更新後可能要等一～十分鐘）。
2. 開啟 `你的網址/tools/check.html`，它會列出哪個檔案缺少。
3. GitHub 的檔名**區分大小寫**，資料夾結構也必須完整（`js/editor`、`js/ui`、`js/core`、`css`、`data`、`assets`）。
4. 還是不行：按 F12 → Console，把紅色文字貼給我。

---

# 第三階段：戰鬥系統

## 測試入口
目前沒有冒險流程，所以暫時從主選單「開始冒險」頁面下方的「戰鬥測試」進入：選角色、選敵人，按「開始戰鬥」。第四階段會由正式的冒險流程取代。

## 資料檔（全部都是「測試用」佔位資料，請自行修改）
**`data/enemies.json`**（敵人）：`id`、`name`、`image`（圖片路徑，放在 `assets/enemies/`）、`hp`、`atk`、`def`、`skills`（技能 id 清單）、`skillChance`（0～1，每回合使用技能的機率）、`boss`、`appearText`（出現時顯示的文字，可留空）。
**`data/skills.json`**（技能）：`type` 有三種：
- `attack`：需要 `power`（傷害倍率），可加 `hits`（連擊次數）、`qte: true`（敵人用的按鍵挑戰）。
- `heal`：需要 `healPercent`（0.3＝回復最大 HP 的 30%）。
- `buff`：需要 `stat`（atk 或 def）、`multiplier`、`turns`。
共同欄位：`cooldown`（用過後要隔幾回合）、`desc`（說明文字）、`useText`（使用時的文字，`{user}` 是使用者、`{skill}` 是技能名）、`enemyOnly: true`（只有敵人能用，不會出現在角色技能選單）。
**`data/items.json`**（道具）：`type` 為 `heal`＋`amount`、`damage`＋`amount`，或 `buff`＋`stat`／`multiplier`／`turns`。

## 戰鬥數值（`data/settings.json` 的 `battle`）
- `playerBase`：所有角色的初始 HP／攻擊／防禦（全部角色相同）；`playerGrowthPerLevel`：每升一級增加多少。
- `maxSkills`：每個角色最多選幾個技能；`defaultSkillCount`：沒選技能時，預設使用前幾個技能。
- `guardDamageMultiplier`：防禦時受到的傷害倍率；`damageVariance`：傷害浮動（0.1＝上下 10%）。
- `qte`：`letters` 可出現的字母、`keyCount` 按鍵數、`timeLimitMs` 時間限制、`successDamageMultiplier`／`failDamageMultiplier` 成功與失敗的傷害倍率。
- `testInventory`：測試戰鬥時角色帶的道具與數量。
- `background`：戰鬥背景圖片路徑（留空為預設色彩）。

## QTE 與設定
主選單「設定」可選 QTE 模式：一般／簡單／自動。電腦用鍵盤、手機點畫面上的字母按鈕。

## 戰鬥中查看狀態
按右上角「角色狀態」，戰鬥會**完全暫停**（含動畫與 QTE 計時），不消耗回合；關閉後繼續。

## 手機捏角
手機版捏角畫面的工具列（儲存、返回、復原、重做、隨機、重設）固定在畫面底部，往下捲動也能按。

---

# 第四階段：20 層試玩冒險

## 流程
主選單「開始冒險」→（第一次）開場對話 → 選擇角色與模式 → 樓層主頁 → 戰鬥 → 勝利後選一項戰利品 → 下一層。第 10、20 層是強敵，通過第 20 層即試玩通關。進度會在每層結束後自動保存，下次按「開始冒險」可以繼續。

## 開場對話（`data/intro.json`）
`lines` 裡每一組 `{}` 是一句話：`speaker` 說話者名稱（可留空）、`text` 內容、`bg` 背景圖片路徑（可留空，圖片放 `assets/backgrounds/`）。`text` 留空的句子會被略過；全部留空則直接進入選角。玩家看過一次後，之後會直接進選角畫面（選角畫面有「重看開場對話」）。若 `intro.json` 沒填、`text.json` 的 `worldIntro` 有填，會改用 `worldIntro` 的段落當對話。

## 樓層與敵人（`data/stages.json`，數值皆為測試用）
- `totalFloors`：總層數（目前 20）；`bossEvery`：每幾層一個強敵。
- `normalEnemies`：一般層從這份清單隨機出敵人；`bosses`：指定某層的強敵（`statMultiplier` 是該強敵的額外數值倍率）；`overrides`：指定某層固定出某敵人，例如 `[{"floor":5,"enemy":"enemy_test_a"}]`。
- `scaling`：每上一層，敵人 HP／攻擊／防禦增加的比例（0.08＝每層 +8%）。
- `leveling`：升級所需經驗、每場勝利獲得的經驗、等級上限。`restHealPercent`：每場勝利後回復最大 HP 的比例。
- `rewardCount`：戰利品選項數量。
- `modes`：兩個模式的名稱與說明文字（玩家看得到，請自行修改）。
- `achievements`：成就清單。`type` 為 `defeatBoss`（擊敗某層強敵）或 `reachFloor`（到達某層）。
- `clearTitle`、`clearBody`：通關畫面的標題與文字（留空會顯示簡單的預設文字）。

## 戰利品與道具（`data/items.json`）
道具加上 `"reward": true` 才會出現在戰利品；`weight` 是出現的權重。種類：
- `heal`／`damage`：戰鬥中使用的消耗品。
- `buff`：強化。`turns`＝持續幾回合；改用 `battles`＝持續幾場戰鬥（可跨戰鬥）。
- `passive`：持有型，本次冒險持續有效。需要 `stat`（atk／def／hp）與 `bonus`（增加的數值）。
`minFloor` 可限制某道具要到第幾層之後才出現。

## 強敵 QTE 次數
技能的 `maxUses` 限制「一場戰鬥最多使用幾次」（強敵的 QTE 技能目前是 3），`weight` 是敵人選技能時的權重（越大越常用）。想讓 QTE 更少，把 `maxUses` 改小、或把 `cooldown` 改大即可。

## 兩種模式的差別
- 標準模式：倒下後等級與道具歸零。
- 輕鬆模式：倒下後等級保留（玩家全域），道具歸零。
- 兩者都保留：角色外觀、成就、冒險紀錄。

## 說明
- 原本的「戰鬥測試」入口已移除，由正式的冒險流程取代。
- 原計畫的 `scaling.js`、`rewards.js`、`progression.js`、`modes.js` 合併成 `js/adventure/runManager.js`，功能相同，檔案比較少。
- 發佈新版本時，網址內的 `?v=4` 版本號（`index.html`）與所有 import 都會一起更新，用來避免瀏覽器使用舊快取。

---

# 補充（上傳、開場對話、HP 回復）

## 上傳到 GitHub 失敗時
- GitHub 網頁一次最多上傳 100 個檔案，而且**空檔案（0 KB）**有時會導致「Something went really wrong」。這個版本已經沒有空檔案，總共 67 個檔案。
- 建議分批上傳，每批都是「把資料夾直接拖進去」，這樣路徑會自動保留：
  1. 第一批：`assets` 資料夾。
  2. 第二批：`js` 資料夾。
  3. 第三批：`css`、`data`、`tools` 三個資料夾，加上 `index.html` 與 `GUIDE.md`。
- 每次上傳完按 Commit changes，再傳下一批。
- 如果還是失敗，換成 GitHub Desktop（免費）會穩定很多。
- `assets` 裡 `backgrounds`、`bgm`、`sfx`、`effects`、`items` 目前沒有檔案，所以 GitHub 上看不到這些資料夾，這是正常的。你之後放入第一個檔案時，上傳會自動建立資料夾。

## 開場對話怎麼多說幾句（`data/intro.json`）
`lines` 裡每一組 `{ }` 就是一句話，想多說幾句就複製一組貼在後面，**組與組之間要有逗號，最後一組後面不要逗號**：

```json
{
  "lines": [
    { "speaker": "說話者名稱", "text": "第一句內容", "bg": "" },
    { "speaker": "", "text": "第二句內容（沒有說話者就留空）", "bg": "" },
    { "speaker": "說話者名稱", "text": "第三句。\n想換行可以這樣寫。", "bg": "assets/backgrounds/某張圖.png" }
  ]
}
```
- `bg` 填了圖片路徑，從那一句開始會換成那張背景，之後的句子沿用，直到下一次換圖。
- 內容修改後，已經看過的玩家下次按「開始冒險」會自動再看一次。
- 改完用 `tools/check.html` 檢查格式。

## 每場戰鬥後的 HP 回復
`data/stages.json` 的 `modes` 裡，每個模式各有 `restHealPercent`：1＝完全回復，0.3＝回復最大 HP 的 30%，0＝不回復。目前輕鬆模式是 1，標準模式是 0.3。`deathText` 是倒下後顯示的說明文字，也可以自行修改。

## 重新整理頁面時
進度在「每層結束」才會保存。戰鬥進行到一半重新整理，會回到該層戰鬥開始前的狀態（HP、道具都是開始前的）。
