// True Web Push: register the service worker, subscribe this browser with the
// site's VAPID public key, and save the subscription so the server
// (api/push/send.js) can ping this device even when LOKITA is fully closed.
// Fails soft everywhere — if VITE_VAPID_PUBLIC_KEY isn't configured yet, the
// in-tab chime/popup alerts still work and this is simply skipped.
import { supabase } from './supabase'

const VAPID_PUBLIC = ((import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || '').trim()

export function pushSupported(): boolean {
  return !!VAPID_PUBLIC && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function b64ToUint8(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const b64 = (base64url + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) return false
    const reg = await navigator.serviceWorker.register('/sw.js')
    const sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID_PUBLIC).buffer as ArrayBuffer }))
    const j = sub.toJSON()
    if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return false
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ endpoint: j.endpoint, user_id: u.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth })
    return !error
  } catch {
    return false
  }
}

// Logout hygiene: remove THIS device's subscription so a shared computer
// stops receiving someone's pushes after they sign out.
export async function disablePushForThisDevice(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  } catch {
    // best effort — worst case the next push to this endpoint gets pruned by the sender
  }
}

// One-look diagnostics for the Notifications page — pinpoints which link in
// the push chain is broken on THIS device.
export interface PushStatus {
  keyLoaded: boolean // VAPID public key baked into this build (Vercel env + redeploy)
  swSupported: boolean
  pushManager: boolean
  permission: string
  subscribed: boolean // this browser holds a push subscription
  dbRows: number // subscriptions saved for the logged-in account (-1 = check failed)
}

export async function pushStatus(): Promise<PushStatus> {
  const keyLoaded = !!VAPID_PUBLIC
  const swSupported = 'serviceWorker' in navigator
  const pushManager = 'PushManager' in window
  const permission = 'Notification' in window ? Notification.permission : 'unsupported'
  let subscribed = false
  try {
    const reg = swSupported ? await navigator.serviceWorker.getRegistration() : undefined
    subscribed = !!(await reg?.pushManager.getSubscription())
  } catch {
    // stays false
  }
  let dbRows = -1
  try {
    const { count, error } = await supabase.from('push_subscriptions').select('endpoint', { count: 'exact', head: true })
    if (!error) dbRows = count ?? 0
  } catch {
    // stays -1
  }
  return { keyLoaded, swSupported, pushManager, permission, subscribed, dbRows }
}
