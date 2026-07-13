import { useRef, useState } from 'react'
import { useM } from '../context'
import { SELL_CATEGORIES, BUILDINGS, floorsForBuilding, platformFee, publishedPrice } from '../../theme'
import { useLang } from '../../i18n'
import Overlay, { stop } from './Overlay'

const fieldBase: React.CSSProperties = {
  background: '#F5F5F3',
  border: '1.5px solid #D8D8D4',
  borderRadius: 0,
  padding: '13px 15px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  fontWeight: 500,
  color: '#000000',
}
const cap: React.CSSProperties = { flex: 1, fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, color: '#9A9A94', letterSpacing: '.06em' }
const CONDITIONS = ['Like new', 'Good', 'Fair']

export default function SellModal() {
  const { state, closeSell, setF, toggleBundle, submitListing } = useM()
  const { t } = useLang()
  const s = state
  const f = s.f
  const [photos, setPhotos] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const listLabel = s.listState === 'saving' ? t('Posting…') : s.listState === 'done' ? t('Posted ✓') : t('Post listing')
  const listBg = s.listState === 'done' ? '#3DBB6E' : 'var(--accent,#000000)'
  const busy = s.listState !== 'idle'

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotos(Array.from(e.target.files || []).slice(0, 6))
  }

  // live revenue preview — LOKITA adds its platform fee on top of the ask,
  // so the seller sees exactly what buyers will pay before posting.
  const ask = Number((f.price || '').replace(/[^0-9]/g, '')) || 0
  const fee = platformFee(ask)
  const listed = publishedPrice(ask)
  const rp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

  return (
    <Overlay onClose={closeSell}>
      <div onClick={stop} style={{ background: '#FFFFFF', borderRadius: 0, padding: '30px 32px', width: '100%', maxWidth: 500, animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(0,0,0,.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, margin: 0 }}>{t('List an item')}</h2>
          <button onClick={closeSell} className="lok-navi" style={{ border: '1px solid #D8D8D4', background: '#F5F5F3', width: 34, height: 34, borderRadius: 0, fontSize: 15, cursor: 'pointer', color: '#4A4B4E' }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#8B8B86', fontWeight: 600, margin: '0 0 18px' }}>{t('Takes under a minute. Post it, drop it at the Security Post, done.')}</p>

        {/* photo picker */}
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} style={{ display: 'none' }} />
        {photos.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {photos.map((p, i) => (
              <div key={i} style={{ width: 72, height: 72, borderRadius: 0, overflow: 'hidden', border: '1px solid #D8D8D4', position: 'relative' }}>
                <img src={URL.createObjectURL(p)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()} className="lok-btn" style={{ width: 72, height: 72, borderRadius: 0, border: '1.5px dashed #C2C2BE', background: '#F5F5F3', color: '#9A9A94', cursor: 'pointer', fontSize: 22 }}>+</button>
          </div>
        ) : (
          <div onClick={() => fileRef.current?.click()} style={{ height: 124, borderRadius: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 14, border: '1.5px dashed #C2C2BE', background: '#F5F5F3', color: '#9A9A94', cursor: 'pointer' }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-4-4-9 8" /></svg>
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11 }}>{t('ADD PHOTOS (optional)')}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="lok-field" value={f.title} onChange={(e) => setF('title', e.target.value)} placeholder={t('Item title')} style={fieldBase} />
          <input className="lok-field" value={f.price} onChange={(e) => setF('price', e.target.value.replace(/[^0-9]/g, ''))} placeholder={t('Your price in Rp (e.g. 150000)')} inputMode="numeric" style={fieldBase} />

          {/* platform-fee breakdown — appears as soon as a price is typed */}
          {ask > 0 && (
            <div style={{ background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '11px 14px', animation: 'lok-fade .25s ease both' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, color: '#1E1E1E' }}>
                <span>{t('Your price')}</span>
                <span>{rp(ask)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#8B8B86', marginTop: 5 }}>
                <span>{t('LOKITA platform fee')} <span title={t('5% of your price — min Rp 1.000, max Rp 4.000. Covers escrow, Security Post & support.')} style={{ cursor: 'help' }}>ⓘ</span></span>
                <span>+ {rp(fee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px dashed #C9C9C5' }}>
                <span style={{ fontSize: 12.5, fontWeight: 800 }}>{t('Listed at (buyers pay)')}</span>
                <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--accent,#000000)' }}>{rp(listed)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#3D7A54', fontWeight: 600, marginTop: 6 }}>{t('✓ You still receive your full')} {rp(ask)} {t('when it sells.')}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, margin: '2px 2px -2px' }}>
            <span style={cap}>{t('CATEGORY')}</span>
            <span style={cap}>{t('CONDITION')}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="lok-field" value={f.cat} onChange={(e) => setF('cat', e.target.value)} title={t('Category')} style={{ ...fieldBase, flex: 1, fontWeight: 600 }}>
              {SELL_CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </select>
            <select className="lok-field" value={f.cond} onChange={(e) => setF('cond', e.target.value)} title={t('Condition')} style={{ ...fieldBase, flex: 1, fontWeight: 600 }}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, margin: '2px 2px -2px' }}>
            <span style={cap}>{t("ITEM'S BUILDING")}</span>
            <span style={cap}>{t('FLOOR')}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              className="lok-field"
              value={f.loc}
              onChange={(e) => {
                setF('loc', e.target.value)
                setF('floor', '') // reset floor — options differ per building
              }}
              title={t('Where the item is now')}
              style={{ ...fieldBase, flex: 1, fontWeight: 600 }}
            >
              {BUILDINGS.map((b) => <option key={b}>{b}</option>)}
            </select>
            <select className="lok-field" value={f.floor} onChange={(e) => setF('floor', e.target.value)} title={t('Floor')} style={{ ...fieldBase, flex: 1, fontWeight: 600 }}>
              <option value="">{t('Floor…')}</option>
              {floorsForBuilding(f.loc).map((fl) => <option key={fl.code} value={fl.code}>{t(fl.label)}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11, color: '#8B8B86', fontWeight: 500, lineHeight: 1.5, margin: '-2px 2px 0', display: 'flex', gap: 6 }}>
            <span style={{ color: 'var(--accent,#000000)', flex: 'none' }}>ⓘ</span>
            {t('Just tells buyers how near the item is. The actual hand-off always happens at the shared campus Security Post — the buyer picks the exchange method at checkout.')}
          </div>

          <textarea className="lok-field" value={f.desc} onChange={(e) => setF('desc', e.target.value)} placeholder={t("Description — condition, why you're selling…")} style={{ ...fieldBase, minHeight: 66, resize: 'none' }} />

          <div onClick={toggleBundle} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '12px 14px', cursor: 'pointer' }}>
            <div style={{ width: 40, height: 23, borderRadius: 0, background: s.bundleOn ? '#1B5E43' : '#C2C2BE', position: 'relative', flex: 'none', transition: 'background .2s ease' }}>
              <div style={{ position: 'absolute', top: 2.5, left: s.bundleOn ? 19 : 2.5, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s ease', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{t('Sell as Graduation Bundle')}</div>
              <div style={{ fontSize: 11, color: '#8B8B86', fontWeight: 500 }}>{t('Clear your whole room in one deal')}</div>
            </div>
          </div>

          {s.bundleOn && (
            <div>
              <div style={{ ...cap, marginBottom: 6 }}>{t("WHAT'S IN THE BUNDLE (one item per line)")}</div>
              <textarea
                className="lok-field"
                value={f.bundleItems}
                onChange={(e) => setF('bundleItems', e.target.value)}
                placeholder={t('Desk lamp\nMini fridge\nTextbooks (5)\nClothes hanger rack')}
                style={{ ...fieldBase, width: '100%', minHeight: 84, resize: 'vertical' }}
              />
            </div>
          )}

        </div>

        <button disabled={busy} className="lok-btn" onClick={() => submitListing(photos)} style={{ width: '100%', border: 'none', background: listBg, color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: busy ? 'default' : 'pointer', marginTop: 18, transition: 'background .2s ease', boxShadow: '0 8px 20px -8px rgba(0,0,0,.6)' }}>{listLabel}</button>
      </div>
    </Overlay>
  )
}
