import { useM } from './context'
import { T } from '../theme'
import type { EnrichedItem } from '../types'
import { tagStyle } from './tagStyle'
import { Heart, MapPin, Verified, WhatsApp } from '../components/Icons'

export default function ListingCard({ it, index }: { it: EnrichedItem; index: number }) {
  const { state, openItem, toggleSaveItem, openWa } = useM()
  const t = T[it.tone]
  const ts = tagStyle(it)
  const isSaved = !!state.saved[it.id]

  return (
    <div
      className="lok-card"
      onClick={() => openItem(it)}
      style={{ cursor: 'pointer', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 20, overflow: 'hidden', animation: 'lok-rise .5s cubic-bezier(.2,.8,.3,1) both', animationDelay: `${index * 0.045}s` }}
    >
      <div style={{ position: 'relative', height: 172, overflow: 'hidden', background: t.tint }}>
        <div
          className="lok-img"
          style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(135deg,${t.stripe} 0 12px,transparent 12px 24px)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: t.label, letterSpacing: '.02em' }}>{it.photo}</span>
        </div>
        {ts.tag && (
          <span style={{ position: 'absolute', top: 11, left: 11, fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, fontWeight: 600, color: ts.tagFg, background: ts.tagBg, padding: '4px 8px', borderRadius: 7, letterSpacing: '.04em' }}>{ts.tag}</span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleSaveItem(it.id)
          }}
          className="lok-heart"
          style={{ position: 'absolute', top: 9, right: 9, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(251,248,241,.9)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isSaved ? '#D4562F' : '#5A5648', zIndex: 2 }}
        >
          <Heart fill={isSaved ? '#D4562F' : 'none'} />
        </button>
        <span style={{ position: 'absolute', bottom: 10, left: 11, display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, fontWeight: 500, color: '#3A362C', background: 'rgba(251,248,241,.92)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: 8 }}>
          <MapPin size={10} />
          {it.proxTag}
        </span>
      </div>
      <div style={{ padding: '14px 15px 15px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 12 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#201E18' }}>{it.price}</span>
          {it.wasPrice && <span style={{ fontSize: 12, color: '#A29C8B', textDecoration: 'line-through', fontWeight: 600 }}>{it.wasPrice}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 11, borderTop: '1px solid #EEE7D8' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: t.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#3A362C', flex: 'none' }}>{it.sellerInitial}</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6F6A5C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{it.seller}</span>
          <Verified size={13} />
          <button
            onClick={(e) => {
              e.stopPropagation()
              openWa(it.wa, it.title)
            }}
            title="Chat on WhatsApp"
            style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: '#E4F3E8', color: '#128C3E', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none', padding: 0 }}
          >
            <WhatsApp size={13} />
          </button>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, fontWeight: 600, color: '#3A362C', flex: 'none' }}>★{it.rating}</span>
        </div>
      </div>
    </div>
  )
}
