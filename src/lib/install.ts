// PWA install: capture the browser's install offer so we can show our own
// "Install LOKITA" button. Installed + push = real-app behaviour (reachable
// after opening once). iOS never fires this event — Apple requires the manual
// Share → Add to Home Screen flow, so we show a hint instead.
type InstallPromptEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function initInstallCapture(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    listeners.forEach((fn) => fn())
  })
}

export function onInstallable(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function canInstall(): boolean {
  return deferred !== null
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  deferred.prompt()
  const choice = await deferred.userChoice
  deferred = null
  return choice.outcome === 'accepted'
}

export const isIOS = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent)

export const isStandalone = (): boolean =>
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
  (navigator as unknown as { standalone?: boolean }).standalone === true
