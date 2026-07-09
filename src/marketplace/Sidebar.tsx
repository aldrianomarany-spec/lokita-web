import { useM } from './context'
import { CATEGORIES, CAT_META, CAT_DOT, type Category } from '../theme'

export default function Sidebar() {
  const { state, selectCat } = useM()
  const s = state
  const counts = s.categoryCounts
  const totalCount = Object.values(counts).reduce((a, n) => a + n, 0)

  return (
    <aside
      className="lok-sidebar"
      style={{ width: 236, flex: 'none', background: '#FBF8F1', borderRight: '1px solid #E4DDCE', padding: '20px 15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}
    >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 800, marginBottom: 7, color: '#fff' }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2.4 1.8 3-.2 1 2.8 2.6 1.5-.7 2.9L23 12l-1.7 2.4.7 2.9-2.6 1.5-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L2.7 16.3l.7-2.9L1 12l1.7-2.4L2 6.7l2.6-1.5 1-2.8 3 .2z" /></svg>
          Dorm-Verified trading
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.55, color: '#C6DDD2' }}>Every seller is a checked-in student. Pay in-app, pick up at the Security Post — no risky meetups.</div>
      </div>
    </aside>
  )
}
