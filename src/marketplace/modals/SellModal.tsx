import { useM } from '../context'
import { SELL_CATEGORIES, BUILDINGS } from '../../theme'
import Overlay, { stop } from './Overlay'

const fieldBase: React.CSSProperties = {
  background: '#F4EFE5',
  border: '1.5px solid #E4DDCE',
  borderRadius: 12,
  padding: '13px 15px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  fontWeight: 500,
  color: '#201E18',
}

export default function SellModal() {
  const { state, closeSell, setF, toggleBundle, submitListing } = useM()
  const s = state
  const f = s.f

  const listLabel = s.listState === 'saving' ? 'Posting…' : s.listState === 'done' ? 'Posted ✓' : 'Post listing'
  const listBg = s.listState === 'done' ? '#3DBB6E' : 'var(--accent,#2A5FA8)'

  return (
    <Overlay onClose={closeSell}>
      <div onClick={stop} style={{ background: '#FBF8F1', borderRadius: 26, padding: '30px 32px', width: '100%', maxWidth: 500, animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(32,30,24,.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, margin: 0 }}>List an item</h2>
          <button onClick={closeSell} className="lok-navi" style={{ border: '1px solid #E4DDCE', background: '#F4EFE5', width: 34, height: 34, borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#5A5648' }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#8A8578', fontWeight: 600, margin: '0 0 18px' }}>Takes under a minute. Post it, drop it at the Security Post, done.</p>

        <div style={{ height: 124, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 14, border: '1.5px dashed #C9BFA8', background: '#F4EFE5', color: '#A29C8B' }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-4-4-9 8" /></svg>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11 }}>DROP PHOTOS HERE</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="lok-field" value={f.title} onChange={(e) => setF('title', e.target.value)} placeholder="Item title" style={fieldBase} />
          <input className="lok-field" value={f.price} onChange={(e) => setF('price', e.target.value)} placeholder="Price (Rp)" style={fieldBase} />

          <div style={{ display: 'flex', gap: 10, fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, color: '#A29C8B', letterSpacing: '.06em', margin: '2px 2px -2px' }}>
            <span style={{ flex: 1 }}>CATEGORY</span>
            <span style={{ flex: 1 }}>PICKUP LOCATION</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="lok-field" value={f.cat} onChange={(e) => setF('cat', e.target.value)} title="Category" style={{ ...fieldBase, flex: 1, fontWeight: 600 }}>
              {SELL_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select className="lok-field" value={f.loc} onChange={(e) => setF('loc', e.target.value)} title="Pickup location" style={{ ...fieldBase, flex: 1, fontWeight: 600 }}>
              {BUILDINGS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>

          <textarea className="lok-field" value={f.desc} onChange={(e) => setF('desc', e.target.value)} placeholder="Description — condition, why you're selling…" style={{ ...fieldBase, minHeight: 66, resize: 'none' }} />

          <div onClick={toggleBundle} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F4EFE5', border: '1px solid #E4DDCE', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
            <div style={{ width: 40, height: 23, borderRadius: 20, background: s.bundleOn ? '#1B5E43' : '#C9BFA8', position: 'relative', flex: 'none', transition: 'background .2s ease' }}>
              <div style={{ position: 'absolute', top: 2.5, left: s.bundleOn ? 19 : 2.5, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s ease', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Sell as Graduation Bundle</div>
              <div style={{ fontSize: 11, color: '#8A8578', fontWeight: 500 }}>Clear your whole room in one deal</div>
            </div>
          </div>
        </div>

        <button className="lok-btn" onClick={submitListing} style={{ width: '100%', border: 'none', background: listBg, color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 14, cursor: 'pointer', marginTop: 18, transition: 'background .2s ease', boxShadow: '0 8px 20px -8px rgba(27,94,67,.7)' }}>{listLabel}</button>
      </div>
    </Overlay>
  )
}
