import { useEffect, useState } from 'react'
import { useM } from './context'
import type { NotifRow, NotifType } from '../lib/api'
import { enableSystemAlerts, systemAlertsGranted, systemAlertsSupported } from '../lib/alerts'
import { enablePush, pushStatus, type PushStatus } from '../lib/push'
import { canInstall, onInstallable, promptInstall, isIOS, isStandalone } from '../lib/install'
import { useLang } from '../i18n'

const s2 = (children: React.ReactNode) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

interface TypeMeta {
  typeLabel: string
  filterLabel: string
  iconBg: string
  iconFg: string
  icon: React.ReactNode
}

const TYPE_META: Record<NotifType, TypeMeta> = {
  new_message: { typeLabel: 'MESSAGE', filterLabel: 'Messages', iconBg: '#DBE1EA', iconFg: '#3E5C86', icon: s2(<path d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1 1 21 11.5z" />) },
  item_update: { typeLabel: 'ITEM', filterLabel: 'Item Updates', iconBg: '#E4E5D3', iconFg: '#7E8154', icon: s2(<><path d="M8.5 9.5h7M8.5 13h4" /><path d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1 1 21 11.5z" /></>) },
  price_drop: { typeLabel: 'PRICE', filterLabel: 'Price Drops', iconBg: '#EBDDD2', iconFg: '#9C7458', icon: s2(<><path d="M23 18l-9.5-9.5-5 5L1 6" /><path d="M17 18h6v-6" /></>) },
  order_update: { typeLabel: 'ORDER', filterLabel: 'Order Updates', iconBg: '#E7F1EA', iconFg: '#1E9E5A', icon: s2(<><path d="M12 2 4 6v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6z" /><path d="M9 12l2 2 4-4" /></>) },
  system: { typeLabel: 'SYSTEM', filterLabel: 'System Updates', iconBg: '#ECE1DE', iconFg: '#9C6E6E', icon: s2(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>) },
}

const FILTERS: [string, string][] = [
  ['all', 'All'],
  ['new_message', 'Messages'],
  ['item_update', 'Item Updates'],
  ['price_drop', 'Price Drops'],
  ['order_update', 'Order Updates'],
  ['system', 'System'],
]

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

const timeGroup = (iso: string): 'TODAY' | 'YESTERDAY' | 'THIS WEEK' | 'OLDER' => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'OLDER'
  const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000)
  if (dayDiff <= 0) return 'TODAY'
  if (dayDiff === 1) return 'YESTERDAY'
  if (dayDiff < 7) return 'THIS WEEK'
  return 'OLDER'
}

const TIME_GROUPS = ['TODAY', 'YESTERDAY', 'THIS WEEK', 'OLDER'] as const

const timeAgo = (iso: string, t: (s: string) => string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return t('now')
  if (mins < 60) return mins + t('m')
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + t('h')
  const days = Math.floor(hrs / 24)
  return days + t('d')
}

export default function NotificationsView() {
  const { state, selectNotifFilter, markAllRead, openNotifTarget, removeAlert } = useM()
  const { t } = useLang()
  const s = state

  const [alertsOn, setAlertsOn] = useState(systemAlertsGranted())
  const [installable, setInstallable] = useState(canInstall())
  const [diag, setDiag] = useState<PushStatus | null>(null)
  const [diagOpen, setDiagOpen] = useState(false)
  const [howOpen, setHowOpen] = useState(false)
  useEffect(() => onInstallable(() => setInstallable(true)), [])
  useEffect(() => {
    if (diagOpen) pushStatus().then(setDiag)
  }, [diagOpen])

  const unread = (n: NotifRow) => !n.is_read
  const notifBadge = s.notifs.filter(unread).length
  const filtered = s.notifs.filter((n) => s.notifFilter === 'all' || n.type === s.notifFilter)
  const notifFilterLabel = s.notifFilter === 'all' ? 'notifications' : TYPE_META[s.notifFilter as NotifType].filterLabel.toLowerCase()

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', marginBottom: 6 }}>{t('STAY IN THE LOOP')}</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>{t('Notifications')}</h1>
        </div>
        {notifBadge > 0 && (
          <button className="lok-btn" onClick={markAllRead} style={{ border: '1px solid #D8D8D4', background: '#FFFFFF', color: '#1E1E1E', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 14px', borderRadius: 0, cursor: 'pointer', flex: 'none' }}>{t('Mark all read')}</button>
        )}
      </div>

      {/* system popup alerts — chime + vibration are always on; this adds the
          OS-level popup while the tab is in the background */}
      {systemAlertsSupported() && !alertsOn && (
        <button
          className="lok-btn"
          onClick={() =>
            enableSystemAlerts().then((ok) => {
              setAlertsOn(ok)
              // also register true Web Push (rings even when the site is closed);
              // silently skipped until the VAPID key is configured
              if (ok) enablePush()
            })
          }
          style={{ width: '100%', border: '1px solid #519BB8', background: '#EDF5F9', color: '#27607A', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '12px 14px', borderRadius: 0, cursor: 'pointer', marginBottom: 16, textAlign: 'left' }}
        >
          🔔 {t('Enable popup alerts — get pinged even when LOKITA is in another tab.')}
        </button>
      )}

      {/* install as an app — always offered until installed; when the browser
          won't volunteer its install prompt, show that browser's exact steps */}
      {!isStandalone() && (
        <div style={{ border: '1px solid #D8D8D4', background: '#FFFFFF', padding: '11px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 240px', fontSize: 12.5, fontWeight: 600, color: '#3A3B3E', lineHeight: 1.5 }}>
              📲 {t('Install LOKITA as an app — notifications work best that way, even with everything closed.')}
            </span>
            {installable ? (
              <button
                className="lok-btn"
                onClick={() => promptInstall().then((ok) => ok && setInstallable(false))}
                style={{ flex: 'none', border: 'none', background: 'var(--accent,#000000)', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 16px', borderRadius: 0, cursor: 'pointer' }}
              >
                {t('Install')}
              </button>
            ) : (
              <button
                className="lok-btn"
                onClick={() => setHowOpen((v) => !v)}
                style={{ flex: 'none', border: '1px solid #519BB8', background: '#EDF5F9', color: '#27607A', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 16px', borderRadius: 0, cursor: 'pointer' }}
              >
                {t('How to install')} {howOpen ? '▴' : '▾'}
              </button>
            )}
          </div>
          {howOpen && !installable && (
            <div style={{ marginTop: 10, borderTop: '1px solid #ECECEA', paddingTop: 10, fontSize: 12.5, color: '#3A3B3E', lineHeight: 1.8 }}>
              {isIOS() ? (
                <>
                  <b>iPhone (Safari)</b>
                  <br />1. {t('Tap the Share button')} <span style={{ fontFamily: "'Spline Sans Mono',monospace" }}>⎋</span> {t('(square with an arrow, bottom of the screen)')}
                  <br />2. {t('Scroll down and tap')} <b>{t('Add to Home Screen')}</b>
                  <br />3. {t('Tap Add — then always open LOKITA from the new icon')}
                </>
              ) : (
                <>
                  <b>Chrome</b>: {t('tap the')} <b>⋮</b> {t('menu (top right)')} → <b>{t('Add to Home screen / Install app')}</b>
                  <br />
                  <b>Samsung Internet</b>: {t('tap')} <b>☰</b> {t('(bottom right)')} → <b>{t('Add page to')}</b> → <b>{t('Home screen')}</b>
                  <br />
                  {t('Then always open LOKITA from the new icon on your home screen.')}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* self-diagnosis — which link of the push chain is broken on THIS device */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setDiagOpen((v) => !v)} className="lok-navi" style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Spline Sans Mono',monospace", fontSize: 10.5, color: '#8B8B86', padding: 0, letterSpacing: '.05em' }}>
          🔧 {t('Check notification status')} {diagOpen ? '▴' : '▾'}
        </button>
        {diagOpen && (
          <div style={{ marginTop: 8, border: '1px solid #D8D8D4', background: '#FFFFFF', padding: '10px 14px', fontSize: 12.5, fontWeight: 600, color: '#3A3B3E', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!diag ? (
              <span style={{ color: '#8B8B86' }}>…</span>
            ) : (
              <>
                <span>{diag.swSupported && diag.pushManager ? '✅' : '❌'} {t('This browser supports push')}</span>
                <span>{diag.keyLoaded ? '✅' : '❌'} {t('Push key loaded in this build')}{!diag.keyLoaded && ' — Vercel env + Redeploy missing'}</span>
                <span>{diag.permission === 'granted' ? '✅' : '❌'} {t('Notification permission granted')} ({diag.permission})</span>
                <span>{diag.subscribed ? '✅' : '❌'} {t('This device is registered')}</span>
                <span>{diag.dbRows > 0 ? '✅' : '❌'} {t('Saved to your account')} ({diag.dbRows >= 0 ? diag.dbRows : '?'})</span>
                <button onClick={() => enablePush().then(() => pushStatus().then(setDiag))} className="lok-btn" style={{ alignSelf: 'flex-start', marginTop: 4, border: '1px solid #519BB8', background: '#EDF5F9', color: '#27607A', fontFamily: 'inherit', fontWeight: 700, fontSize: 11.5, padding: '7px 12px', borderRadius: 0, cursor: 'pointer' }}>
                  {t('Re-register this device')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* saved-search alerts — searches that ping you when a match is posted.
          Created from the "Alert me" button on an empty search result. */}
      {s.alerts.length > 0 && (
        <div style={{ border: '1px solid #D8D8D4', background: '#FFFFFF', padding: '11px 14px', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: '.08em', color: '#8B8B86', marginBottom: 8 }}>
            🔔 {t('MY SEARCH ALERTS')} · {s.alerts.length}/10
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {s.alerts.map((a) => (
              <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid #BFDCE8', background: '#EDF5F9', color: '#2F6B85', fontSize: 12, fontWeight: 700, padding: '6px 10px' }}>
                "{a.query}"
                <button onClick={() => removeAlert(a.id)} title={t('Delete alert')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2F6B85', fontWeight: 800, fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 500, marginTop: 8 }}>
            {t("You'll get a notification (and a buzz) the moment someone posts a match. Search for something and tap “Alert me” to add more.")}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTERS.map(([key, label]) => {
          const active = s.notifFilter === key
          const count = key === 'all' ? notifBadge : s.notifs.filter((n) => n.type === key && unread(n)).length
          return (
            <button key={key} onClick={() => selectNotifFilter(key)} className="lok-chip" style={{ cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5, padding: '8px 13px', borderRadius: 0, border: `1px solid ${active ? '#000000' : '#D8D8D4'}`, background: active ? '#000000' : '#FFFFFF', color: active ? '#F7F3EA' : '#3A3B3E', display: 'flex', alignItems: 'center', gap: 6 }}>
              {t(label)}
              {count > 0 && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, opacity: 0.7 }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {s.notifsLoading && s.notifs.length === 0 ? (
        <div style={{ height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 24, height: 24, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : filtered.length > 0 ? (
        <div>
          {TIME_GROUPS.map((g) => ({ g, items: filtered.filter((n) => timeGroup(n.created_at) === g) }))
            .filter(({ items }) => items.length > 0)
            .map(({ g, items }, gi) => (
              <div key={g}>
                <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: '#9A9A94', margin: gi === 0 ? '0 0 8px' : '18px 0 8px' }}>{t(g)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((n) => {
                    const m = TYPE_META[n.type]
                    const u = unread(n)
                    return (
              <div key={n.id} onClick={() => openNotifTarget(n)} className="lok-btn" style={{ cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start', background: u ? '#FFFFFF' : '#F5F0E6', border: `1px solid ${u ? '#C9C9C5' : '#E6E6E3'}`, borderRadius: 0, padding: '15px 17px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 0, background: m.iconBg, color: m.iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{m.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#000000' }}>{n.title}</div>
                    <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 600, color: m.iconFg, background: m.iconBg, padding: '2px 6px', borderRadius: 0, flex: 'none', letterSpacing: '.04em' }}>{t(m.typeLabel)}</span>
                  </div>
                  {n.body && <div style={{ fontSize: 13, color: '#5F6063', lineHeight: 1.45, marginTop: 3 }}>{n.body}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flex: 'none' }}>
                  <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94' }}>{timeAgo(n.created_at, t)}</span>
                  {u && <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4562F' }} />}
                </div>
              </div>
            )
                  })}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#8B8B86', padding: '60px 20px', background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🔔</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 18, color: '#000000', marginBottom: 6 }}>{t("You're all caught up")}</div>
          <div style={{ fontSize: 13.5 }}>{t(`No ${notifFilterLabel} yet.`)} {t("You'll be notified here when someone messages you, an order updates, or a saved item drops in price.")}</div>
        </div>
      )}
    </div>
  )
}
