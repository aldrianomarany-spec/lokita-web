import { useM } from './context'
import { T } from '../theme'
import type { EnrichedItem } from '../types'
import { MapPin, Star, Verified } from '../components/Icons'

// corner tag: FEATURED (accent) or GRAD BUNDLE (olive) — set by the feed mapper
function tagColors(tag: string): { bg: string; fg: string } | null {
  if (tag === 'FEATURED') return { bg: '#E7EEF7', fg: '#2A5FA8' }
  if (tag === 'GRAD BUNDLE') return { bg: '#EFEFDD', fg: '#7E8154' }
  return null
}

export default function ListingCard({ it, index }: { it: EnrichedItem; index: number }) {
  const { state, openItem, toggleSaveItem } = useM()
  const t = T[it.tone]
  const tc = tagColors(it.tag)
  const isSaved = !!state.saved[it.id]

  return (
    <div
      className="lok-card"
      onClick={() => openItem(it)}
      style={{ cursor: 'pointer', background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, overflow: 'hidden', animation: 'lok-rise .5s cubic-bezier(.2,.8,.3,1) both', animationDelay: `${index * 0.045}s` }}
    >
      <div style={{ position: 'relative', height: 172, overflow: 'hidden', background: t.tint }}>
        {it.photoUrl ? (
          <img className="lok-img" src={it.photoUrl} alt={it.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div
            className="lok-img"
            style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(135deg,${t.stripe} 0 12px,transparent 12px 24px)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: t.label, letterSpacing: '.02em', textAlign: 'center', padding: '0 16px' }}>{it.photo}</span>
          </div>
        )}
        {tc && (
          <span style={{ position: 'absolute', top: 11, left: 11, fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, fontWeight: 600, color: tc.fg, background: tc.bg, padding: '4px 8px', borderRadius: 0, letterSpacing: '.04em' }}>{it.tag}</span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleSaveItem(it.id)
          }}
          className="lok-heart"
          style={{ position: 'absolute', top: 9, right: 9, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(251,248,241,.9)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isSaved ? '#E7A81E' : '#4A4B4E', zIndex: 2 }}
          title={isSaved ? 'Remove from saved' : 'Save item'}
        >
          <Star fill={isSaved ? '#E7A81E' : 'none'} size={21} />
        </button>
        <span style={{ position: 'absolute', bottom: 10, left: 11, display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, fontWeight: 500, color: '#2A2B2E', background: 'rgba(251,248,241,.92)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: 0 }}>
          <MapPin size={10} />
          {it.proxTag}
        </span>
      </div>
      <div style={{ padding: '14px 15px 15px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 12 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#17181A' }}>{it.price}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 11, borderTop: '1px solid #E6E6E3' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: t.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#2A2B2E', flex: 'none' }}>{it.sellerInitial}</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#5F6063', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{it.seller}</span>
          {it.sellerVerified && <Verified size={13} />}
        </div>
      </div>
    </div>
  )
}
