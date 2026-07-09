import { useM, type Sort } from './context'
import ListingCard from './ListingCard'
import { Search } from '../components/Icons'
import type { EnrichedItem } from '../types'

const CONDS = ['All', 'Like new', 'Good', 'Fair']
const SORTS: { key: Sort; label: string }[] = [
  { key: 'Nearest', label: 'Nearest' },
  { key: 'Newest', label: 'Newest' },
  { key: 'Price', label: 'Price ↑' },
]

export default function BrowseView() {
  const { state, enrichedItems, selectCond, selectSort, resetFilters, openSell } = useM()
  const s = state

  const q = s.query.trim().toLowerCase()
  let list = enrichedItems.slice()
  if (s.cat !== 'All') list = list.filter((i) => i.cat === s.cat)
  if (s.cond !== 'All') list = list.filter((i) => i.cond === s.cond)
  if (s.savedOnly) list = list.filter((i) => s.saved[i.id])
  if (q) list = list.filter((i) => (i.title + ' ' + i.cat + ' ' + i.seller).toLowerCase().includes(q))
  if (s.sort === 'Price') list.sort((a, b) => a.priceNum - b.priceNum)
  else if (s.sort === 'Newest') list.sort((a, b) => (b.new ? 1 : 0) - (a.new ? 1 : 0) || a.order - b.order)
  else list.sort((a, b) => a.proxRank - b.proxRank || a.order - b.order)

  // titles
  let browseTitle = 'Around you'
  let browseSub = `Verified students at ${s.location} — pay in-app, collect at the Security Post.`
  if (s.savedOnly) {
    browseTitle = 'Saved items'
    browseSub = 'Everything you tapped the heart on. Grab them before a neighbour does.'
  } else if (q) {
    browseTitle = `"${s.query}"`
    browseSub = `Matches near you in ${s.location}.`
  } else if (s.cat !== 'All') {
    browseTitle = s.cat
    browseSub = `${s.cat} from verified students at ${s.location}.`
  }
  const emptyCat = s.cat !== 'All' ? ` in ${s.cat}` : ''

  return (
    <div style={{ animation: 'lok-fade .3s ease both' }}>
      {/* hero header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', letterSpacing: '.08em', marginBottom: 6 }}>GOOD EVENING{s.profile.name ? ', ' + s.profile.name.split(' ')[0].toUpperCase() : ''}</div>
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

      {/* grid / empty */}
      {list.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(248px,1fr))', gap: 20 }}>
          {list.map((it: EnrichedItem, i) => (
            <ListingCard key={it.id} it={it} index={i} />
          ))}
        </div>
      ) : (
        <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 520, margin: '44px auto 0', textAlign: 'center', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 24, padding: '44px 36px' }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, background: '#F1ECE1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#B7AF9C' }}>
            <Search size={34} />
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>No matches in {s.location} yet</div>
          <div style={{ fontSize: 14, color: '#6F6A5C', lineHeight: 1.6, marginBottom: 24 }}>
            We couldn't find anything for <b style={{ color: '#201E18' }}>"{s.query}"{emptyCat}</b>. Post a Wanted request and verified neighbours will bring it to you — or widen your filters.
          </div>
          <div style={{ display: 'flex', gap: 11, justifyContent: 'center' }}>
            <button className="lok-btn" onClick={resetFilters} style={{ border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '12px 18px', borderRadius: 12, cursor: 'pointer' }}>Clear filters</button>
            <button className="lok-btn" onClick={openSell} style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '12px 18px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 6px 16px -6px rgba(27,94,67,.7)' }}>Post a Wanted request</button>
          </div>
        </div>
      )}
    </div>
  )
}
