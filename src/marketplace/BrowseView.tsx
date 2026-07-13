import { useEffect, useState } from 'react'
import { useM, type Sort } from './context'
import { fetchBanners, subscribeBanners, type BannerRow } from '../lib/api'
import { Search, Star } from '../components/Icons'
import { CATEGORIES, CAT_META, BUILDINGS, type Category } from '../theme'
import { useIsNarrow } from './useIsMobile'
import { MASCOT_URL } from '../brand'
import { useLang } from '../i18n'
import type { EnrichedItem } from '../types'

// ============================================================================
// GRID MARKET homepage (design exploration 1a) — crisp neutrals, sharp grid,
// dark hero promo, hairline-separated product cells. Paper #F5F5F3, ink
// #000000, electric blue accent, borders #D8D8D4, zero border-radius.
// ============================================================================

const INK = '#000000'
const PAPER = '#F5F5F3'
const LINE = '#D8D8D4'
const GRAY = '#8B8B86'
const GOLD = '#519BB8'

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
  const { t } = useLang()
  return (
    <div onClick={onOpen} className="lok-card" style={{ background: '#FFFFFF', padding: '0 0 14px', cursor: 'pointer', position: 'relative' }}>
      {(it.isFeatured || it.mine) && (
        <span style={{ position: 'absolute', top: 10, left: 10, fontFamily: "'Spline Sans Mono',monospace", fontWeight: 600, fontSize: 9, letterSpacing: 1, background: it.isFeatured ? GOLD : INK, color: '#FFFFFF', padding: '3px 7px', zIndex: 2 }}>
          {it.isFeatured ? t('FEATURED') : t('YOURS')}
        </span>
      )}
      <div style={{ aspectRatio: '1 / 0.85', background: 'repeating-linear-gradient(45deg,#ECECEA 0 10px,#F3F3F1 10px 20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {it.photoUrl ? (
          <img src={it.photoUrl} alt={it.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', padding: '0 14px', textAlign: 'center' }}>{it.title}</span>
        )}
        {!it.mine && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSave()
            }}
            title={saved ? t('Remove from saved') : t('Save item')}
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
  const { state, enrichedItems, selectCond, selectSort, resetFilters, openSell, selectCat, toggleSavedView, selectBldg, openRequests, openPeople, openGuide, openItem, toggleSaveItem, goSignup, openListingById } = useM()
  const s = state
  const isNarrow = useIsNarrow()
  const { t } = useLang()
  const counts = s.categoryCounts
  const totalCount = Object.values(counts).reduce((a, n) => a + n, 0)

  const q = s.query.trim().toLowerCase()
  const list: EnrichedItem[] = s.savedOnly ? enrichedItems.filter((i) => s.saved[i.id]) : enrichedItems
  const filtersActive = q !== '' || s.cat !== 'All' || s.cond !== 'All' || s.savedOnly

  // admin promotion banners (realtime) — sliding carousel; fall back to the item hero
  const [banners, setBanners] = useState<BannerRow[]>([])
  const [slide, setSlide] = useState(0)
  useEffect(() => {
    let live = true
    const load = () => fetchBanners().then((b) => live && setBanners(b.filter((x) => x.placement !== 'ticker')))
    load()
    const unsub = subscribeBanners(load)
    return () => {
      live = false
      unsub()
    }
  }, [])
  // keyed on `slide` so clicking a dot restarts the 6s clock instead of
  // getting yanked forward moments later by a stale timer
  useEffect(() => {
    if (banners.length < 2) return
    const t = window.setTimeout(() => setSlide((v) => (v + 1) % banners.length), 6000)
    return () => window.clearTimeout(t)
  }, [banners.length, slide])
  const activeSlide = banners.length ? slide % banners.length : 0

  // hero: top item (featured sorts first) gets the dark promo panel — but only
  // when no admin banner occupies the slot, so the item stays in the grid
  const showHero = !filtersActive && !s.feedLoading && list.length >= 3 && banners.length === 0
  const hero = showHero ? list[0] : null
  const gridItems = hero ? list.slice(1) : list
  const bannerCta = (b: BannerRow) => {
    if (b.target_type === 'category' && b.target_value) selectCat(b.target_value)
    else if (b.target_type === 'listing' && b.target_value) openListingById(b.target_value)
    else if (b.target_type === 'requests') openRequests()
    else if (b.target_type === 'sell') (s.guest ? goSignup() : openSell())
  }
  const emptyCat = s.cat !== 'All' ? ` ${t('in')} ${t(s.cat)}` : ''

  // recently viewed (device-local) resolved against the live feed — items that
  // sold or were removed simply drop out because they're no longer in the feed
  const recentItems = s.recents
    .map((id) => enrichedItems.find((i) => i.id === id))
    .filter((i): i is EnrichedItem => !!i)

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
            <option value="All">{t('All buildings')}</option>
            {BUILDINGS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <button onClick={openRequests} style={{ ...chip(false), flex: 'none' }}>🙋 {t('Requests')}</button>
          {!s.guest && <button onClick={openPeople} style={{ ...chip(false), flex: 'none' }}>👋 {t('People')}</button>}
          <button onClick={toggleSavedView} style={{ ...chip(s.savedOnly), flex: 'none' }}>★ {t('Saved')}</button>
          <button onClick={openGuide} style={{ ...chip(false), flex: 'none' }}>📖 {t('Guide')}</button>
          {CATEGORIES.map((label: Category) => {
            const active = s.cat === label && !s.savedOnly
            const count = label === 'All' ? totalCount : counts[label] || 0
            return (
              <button key={label} onClick={() => selectCat(label)} style={{ ...chip(active), flex: 'none' }}>
                {CAT_META[label]} {t(label)}
                {count > 0 ? ` ${count}` : ''}
              </button>
            )
          })}
        </div>
      )}

      {/* black statement slot — admin banner carousel first, featured item as fallback */}
      {banners.length > 0 ? (
        <div className="lok-card" style={{ position: 'relative', background: INK, marginBottom: 18, overflow: 'hidden' }}>
          {/* sliding track: all slides side by side, translateX moves smoothly between them */}
          <div style={{ display: 'flex', width: `${banners.length * 100}%`, transform: `translateX(-${activeSlide * (100 / banners.length)}%)`, transition: 'transform .65s cubic-bezier(.25,.8,.3,1)' }}>
            {banners.map((b) => (
              <div
                key={b.id}
                onClick={() => b.target_type !== 'none' && bannerCta(b)}
                style={{ width: `${100 / banners.length}%`, flex: 'none', display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 380px', color: PAPER, cursor: b.target_type !== 'none' ? 'pointer' : 'default', overflow: 'hidden' }}
              >
                <div style={{ padding: isNarrow ? '26px 22px' : '36px 32px', paddingBottom: banners.length > 1 ? (isNarrow ? 40 : 48) : undefined, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontWeight: 600, fontSize: 10, letterSpacing: 1, background: GOLD, color: '#FFFFFF', padding: '3px 8px' }}>LOKITA</span>
                    <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontWeight: 500, fontSize: 11, color: '#9A9A94' }}>{t('CAMPUS ANNOUNCEMENT')}</span>
                  </div>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: isNarrow ? 28 : 38, lineHeight: 1.06, letterSpacing: '-.5px' }}>{b.title}</div>
                  {b.subtitle && <div style={{ fontSize: 14, color: '#B9B9B3' }}>{b.subtitle}</div>}
                  {b.target_type !== 'none' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        bannerCta(b)
                      }}
                      style={{ alignSelf: 'flex-start', background: GOLD, color: '#FFFFFF', border: 'none', padding: '11px 22px', fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >
                      {b.cta_label || t('See details')} →
                    </button>
                  )}
                </div>
                <div style={{ background: 'repeating-linear-gradient(45deg,#141414 0 12px,#0A0A0A 12px 24px)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: isNarrow ? (b.image_url ? 180 : 110) : 0, position: 'relative', overflow: 'hidden' }}>
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : MASCOT_URL ? (
                    <img src={MASCOT_URL} alt="Kapi, the LOKITA capybara" className="lok-mascot" style={{ width: isNarrow ? 92 : 150, maxHeight: '82%', objectFit: 'contain', padding: '10px 0' }} />
                  ) : (
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#222222', letterSpacing: '-.5px' }}>LOKITA<span style={{ color: GOLD }}>.</span></span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* clickable dots — pick a slide directly; the 6s auto-slide keeps going */}
          {banners.length > 1 && (
            <div style={{ position: 'absolute', left: isNarrow ? 22 : 32, bottom: 12, display: 'flex', gap: 7, zIndex: 2 }}>
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSlide(i)
                  }}
                  aria-label={`Go to banner ${i + 1}`}
                  style={{ width: 26, height: 16, border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  <span style={{ display: 'block', width: '100%', height: 3.5, background: i === activeSlide ? GOLD : 'rgba(255,255,255,.38)', transition: 'background .25s' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : hero && (
        <div onClick={() => openItem(hero)} className="lok-card" style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 380px', background: INK, color: PAPER, marginBottom: 18 }}>
          <div style={{ padding: isNarrow ? '26px 22px' : '36px 32px', display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontWeight: 600, fontSize: 10, letterSpacing: 1, background: GOLD, color: '#FFFFFF', padding: '3px 8px' }}>
                {hero.isFeatured ? t('FEATURED') : t("TODAY'S PICK")}
              </span>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontWeight: 500, fontSize: 11, color: '#9A9A94' }}>{hero.seller}{hero.sellerVerified ? ' · ' + t('Dorm-Verified') : ''}</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: isNarrow ? 26 : 34, lineHeight: 1.05, letterSpacing: '-1px' }}>{hero.title}</div>
            <div style={{ fontSize: 14, color: '#B9B9B3' }}>{hero.price} · {hero.proxTag} · {hero.cond}</div>
            <button style={{ alignSelf: 'flex-start', background: PAPER, color: INK, border: 'none', padding: '11px 22px', fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{t('View item →')}</button>
          </div>
          <div style={{ background: 'repeating-linear-gradient(45deg,#1E1E1E 0 12px,#232427 12px 24px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: isNarrow ? 180 : 0, overflow: 'hidden' }}>
            {hero.photoUrl ? (
              <img src={hero.photoUrl} alt={hero.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: GRAY, background: INK, padding: '4px 8px' }}>item photo</span>
            )}
          </div>
        </div>
      )}

      {/* recently viewed — quick way back to items you looked at (this device) */}
      {!filtersActive && recentItems.length > 0 && (
        <div style={{ margin: '0 0 14px' }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: 1, color: GRAY, marginBottom: 8 }}>{t('RECENTLY VIEWED')}</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {recentItems.map((it) => (
              <div key={it.id} onClick={() => openItem(it)} className="lok-card" style={{ flex: 'none', width: 200, background: '#FFFFFF', border: `1px solid ${LINE}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, padding: 7 }}>
                <div style={{ width: 42, height: 42, flex: 'none', background: '#ECECEA', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {it.photoUrl ? <img src={it.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 15 }}>🧺</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 500, fontSize: 12, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 12, color: INK }}>{it.price}</div>
                </div>
              </div>
            ))}
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
                {t(label)}
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
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: 1, color: GRAY }}>{t('CONDITION')}</span>
        {CONDS.map((label) => (
          <button key={label} onClick={() => selectCond(label)} style={{ ...chip(s.cond === label), padding: '5px 12px', fontSize: 11.5 }}>
            {t(label)}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: 1, color: GRAY }}>{t('SORT')}</span>
          {SORTS.map(({ key, label }) => (
            <button key={key} onClick={() => selectSort(key)} style={{ ...chip(s.sort === key), padding: '5px 12px', fontSize: 11.5 }}>
              {t(label)}
            </button>
          ))}
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: 1, color: GRAY, marginLeft: 6 }}>{list.length} {list.length === 1 ? t('ITEM') : t('ITEMS')}</span>
        </div>
      </div>

      {/* grid / loading / empty */}
      {s.feedLoading ? (
        <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 28, height: 28, border: `3px solid ${LINE}`, borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : s.feedError ? (
        <div style={{ maxWidth: 520, margin: '44px auto 0', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E0B4A8', padding: 28, color: '#B23A1B', fontWeight: 600 }}>
          {t("Couldn't load listings:")} {s.feedError}
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
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 20, marginBottom: 8, color: INK }}>{t('No matches')}{s.query ? '' : emptyCat}</div>
          <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 24 }}>
            {s.query ? <>{t("We couldn't find anything for")} <b style={{ color: INK }}>"{s.query}"{emptyCat}</b>.</> : t('Nothing here yet with these filters.')} {t('Try widening your filters.')}
          </div>
          <button onClick={resetFilters} style={{ ...chip(true), padding: '11px 20px', fontSize: 13 }}>{t('Clear filters')}</button>
        </div>
      ) : (
        <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 520, margin: '44px auto 0', textAlign: 'center', background: '#FFFFFF', border: `1px solid ${LINE}`, padding: '44px 36px' }}>
          {MASCOT_URL ? (
            <img src={MASCOT_URL} alt="Kapi, the LOKITA capybara" className="lok-mascot" style={{ width: 130, margin: '0 auto 14px', display: 'block' }} />
          ) : (
            <div style={{ width: 76, height: 76, background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 34 }}>🧺</div>
          )}
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 20, marginBottom: 8, color: INK }}>{t('No listings yet')}</div>
          <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 24 }}>
            {t('The marketplace is brand new. Be the first to post something — your neighbours will see it right away.')}
          </div>
          <button onClick={openSell} style={{ border: 'none', background: 'var(--accent,#000000)', color: '#FFFFFF', fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 13, padding: '12px 22px', cursor: 'pointer' }}>{t('Post the first item')}</button>
        </div>
      )}
    </div>
  )
}
