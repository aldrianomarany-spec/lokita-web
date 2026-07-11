import { useM } from './context'
import { CATEGORIES, CAT_META, CAT_DOT, type Category } from '../theme'
import { MASCOT_URL } from '../brand'

export default function Sidebar() {
  const { state, selectCat, openRequests, openPeople, openAdmin } = useM()
  const s = state
  const counts = s.categoryCounts
  const totalCount = Object.values(counts).reduce((a, n) => a + n, 0)

  return (
    <aside
      className="lok-sidebar"
      style={{ width: 236, flex: 'none', background: '#F5F5F3', borderRight: '1px solid #D8D8D4', padding: '20px 15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <div>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', padding: '0 11px 9px', letterSpacing: '.1em' }}>COMMUNITY</div>
        <button
          onClick={openRequests}
          className="lok-navi"
          style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 11, background: s.view === 'requests' ? '#EAF1EC' : 'transparent', color: s.view === 'requests' ? '#12503A' : '#4A463B', marginBottom: 2 }}
        >
          <span style={{ width: 26, height: 26, borderRadius: 8, background: '#E7EEF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>🙋</span>
          <span style={{ flex: 1 }}>Requests</span>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#B7AF9C', fontWeight: 500 }}>WANTED</span>
        </button>
        {!s.guest && (
          <button
            onClick={openPeople}
            className="lok-navi"
            style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 11, background: s.view === 'people' ? '#EAF1EC' : 'transparent', color: s.view === 'people' ? '#12503A' : '#4A463B', marginBottom: 2 }}
          >
            <span style={{ width: 26, height: 26, borderRadius: 8, background: '#E7F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>👋</span>
            <span style={{ flex: 1 }}>People</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#1B7A4B', fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3DBB6E' }} />
              {s.onlineIds.length}
            </span>
          </button>
        )}
        {/* only rendered for role='admin' — RLS guards the data either way */}
        {!s.guest && s.profile.role === 'admin' && (
          <button
            onClick={openAdmin}
            className="lok-navi"
            style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 11, background: s.view === 'admin' ? '#EAF1EC' : 'transparent', color: s.view === 'admin' ? '#12503A' : '#4A463B', marginBottom: 2 }}
          >
            <span style={{ width: 26, height: 26, borderRadius: 8, background: '#F1E4E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>🛡️</span>
            <span style={{ flex: 1 }}>Admin</span>
            {s.openReports > 0 ? (
              <span title={`${s.openReports} open report${s.openReports > 1 ? 's' : ''}`} style={{ minWidth: 19, height: 19, borderRadius: 10, background: '#D4562F', color: '#FBF8F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, fontWeight: 700, padding: '0 5px' }}>{s.openReports}</span>
            ) : (
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#B7AF9C', fontWeight: 500 }}>STAFF</span>
            )}
          </button>
        )}
      </div>

      <div>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', padding: '0 11px 9px', letterSpacing: '.1em' }}>CATEGORIES</div>
        {CATEGORIES.map((label: Category) => {
          const active = s.cat === label && !s.savedOnly
          const count = label === 'All' ? totalCount : counts[label] || 0
          return (
            <button
              key={label}
              onClick={() => selectCat(label)}
              className="lok-navi"
              style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 11, background: active ? '#EAF1EC' : 'transparent', color: active ? '#12503A' : '#4A463B', marginBottom: 2 }}
            >
              <span style={{ width: 26, height: 26, borderRadius: 8, background: CAT_DOT[label], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>{CAT_META[label]}</span>
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: active ? '#4A8067' : '#B7AF9C', fontWeight: 500 }}>{count}</span>
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 'auto', background: 'var(--accent,#2A5FA8)', borderRadius: 18, padding: 17, color: '#EAF3EE', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
        {MASCOT_URL && <img src={MASCOT_URL} alt="" aria-hidden className="lok-mascot" style={{ position: 'absolute', right: -8, bottom: -12, width: 74, opacity: 0.95, transform: 'rotate(6deg)' }} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 800, marginBottom: 7, color: '#fff' }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2.4 1.8 3-.2 1 2.8 2.6 1.5-.7 2.9L23 12l-1.7 2.4.7 2.9-2.6 1.5-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L2.7 16.3l.7-2.9L1 12l1.7-2.4L2 6.7l2.6-1.5 1-2.8 3 .2z" /></svg>
          Dorm-Verified trading
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.55, color: '#C6DDD2' }}>Every seller is a checked-in student. Pay in-app, pick up at the Security Post — no risky meetups.</div>
      </div>
    </aside>
  )
}
