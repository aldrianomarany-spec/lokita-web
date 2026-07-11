import { useM, type Sort } from './context'
import { Search, Star } from '../components/Icons'
import { CATEGORIES, CAT_META, BUILDINGS, type Category } from '../theme'
import { useIsNarrow } from './useIsMobile'
import { MASCOT_URL } from '../brand'
import type { EnrichedItem } from '../types'

// ============================================================================
// GRID MARKET homepage (design exploration 1a) — crisp neutrals, sharp grid,
// dark hero promo, hairline-separated product cells. Paper #F5F5F3, ink
// #17181A, electric blue accent, borders #D8D8D4, zero border-radius.
// ============================================================================

const INK = '#17181A'
const PAPER = '#F5F5F3'
const LINE = '#D8D8D4'
const GRAY = '#8B8B86'

const CONDS = ['All', 'Like new', 'Good', 'Fair']
const SORTS: { key: Sort; label: string }[] = [
  { key: 'Nearest', label: 'Nearest' },
  { key: 'Newest', label: 'Newest' },
  { key: 'Price', label: 'Price ↑' },
]

const chip = (active: boolean): React.CSSProperties => ({
  border: `1px solid ${active ? INK : LINE}`,
  background: active ? INK : '#FFFFFF',
  color: active ? '#FFFFFF' : INK,
  padding: '7px 16px',
  fontFamily: "'Archivo',sans-serif",
  fontWeight: 500,
  fontSize: 12,
  cursor: 'pointer',
  borderRadius: 0,
})

function GridCard({ it, saved, onOpen, onSave }: { it: EnrichedItem; saved: boolean; onOpen: () => void; onSave: () => void }) {
  return (
    <div onClick={onOpen} className="lok-card" style={{ background: '#FFFFFF', padding: '0 0 14px', cursor: 'pointer', position: 'relative' }}>
      {(it.isFeatured || it.mine) && (
        <span style={{ position: 'absolute', top: 10, left: 10, fontFamily: "'Spline Sans Mono',monospace", fontWeight: 600, fontSize: 9, letterSpacing: 1, background: it.isFeatured ? 'var(--accent,#3555E6)' : INK, color: '#FFFFFF', padding: '3px 7px', zIndex: 2 }}>
          {it.isFeatured ? 'FEATURED' : 'YOURS'}
        </span>
      )}
      <div style={{ aspectRatio: '1 / 0.85', background: 'repeating-linear-gradient(45deg,#ECECEA 0 10px,#F3F3F1 10px 20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {it.photoUrl ? (
          <img src={it.photoUrl} alt={it.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', padding: '0 14px', textAlign: 'center' }}>{it.title}</span>
        )}
        {!it.mine && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSave()
            }}
            title={saved ? 'Remove from saved' : 'Save item'}
            style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, border: 'none', background: '#FFFFFF', cursor: 'pointer', fontSize: 14, lineHeight: 1, color: saved ? '#E7A81E' : INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Star fill={saved ? '#E7A81E' : 'none'} size={15} />
          </button>
        )}
      </div>
      <div style={{ padding: '10px 12px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 500, fontSize: 13, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: INK, flex: 'none' }}>{it.price}</span>
        </div>
        <div style={{ fontSize: 11, color: GRAY }}>{it.proxTag} · {it.cond.toLowerCase()}</div>
      </div>
    </div>
  )
}

export default function BrowseView() {
  const { state, enrichedItems, selectCond, selectSort, resetFilters, openSell, selectCat, toggleSavedView, selectBldg, openRequests, openPeople, openItem, toggleSaveItem, goSignup } = useM()
  const s = state
  const isNarrow = useIsNarrow()
  const counts = s.categoryCounts
  const totalCount = Object.values(counts).reduce((a, n) => a + n, 0)

  const q = s.query.trim().toLowerCase()
  const list: EnrichedItem[] = s.savedOnly ? enrichedItems.filter((i) => s.saved[i.id]) : enrichedItems
  const filtersActive = q !== '' || s.cat !== 'All' || s.cond !== 'All' || s.savedOnly

  // hero: top item (featured sorts first) gets the dark promo panel
  const showHero = !filtersActive && !s.feedLoading && list.length >= 3
  const hero = showHero ? list[0] : null
  const gridItems = hero ? list.slice(1) : list
  const emptyCat = s.cat !== 'All' ? ` in ${s.cat}` : ''

  const save = (it: EnrichedItem) => (s.guest ? goSignup() : toggleSaveItem(it.id))

  return (
    <div style={{ animation: 'lok-fade .3s ease both' }}>
      {/* mobile strip — building + quick nav + categories */}
      {isNarrow && (
        <div className="lok-catbar">
          <select
            className="lok-field"
            value={s.bldg}
            onChange={(e) => selectBldg(e.target.value)}
            style={{ flex: 'none', fontFamily: 'inherit', fontWeight: 500, fontSize: 12.5, padding: '8px 10px', borderRadius: 0, border: `1px solid ${LINE}`, background: '#FFFFFF', color: INK }}
          >
            <option value="All">All buildings</option>
            {BUILDINGS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <button onClick={openRequests} style={{ ...chip(false), flex: 'none' }}>🙋 Requests</button>
          {!s.guest && <button onClick={openPeople} style={{ ...chip(false), flex: 'none' }}>👋 People</button>}
          <button onClick={toggleSavedView} style={{ ...chip(s.savedOnly), flex: 'none' }}>★ Saved</button>
          {CATEGORIES.map((label: Category) => {
            const active = s.cat === label && !s.savedOnly
            const count = label === 'All' ? totalCount : counts[label] || 0
            return (
              <button key={label} onClick={() => selectCat(label)} style={{ ...chip(active), flex: 'none' }}>
                {CAT_META[label]} {label}
                {count > 0 ? ` ${count}` : ''}
              </button>
            )
          })}
        </div>
      )}

      {/* dark hero promo — the mock's "brand campaign" panel, with a real item */}
      {hero && (
        <div onClick={() => openItem(hero)} className="lok-card" style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 380px', background: INK, color: PAPER, marginBottom: 18 }}>
          <div style={{ padding: isNarrow ? '26px 22px' : '36px 32px', display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontWeight: 600, fontSize: 10, letterSpacing: 1, background: 'var(--accent,#3555E6)', color: '#FFFFFF', padding: '3px 8px' }}>
                {hero.isFeatured ? 'FEATURED' : "TODAY'S PICK"}
              </span>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontWeight: 500, fontSize: 11, color: '#9A9A94' }}>{hero.seller}{hero.sellerVerified ? ' · Dorm-Verified' : ''}</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: isNarrow ? 26 : 34, lineHeight: 1.05, letterSpacing: '-1px' }}>{hero.title}</div>
            <div style={{ fontSize: 14, color: '#B9B9B3' }}>{hero.price} · {hero.proxTag} · {hero.cond}</div>
            <button style={{ alignSelf: 'flex-start', background: PAPER, color: INK, border: 'none', padding: '11px 22px', fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>View item →</button>
          </div>
          <div style={{ background: 'repeating-linear-gradient(45deg,#2A2B2E 0 12px,#232427 12px 24px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: isNarrow ? 180 : 0, overflow: 'hidden' }}>
            {hero.photoUrl ? (
              <img src={hero.photoUrl} alt={hero.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: GRAY, background: INK, padding: '4px 8px' }}>item photo</span>
            )}
          </div>
        </div>
      )}

      {/* category chips (desktop — mobile has the strip above) */}
      {!isNarrow && (
        <div style={{ display: 'flex', gap: 8, padding: '4px 0 6px', flexWrap: 'wrap' }}>
          {CATEGORIES.map((label: Category) => {
            const active = s.cat === label && !s.savedOnly
            return (
              <button key={label} onClick={() => selectCat(label)} style={chip(active)}>
                {label}
              </button>
            )
          })}
          <button onClick={toggleSavedView} style={{ ...chip(s.savedOnly), display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star fill={s.savedOnly ? '#E7A81E' : 'none'} size={13} />
            Saved
          </button>
        </div>
      )}

      {/* condition + sort rail */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 0 14px' }}>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: 1, color: GRAY }}>CONDITION</span>
        {CONDS.map((label) => (
          <button key={label} onClick={() => selectCond(label)} style={{ ...chip(s.cond === label), padding: '5px 12px', fontSize: 11.5 }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: 1, color: GRAY }}>SORT</span>
          {SORTS.map(({ key, label }) => (
            <button key={key} onClick={() => selectSort(key)} style={{ ...chip(s.sort === key), padding: '5px 12px', fontSize: 11.5 }}>
              {label}
            </button>
          ))}
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: 1, color: GRAY, marginLeft: 6 }}>{list.length} ITEM{list.length === 1 ? '' : 'S'}</span>
        </div>
      </div>

      {/* grid / loading / empty */}
      {s.feedLoading ? (
        <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 28, height: 28, border: `3px solid ${LINE}`, borderTopColor: 'var(--accent,#3555E6)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : s.feedError ? (
        <div style={{ maxWidth: 520, margin: '44px auto 0', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E0B4A8', padding: 28, color: '#B23A1B', fontWeight: 600 }}>
          Couldn't load listings: {s.feedError}
        </div>
      ) : list.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${isNarrow ? 164 : 236}px,1fr))`, gap: 1, background: LINE, border: `1px solid ${LINE}` }}>
          {gridItems.map((it: EnrichedItem) => (
            <GridCard key={it.id} it={it} saved={!!s.saved[it.id]} onOpen={() => openItem(it)} onSave={() => save(it)} />
          ))}
        </div>
      ) : filtersActive ? (
        <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 520, margin: '44px auto 0', textAlign: 'center', background: '#FFFFFF', border: `1px solid ${LINE}`, padding: '44px 36px' }}>
          <div style={{ width: 76, height: 76, background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#9A9A94' }}>
            <Search size={34} />
          </div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 20, marginBottom: 8, color: INK }}>No matches{s.query ? '' : emptyCat}</div>
          <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 24 }}>
            {s.query ? <>We couldn't find anything for <b style={{ color: INK }}>"{s.query}"{emptyCat}</b>.</> : 'Nothing here yet with these filters.'} Try widening your filters.
          </div>
          <button onClick={resetFilters} style={{ ...chip(true), padding: '11px 20px', fontSize: 13 }}>Clear filters</button>
        </div>
      ) : (
        <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 520, margin: '44px auto 0', textAlign: 'center', background: '#FFFFFF', border: `1px solid ${LINE}`, padding: '44px 36px' }}>
          {MASCOT_URL ? (
            <img src={MASCOT_URL} alt="Kapi, the LOKITA capybara" className="lok-mascot" style={{ width: 130, margin: '0 auto 14px', display: 'block' }} />
          ) : (
            <div style={{ width: 76, height: 76, background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 34 }}>🧺</div>
          )}
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 20, marginBottom: 8, color: INK }}>No listings yet</div>
          <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 24 }}>
            The marketplace is brand new. Be the first to post something — your neighbours will see it right away.
          </div>
          <button onClick={openSell} style={{ border: 'none', background: 'var(--accent,#3555E6)', color: '#FFFFFF', fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 13, padding: '12px 22px', cursor: 'pointer' }}>Post the first item</button>
        </div>
      )}
    </div>
  )
}
