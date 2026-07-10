import { useM, type Sort } from './context'
import ListingCard from './ListingCard'
import { Search, Star } from '../components/Icons'
import { CATEGORIES, CAT_META, BUILDINGS, type Category } from '../theme'
import { useIsNarrow } from './useIsMobile'
import { MASCOT_URL } from '../brand'
import type { EnrichedItem } from '../types'

const CONDS = ['All', 'Like new', 'Good', 'Fair']
const SORTS: { key: Sort; label: string }[] = [
  { key: 'Nearest', label: 'Nearest' },
  { key: 'Newest', label: 'Newest' },
  { key: 'Price', label: 'Price ↑' },
]

export default function BrowseView() {
  const { state, enrichedItems, selectCond, selectSort, resetFilters, openSell, selectCat, toggleSavedView, selectBldg, openRequests, openPeople } = useM()
  const s = state
  const isNarrow = useIsNarrow()
  const counts = s.categoryCounts
  const totalCount = Object.values(counts).reduce((a, n) => a + n, 0)

  const q = s.query.trim().toLowerCase()
  // feed is already filtered/sorted/capped server-side; only the local "Saved"
  // view is applied client-side here.
  const list: EnrichedItem[] = s.savedOnly ? enrichedItems.filter((i) => s.saved[i.id]) : enrichedItems
  const filtersActive = q !== '' || s.cat !== 'All' || s.cond !== 'All' || s.savedOnly

  // titles
  let browseTitle = s.bldg === 'All' ? 'Around you' : s.bldg
  let browseSub = `Verified students at ${s.bldg === 'All' ? 'JIU Cikarang' : s.bldg} — pay in-app, collect at the Security Post.`
  if (s.savedOnly) {
    browseTitle = 'Saved items'
    browseSub = 'Everything you tapped the heart on. Grab them before a neighbour does.'
  } else if (q) {
    browseTitle = `"${s.query}"`
    browseSub = `Matches near you in your dorm.`
  } else if (s.cat !== 'All') {
    browseTitle = s.cat
    browseSub = `${s.cat} from verified students at JIU Cikarang.`
  }
  const emptyCat = s.cat !== 'All' ? ` in ${s.cat}` : ''

  return (
    <div style={{ animation: 'lok-fade .3s ease both' }}>
      {/* mobile category strip — replaces the sidebar when it's hidden */}
      {isNarrow && (
        <div className="lok-catbar">
          <select
            className="lok-field"
            value={s.bldg}
            onChange={(e) => selectBldg(e.target.value)}
            style={{ flex: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '8px 10px', borderRadius: 20, border: '1px solid #E4DDCE', background: '#FBF8F1', color: '#201E18' }}
          >
            <option value="All">All buildings</option>
            {BUILDINGS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <button
            onClick={openRequests}
            className="lok-chip"
            style={{ flex: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '8px 13px', borderRadius: 20, border: '1px solid #E4DDCE', background: '#FBF8F1', color: '#4A463B' }}
          >
            🙋 Requests
          </button>
          {!s.guest && (
            <button
              onClick={openPeople}
              className="lok-chip"
              style={{ flex: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '8px 13px', borderRadius: 20, border: '1px solid #E4DDCE', background: '#FBF8F1', color: '#4A463B', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3DBB6E' }} />
              People
            </button>
          )}
          <button
            onClick={toggleSavedView}
            className="lok-chip"
            style={{ flex: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '8px 13px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${s.savedOnly ? '#E7A81E' : '#E4DDCE'}`, background: s.savedOnly ? '#FBF2DD' : '#FBF8F1', color: s.savedOnly ? '#9A6A12' : '#4A463B' }}
          >
            <Star fill={s.savedOnly ? '#E7A81E' : 'none'} size={15} />
            Saved
          </button>
          {CATEGORIES.map((label: Category) => {
            const active = s.cat === label && !s.savedOnly
            const count = label === 'All' ? totalCount : counts[label] || 0
            return (
              <button
                key={label}
                onClick={() => selectCat(label)}
                className="lok-chip"
                style={{ flex: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, padding: '8px 13px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${active ? '#201E18' : '#E4DDCE'}`, background: active ? '#201E18' : '#FBF8F1', color: active ? '#F7F3EA' : '#4A463B' }}
              >
                <span style={{ fontSize: 14 }}>{CAT_META[label]}</span>
                {label}
                {count > 0 && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, opacity: 0.7 }}>{count}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* hero header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', letterSpacing: '.08em', marginBottom: 6 }}>{(() => { const h = new Date().getHours(); return h < 11 ? 'GOOD MORNING' : h < 15 ? 'GOOD AFTERNOON' : 'GOOD EVENING' })()}{s.profile.name ? ', ' + s.profile.name.split(' ')[0].toUpperCase() : ''}</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>{browseTitle}</h1>
          <p style={{ fontSize: 14, color: '#6F6A5C', fontWeight: 500, margin: '8px 0 0' }}>{browseSub}</p>
        </div>
        <div style={{ flex: 'none', textAlign: 'right' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--accent,#2A5FA8)', lineHeight: 1 }}>{list.length}</div>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em' }}>ITEMS NEARBY</div>
        </div>
      </div>

      {/* filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #E4DDCE' }}>
        {CONDS.map((label) => {
          const active = s.cond === label
          return (
            <button
              key={label}
              onClick={() => selectCond(label)}
              className="lok-chip"
              style={{ cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, padding: '8px 14px', borderRadius: 20, border: `1px solid ${active ? '#201E18' : '#E4DDCE'}`, background: active ? '#201E18' : '#FBF8F1', color: active ? '#F7F3EA' : '#4A463B' }}
            >
              {label}
            </button>
          )
        })}
        <div style={{ width: 1, height: 22, background: '#E4DDCE', margin: '0 3px' }} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em' }}>SORT</span>
          {SORTS.map(({ key, label }) => {
            const active = s.sort === key
            return (
              <button
                key={key}
                onClick={() => selectSort(key)}
                className="lok-chip"
                style={{ cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '8px 13px', borderRadius: 20, border: `1px solid ${active ? '#CFE2D7' : '#E4DDCE'}`, background: active ? '#EAF1EC' : '#FBF8F1', color: active ? '#12503A' : '#8A8578' }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* grid / loading / empty */}
      {s.feedLoading ? (
        <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 28, height: 28, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : s.feedError ? (
        <div style={{ maxWidth: 520, margin: '44px auto 0', textAlign: 'center', background: '#FBEEE9', border: '1px solid #E4C4B8', borderRadius: 20, padding: 28, color: '#B23A1B', fontWeight: 600 }}>
          Couldn't load listings: {s.feedError}
        </div>
      ) : list.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(248px,1fr))', gap: 20 }}>
          {list.map((it: EnrichedItem, i) => (
            <ListingCard key={it.id} it={it} index={i} />
          ))}
        </div>
      ) : filtersActive ? (
        // there are listings, just none matching the current filters/search
        <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 520, margin: '44px auto 0', textAlign: 'center', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 24, padding: '44px 36px' }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, background: '#F1ECE1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#B7AF9C' }}>
            <Search size={34} />
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>No matches{s.query ? '' : emptyCat}</div>
          <div style={{ fontSize: 14, color: '#6F6A5C', lineHeight: 1.6, marginBottom: 24 }}>
            {s.query ? <>We couldn't find anything for <b style={{ color: '#201E18' }}>"{s.query}"{emptyCat}</b>.</> : 'Nothing here yet with these filters.'} Try widening your filters.
          </div>
          <button className="lok-btn" onClick={resetFilters} style={{ border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '12px 18px', borderRadius: 12, cursor: 'pointer' }}>Clear filters</button>
        </div>
      ) : (
        // truly empty marketplace (fresh install / no listings anywhere)
        <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 520, margin: '44px auto 0', textAlign: 'center', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 24, padding: '44px 36px' }}>
          {MASCOT_URL ? (
            <img src={MASCOT_URL} alt="Kapi, the LOKITA capybara" className="lok-mascot" style={{ width: 130, margin: '0 auto 14px', display: 'block' }} />
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: 22, background: '#EAF1EC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--accent,#2A5FA8)', fontSize: 34 }}>🧺</div>
          )}
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>No listings yet</div>
          <div style={{ fontSize: 14, color: '#6F6A5C', lineHeight: 1.6, marginBottom: 24 }}>
            The marketplace is brand new. Be the first to post something — your neighbours will see it right away.
          </div>
          <button className="lok-btn" onClick={openSell} style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '12px 18px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 6px 16px -6px rgba(42,95,168,.6)' }}>Post the first item</button>
        </div>
      )}
    </div>
  )
}
