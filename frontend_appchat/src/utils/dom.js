/**
 * Mount một page async vào #app
 * - Render HTML string trước
 * - Sau đó bind events (vì DOM phải tồn tại trước)
 */
export async function mountPage(pageFn) {
  const appEl = document.querySelector("#app")
  if (!appEl) return

  // 1. Render HTML
  const { html, bindEvents } = await pageFn()
  appEl.innerHTML = html

  // 2. Bind events SAU KHI HTML đã vào DOM
  if (typeof bindEvents === "function") {
    bindEvents()
  }
}
