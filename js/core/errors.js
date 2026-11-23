// 白話錯誤訊息視窗
export function showError(title, file, msg) {
  document.getElementById('error-title').textContent = title;
  document.getElementById('error-file').textContent = file ? `出問題的檔案：${file}` : '';
  document.getElementById('error-msg').textContent = msg;
  document.getElementById('error-box').hidden = false;
}
export function initErrorBox() {
  document.getElementById('error-close').addEventListener('click', () => {
    document.getElementById('error-box').hidden = true;
  });
}
