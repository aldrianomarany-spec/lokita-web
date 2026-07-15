import { useState } from 'react'
import { useM } from '../context'
import { updateListing } from '../../lib/api'
import { SELL_CATEGORIES, BUILDINGS, floorsForBuilding } from '../../theme'
import { useLang } from '../../i18n'
import Overlay, { stop } from './Overlay'
import { errText } from '../../lib/err'
import type { Item } from '../../types'

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

// ✏️ Owner edits a live/pending listing — text, price and details only
// (photos stay as posted; repost if the photos themselves are wrong).
export default function EditListingModal({ item, onClose }: { item: Item; onClose: () => void }) {
  const { patch, reloadFeed } = useM()
  const { t } = useLang()
  const isFree = !!item.isGiveaway
  // the seller edits their ASK — with fees off that's exactly the listed price
  const [title, setTitle] = useState(item.title)
  const [price, setPrice] = useState(String(Math.max(0, (item.priceNum || 0) - (item.platformFee || 0))))
  const [cat, setCat] = useState(item.cat || '')
  const [cond, setCond] = useState<string>(item.cond || 'Good')
  const [loc, setLoc] = useState(item.building || BUILDINGS[0])
  const [floor, setFloor] = useState(() => {
    // the feed item carries the floor's display label; map it back to the code
    const label = (item as { floor?: string }).floor || ''
    const match = floorsForBuilding(item.building || BUILDINGS[0]).find((f) => f.label === label)
    return match ? match.code : ''
  })
  const [desc, setDesc] = useState(item.desc || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (saving) return
    if (!title.trim()) return alert(t('Please enter an item title.'))
    const priceNum = isFree ? 0 : Number(price.replace(/[^0-9]/g, ''))
    if (!isFree && (!priceNum || priceNum <= 0)) return alert(t('Please enter a valid price greater than 0.'))
    if (!cat) return alert(t('Please choose a category.'))
    setSaving(true)
    try {
      await updateListing(item.id, {
        title: title.trim(),
        priceNum,
        category: cat,
        condition: cond,
        building: loc,
        floor,
        description: desc.trim(),
      })
      // reflect the edit in the open detail modal + refresh the grid
      patch((prev) => ({
        sel: prev.sel && prev.sel.id === item.id
          ? {
              ...prev.sel,
              title: title.trim(),
              priceNum,
              price: isFree ? prev.sel.price : 'Rp ' + priceNum.toLocaleString('id-ID'),
              cat,
              cond: cond as Item['cond'],
              desc: desc.trim(),
            }
          : prev.sel,
      }))
      reloadFeed()
      onClose()
    } catch (e) {
      alert(t('Could not save.') + ' ' + errText(e, t('unknown error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose} z={95}>
      <div onClick={stop} style={{ background: '#FFFFFF', borderRadius: 0, padding: '28px 30px', width: '100%', maxWidth: 480, animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(0,0,0,.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, margin: 0 }}>✏️ {t('Edit listing')}</h2>
          <button onClick={onClose} className="lok-navi" style={{ border: '1px solid #D8D8D4', background: '#F5F5F3', width: 34, height: 34, borderRadius: 0, fontSize: 15, cursor: 'pointer', color: '#4A4B4E' }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: '#8B8B86', fontWeight: 500, margin: '0 0 16px', lineHeight: 1.5 }}>
          {t('Fix the title, price or details. Photos stay as posted — remove and repost if the photos themselves are wrong.')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="lok-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Item title')} style={fieldBase} />

          {!isFree && (
            <input className="lok-field" value={price ? Number(price).toLocaleString('id-ID') : ''} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))} placeholder={t('Your price in Rp (e.g. 150000)')} inputMode="numeric" style={fieldBase} />
          )}

          <div style={{ display: 'flex', gap: 10, margin: '2px 2px -2px' }}>
            <span style={cap}>{t('CATEGORY')}</span>
            <span style={cap}>{t('CONDITION')}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="lok-field" value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...fieldBase, flex: 1, fontWeight: 600 }}>
              <option value="" disabled>{t('Select a category…')}</option>
              {SELL_CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </select>
            <select className="lok-field" value={cond} onChange={(e) => setCond(e.target.value)} style={{ ...fieldBase, flex: 1, fontWeight: 600 }}>
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
              value={loc}
              onChange={(e) => {
                setLoc(e.target.value)
                setFloor('')
              }}
              style={{ ...fieldBase, flex: 1, fontWeight: 600 }}
            >
              {BUILDINGS.map((b) => <option key={b}>{b}</option>)}
            </select>
            <select className="lok-field" value={floor} onChange={(e) => setFloor(e.target.value)} style={{ ...fieldBase, flex: 1, fontWeight: 600 }}>
              <option value="">{t('Floor…')}</option>
              {floorsForBuilding(loc).map((fl) => <option key={fl.code} value={fl.code}>{t(fl.label)}</option>)}
            </select>
          </div>

          <textarea className="lok-field" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("Description — condition, why you're selling…")} style={{ ...fieldBase, minHeight: 66, resize: 'none' }} />
        </div>

        <button
          disabled={saving}
          className="lok-btn"
          onClick={save}
          style={{ width: '100%', border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: saving ? 'default' : 'pointer', marginTop: 16 }}
        >
          {saving ? t('Saving…') : t('Save changes ✓')}
        </button>
      </div>
    </Overlay>
  )
}
