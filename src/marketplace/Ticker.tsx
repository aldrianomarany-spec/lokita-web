import { useEffect, useState } from 'react'
import { useM } from './context'
import { fetchBanners, subscribeBanners, type BannerRow } from '../lib/api'

// Moving announcement strip (design exploration 1b) — electric blue marquee
// above the top bar, fed by admin banners with placement='ticker'. Realtime:
// publishing/hiding a ticker item updates every open tab. Hover pauses the
// scroll; clicking an item follows its target.
export default function Ticker() {
  const { state, selectCat, openListingById, openRequests, openSell, goSignup } = useM()
  const [items, setItems] = useState<BannerRow[]>([])

  useEffect(() => {
    let live = true
    const load = () => fetchBanners().then((b) => live && setItems(b.filter((x) => x.placement === 'ticker')))
    load()
    const unsub = subscribeBanners(load)
    return () => {
      live = false
      unsub()
    }
  }, [])

  if (!items.length) return null

  const go = (b: BannerRow) => {
    if (b.target_type === 'category' && b.target_value) selectCat(b.target_value)
    else if (b.target_type === 'listing' && b.target_value) openListingById(b.target_value)
    else if (b.target_type === 'requests') openRequests()
    else if (b.target_type === 'sell') (state.guest ? goSignup() : openSell())
  }

  const speed = Math.max(9, items.length * 6)
  const row = (dup: boolean) =>
    items.map((b) => (
      <span
        key={(dup ? 'd-' : '') + b.id}
        onClick={() => b.target_type !== 'none' && go(b)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 28px', cursor: b.target_type !== 'none' ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
      >
        <span style={{ color: 'rgba(255,255,255,.75)' }}>★</span>
        {b.title}
        {b.subtitle ? <span style={{ color: 'rgba(255,255,255,.72)' }}>— {b.subtitle}</span> : null}
      </span>
    ))

  return (
    <div
      className="lok-ticker"
      style={{ flex: 'none', background: '#3555E6', color: '#FFFFFF', overflow: 'hidden', fontFamily: "'Spline Sans Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.02em', padding: '7px 0', zIndex: 41 }}
    >
      <div className="lok-ticker-track" style={{ ['--ticker-speed' as string]: `${speed}s` } as React.CSSProperties}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
