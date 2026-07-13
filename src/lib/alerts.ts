// Notification alerts: a two-tone chime (WebAudio — no sound file needed),
// phone vibration, and a system popup via the browser Notification API when
// the user has granted permission (shown only while the tab is hidden, so it
// never doubles up with the in-app toast).
// True background push (app fully closed) needs a push server — future work.

export function ringNotification(title?: string, body?: string | null): void {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const ding = (freq: number, at: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at)
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.45)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + at)
      osc.stop(ctx.currentTime + at + 0.5)
    }
    ding(880, 0)
    ding(1174.66, 0.13)
    window.setTimeout(() => void ctx.close().catch(() => {}), 1200)
  } catch {
    // audio blocked (no user gesture yet / muted tab) — vibration may still fire
  }
  try {
    navigator.vibrate?.(150)
  } catch {
    // not a phone
  }
  try {
    if (title && 'Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      new Notification(title, { body: body || undefined, icon: '/icon-192.png' })
    }
  } catch {
    // Notification constructor can throw on some mobile browsers — chime already played
  }
}

export function systemAlertsSupported(): boolean {
  return 'Notification' in window
}

export function systemAlertsGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

export async function enableSystemAlerts(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}
