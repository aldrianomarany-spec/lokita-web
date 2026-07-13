// Dark mode (beta): a filter-based inversion — tiny, zero redesign cost.
// The whole UI inverts; photos/videos are re-inverted so they stay natural.
const KEY = 'lokita_dark'

export function isDark(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function applyDark(on: boolean): void {
  document.documentElement.dataset.theme = on ? 'dark' : ''
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // private mode — won't persist
  }
}

export function initDark(): void {
  if (isDark()) document.documentElement.dataset.theme = 'dark'
}
