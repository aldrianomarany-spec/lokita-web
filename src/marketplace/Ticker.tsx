import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useM } from './context'
import { fetchBanners, subscribeBanners, fetchTickerSettings, subscribeSettings, type BannerRow, type TickerSettings } from '../lib/api'

// Moving announcement strip (design exploration 1b) — electric blue marquee
// above the top bar, fed by admin banners with placement='ticker'. Realtime:
// publishing/hiding a ticker item updates every open tab. Hover pauses the
// scroll; clicking an item follows its target.
export default function Ticker() {
  const { state, selectCat, openListingById, openRequests, openSell, goSignup } = useM()
  const [items, setItems] = useState<BannerRow[]>([])
  const [cfg, setCfg] = useState<TickerSettings>({ speed: 'normal', clickable: true })
  // hover/touch pauses the scroll so items are easy to read and click.
  // Done in React state (inline animationPlayState) — the pure-CSS :hover
  // rule proved unreliable across browsers/overlays.
  const [paused, setPaused] = useState(false)
  const touchTimer = useRef<number | null>(null)
  // seamless loop: the track is 2 identical halves and slides -50%; each half
  // must be at least as wide as the strip, so short announcement sets are
  // repeated k times. Measured, so it always loops perfectly.
  const boxRef = useRef<HTMLDivElement>(null)
  const setRef = useRef<HTMLSpanElement>(null)
  const [reps, setReps] = useState(1)
  const [dur, setDur] = useState(18)
  useLayoutEffect(() => {
    const setW = setRef.current?.offsetWidth || 0
    const boxW = boxRef.current?.offsetWidth || 0
    if (!setW || !boxW) return
    const k = Math.max(1, Math.ceil(boxW / setW))
    setReps(k)
    const pxPerSec = cfg.speed === 'slow' ? 70 : cfg.speed === 'fast' ? 170 : 115
    setDur(Math.max(5, Math.round((k * setW) / pxPerSec)))
  }, [items, cfg.speed])

  useEffect(() => {
    let live = true
    const load = () => fetchBanners().then((b) => live && setItems(b.filter((x) => x.placement === 'ticker')))
    const loadCfg = () => fetchTickerSettings().then((c) => live && setCfg(c))
    load()
    loadCfg()
    const unsub = subscribeBanners(load)
    const unsubCfg = subscribeSettings(loadCfg)
    return () => {
      live = false
      unsub()
      unsubCfg()
    }
  }, [])

  if (!items.length) return null

  const go = (b: BannerRow) => {
    if (b.target_type === 'category' && b.target_value) selectCat(b.target_value)
    else if (b.target_type === 'listing' && b.target_value) openListingById(b.target_value)
    else if (b.target_type === 'requests') openRequests()
    else if (b.target_type === 'sell') (state.guest ? goSignup() : openSell())
  }

  const row = (copy: number) =>
    items.map((b) => (
      <span
        key={copy + '-' + b.id}
        onClick={() => cfg.clickable && b.target_type !== 'none' && go(b)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 28px', cursor: cfg.clickable && b.target_type !== 'none' ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
      >
        <span style={{ color: 'rgba(255,255,255,.75)' }}>★</span>
        {b.title}
        {b.subtitle ? <span style={{ color: 'rgba(255,255,255,.72)' }}>— {b.subtitle}</span> : null}
      </span>
    ))

  return (
    <div
      ref={boxRef}
      className="lok-ticker"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => {
        setPaused(true)
        if (touchTimer.current) window.clearTimeout(touchTimer.current)
        touchTimer.current = window.setTimeout(() => setPaused(false), 4000)
      }}
      style={{ flex: 'none', background: '#519BB8', color: '#FFFFFF', overflow: 'hidden', fontFamily: "'Spline Sans Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.02em', padding: '7px 0', zIndex: 41 }}
    >
      <div className="lok-ticker-track" style={{ ['--ticker-speed' as string]: `${dur}s`, animationPlayState: paused ? 'paused' : 'running' } as React.CSSProperties}>
        {/* first half: one measured set + (k-1) fillers; second half: identical */}
        <span ref={setRef} style={{ display: 'inline-flex' }}>{row(0)}</span>
        {Array.from({ length: reps - 1 }, (_, i) => row(i + 1))}
        {Array.from({ length: reps }, (_, i) => row(reps + i))}
      </div>
    </div>
  )
}
