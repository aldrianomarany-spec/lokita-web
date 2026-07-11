import { useM } from './context'
import type { NotifRow, NotifType } from '../lib/api'

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

const timeAgo = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return mins + 'm'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h'
  const days = Math.floor(hrs / 24)
  return days + 'd'
}

export default function NotificationsView() {
  const { state, selectNotifFilter, markAllRead, openNotifTarget } = useM()
  const s = state

  const unread = (n: NotifRow) => !n.is_read
  const notifBadge = s.notifs.filter(unread).length
  const filtered = s.notifs.filter((n) => s.notifFilter === 'all' || n.type === s.notifFilter)
  const notifFilterLabel = s.notifFilter === 'all' ? 'notifications' : TYPE_META[s.notifFilter as NotifType].filterLabel.toLowerCase()

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', marginBottom: 6 }}>STAY IN THE LOOP</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>Notifications</h1>
        </div>
        {notifBadge > 0 && (
          <button className="lok-btn" onClick={markAllRead} style={{ border: '1px solid #D8D8D4', background: '#FFFFFF', color: '#2A2B2E', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 14px', borderRadius: 0, cursor: 'pointer', flex: 'none' }}>Mark all read</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTERS.map(([key, label]) => {
          const active = s.notifFilter === key
          const count = key === 'all' ? notifBadge : s.notifs.filter((n) => n.type === key && unread(n)).length
          return (
            <button key={key} onClick={() => selectNotifFilter(key)} className="lok-chip" style={{ cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5, padding: '8px 13px', borderRadius: 0, border: `1px solid ${active ? '#17181A' : '#D8D8D4'}`, background: active ? '#17181A' : '#FFFFFF', color: active ? '#F7F3EA' : '#3A3B3E', display: 'flex', alignItems: 'center', gap: 6 }}>
              {label}
              {count > 0 && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, opacity: 0.7 }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {s.notifsLoading && s.notifs.length === 0 ? (
        <div style={{ height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 24, height: 24, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((n) => {
            const m = TYPE_META[n.type]
            const u = unread(n)
            return (
              <div key={n.id} onClick={() => openNotifTarget(n)} className="lok-btn" style={{ cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start', background: u ? '#FFFFFF' : '#F5F0E6', border: `1px solid ${u ? '#C9C9C5' : '#E6E6E3'}`, borderRadius: 0, padding: '15px 17px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 0, background: m.iconBg, color: m.iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{m.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#17181A' }}>{n.title}</div>
                    <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 600, color: m.iconFg, background: m.iconBg, padding: '2px 6px', borderRadius: 0, flex: 'none', letterSpacing: '.04em' }}>{m.typeLabel}</span>
                  </div>
                  {n.body && <div style={{ fontSize: 13, color: '#5F6063', lineHeight: 1.45, marginTop: 3 }}>{n.body}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flex: 'none' }}>
                  <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94' }}>{timeAgo(n.created_at)}</span>
                  {u && <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4562F' }} />}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#8B8B86', padding: '60px 20px', background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🔔</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 18, color: '#17181A', marginBottom: 6 }}>You're all caught up</div>
          <div style={{ fontSize: 13.5 }}>No {notifFilterLabel} yet. You'll be notified here when someone messages you, an order updates, or a saved item drops in price.</div>
        </div>
      )}
    </div>
  )
}
