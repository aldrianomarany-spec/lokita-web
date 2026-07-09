import { useM } from './context'
import { NOTIFS } from '../data'
import type { Notif, NotifType } from '../types'

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
  message: { typeLabel: 'MESSAGE', filterLabel: 'Messages', iconBg: '#DBE1EA', iconFg: '#3E5C86', icon: s2(<path d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1 1 21 11.5z" />) },
  item: { typeLabel: 'ITEM', filterLabel: 'Item Updates', iconBg: '#E4E5D3', iconFg: '#7E8154', icon: s2(<><path d="M8.5 9.5h7M8.5 13h4" /><path d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1 1 21 11.5z" /></>) },
  price: { typeLabel: 'PRICE', filterLabel: 'Price Drops', iconBg: '#EBDDD2', iconFg: '#9C7458', icon: s2(<><path d="M23 18l-9.5-9.5-5 5L1 6" /><path d="M17 18h6v-6" /></>) },
  order: { typeLabel: 'ORDER', filterLabel: 'Order Updates', iconBg: '#E7F1EA', iconFg: '#1B7A4B', icon: s2(<><path d="M12 2 4 6v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6z" /><path d="M9 12l2 2 4-4" /></>) },
  system: { typeLabel: 'SYSTEM', filterLabel: 'System Updates', iconBg: '#ECE1DE', iconFg: '#9C6E6E', icon: s2(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>) },
}

const FILTERS: [string, string][] = [
  ['all', 'All'],
  ['message', 'Messages'],
  ['item', 'Item Updates'],
  ['price', 'Price Drops'],
  ['order', 'Order Updates'],
  ['system', 'System'],
]

export default function NotificationsView() {
  const { state, selectNotifFilter, markAllRead, openNotifTarget } = useM()
  const s = state

  const isUnread = (n: Notif) => n.unread && !s.notifRead[n.id]
  const notifBadge = NOTIFS.filter(isUnread).length
  const filtered = NOTIFS.filter((n) => s.notifFilter === 'all' || n.type === s.notifFilter)
  const notifFilterLabel = s.notifFilter === 'all' ? 'notifications' : TYPE_META[s.notifFilter as NotifType].filterLabel.toLowerCase()

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', letterSpacing: '.08em', marginBottom: 6 }}>STAY IN THE LOOP</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>Notifications</h1>
        </div>
        {notifBadge > 0 && (
          <button className="lok-btn" onClick={markAllRead} style={{ border: '1px solid #E4DDCE', background: '#FBF8F1', color: '#3A362C', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 14px', borderRadius: 11, cursor: 'pointer', flex: 'none' }}>Mark all read</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTERS.map(([key, label]) => {
          const active = s.notifFilter === key
          const count = key === 'all' ? notifBadge : NOTIFS.filter((n) => n.type === key && isUnread(n)).length
          return (
            <button
              key={key}
              onClick={() => selectNotifFilter(key)}
              className="lok-chip"
              style={{ cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5, padding: '8px 13px', borderRadius: 20, border: `1px solid ${active ? '#201E18' : '#E4DDCE'}`, background: active ? '#201E18' : '#FBF8F1', color: active ? '#F7F3EA' : '#4A463B', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {label}
              {count > 0 && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, opacity: 0.7 }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((n) => {
            const m = TYPE_META[n.type]
            const u = isUnread(n)
            return (
              <div
                key={n.id}
                onClick={() => openNotifTarget(n)}
                className="lok-btn"
                style={{ cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start', background: u ? '#FBF8F1' : '#F5F0E6', border: `1px solid ${u ? '#D8CFBB' : '#EEE7D8'}`, borderRadius: 16, padding: '15px 17px' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 11, background: m.iconBg, color: m.iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{m.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#201E18' }}>{n.title}</div>
                    <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 600, color: m.iconFg, background: m.iconBg, padding: '2px 6px', borderRadius: 5, flex: 'none', letterSpacing: '.04em' }}>{m.typeLabel}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6F6A5C', lineHeight: 1.45, marginTop: 3 }}>{n.body}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flex: 'none' }}>
                  <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B' }}>{n.ago}</span>
                  {u && <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4562F' }} />}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#8A8578', padding: '60px 20px', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 20 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 18, color: '#201E18', marginBottom: 6 }}>You're all caught up</div>
          <div style={{ fontSize: 13.5 }}>No {notifFilterLabel} to show right now.</div>
        </div>
      )}
    </div>
  )
}
