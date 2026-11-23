// 頁面切換：index.html 內 <section data-page="名稱">，按鈕用 data-go="名稱"
export function showPage(name) {
  let found = false;
  document.querySelectorAll('[data-page]').forEach(p => {
    const on = p.dataset.page === name;
    p.hidden = !on;
    if (on) found = true;
  });
  if (found) { window.scrollTo(0, 0); document.dispatchEvent(new CustomEvent('game:pageshow', { detail: name })); }
  return found;
}
export function initRouter() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) showPage(b.dataset.go);
  });
}
