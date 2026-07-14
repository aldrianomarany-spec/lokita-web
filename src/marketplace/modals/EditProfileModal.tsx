import { useState } from 'react'
import { useM } from '../context'
import { BUILDINGS, floorsForBuilding, STANDINGS } from '../../theme'
import { useLang } from '../../i18n'
import Overlay, { stop } from './Overlay'

// country dial codes for the WhatsApp field — Indonesia first / default
const DIAL_CODES = [
  { flag: '🇮🇩', code: '+62' },
  { flag: '🇸🇬', code: '+65' },
  { flag: '🇲🇾', code: '+60' },
  { flag: '🇯🇵', code: '+81' },
  { flag: '🇰🇷', code: '+82' },
  { flag: '🇨🇳', code: '+86' },
  { flag: '🇮🇳', code: '+91' },
  { flag: '🇸🇦', code: '+966' },
  { flag: '🇦🇺', code: '+61' },
  { flag: '🇬🇧', code: '+44' },
  { flag: '🇺🇸', code: '+1' },
]
// stored shape is code + national digits, e.g. "+62812345678"
function splitWa(v: string): { code: string; national: string } {
  const s = (v || '').trim()
  if (!s) return { code: '+62', national: '' }
  const code = DIAL_CODES.map((d) => d.code)
    .filter((c) => s.startsWith(c))
    .sort((a, b) => b.length - a.length)[0]
  const rest = code ? s.slice(code.length) : s
  return { code: code || '+62', national: rest.replace(/[^0-9]/g, '') }
}
function joinWa(code: string, national: string): string {
  const digits = national.replace(/[^0-9]/g, '').replace(/^0+/, '') // 0812… → 812…
  return digits ? code + digits : ''
}

const BATCH_YEARS = ['2021', '2022', '2023', '2024', '2025', '2026']
// exact DB values — option value= must stay English, only the label is translated
const MAJORS = [
  'Accounting',
  'English Literature',
  'Information Systems',
  'Information Technology',
  'Japanese Literature',
  'Visual Communication Design',
]

const fieldBase: React.CSSProperties = {
  width: '100%',
  background: '#F5F5F3',
  border: '1.5px solid #D8D8D4',
  borderRadius: 0,
  padding: '12px 15px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  fontWeight: 500,
  color: '#000000',
}
const cap: React.CSSProperties = {
  fontFamily: "'Spline Sans Mono',monospace",
  fontSize: 9.5,
  color: '#9A9A94',
  letterSpacing: '.06em',
  marginBottom: 6,
}

export default function EditProfileModal() {
  const { state, closeEdit, setPf, savePf, pickPhoto } = useM()
  const { t } = useLang()
  const pf = state.pf
  const profileInitial = (state.profile.name || 'A').trim().charAt(0).toUpperCase()
  const initWa = splitWa(pf.whatsapp)
  const [waCode, setWaCode] = useState(initWa.code)
  const [waNum, setWaNum] = useState(initWa.national)

  return (
    <Overlay onClose={closeEdit}>
      <div onClick={stop} style={{ background: '#FFFFFF', borderRadius: 0, padding: '30px 32px', width: '100%', maxWidth: 500, animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(0,0,0,.5)', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, margin: 0 }}>{t('Edit profile')}</h2>
          <button onClick={closeEdit} className="lok-navi" style={{ border: '1px solid #D8D8D4', background: '#F5F5F3', width: 34, height: 34, borderRadius: 0, fontSize: 15, cursor: 'pointer', color: '#4A4B4E' }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#8B8B86', fontWeight: 600, margin: '0 0 18px' }}>{t('Keep your details current so neighbours know they can trust the trade.')}</p>

        {state.pfError && (
          <div style={{ background: '#FBEEE9', border: '1px solid #E4C4B8', color: '#B23A1B', fontSize: 12.5, fontWeight: 600, borderRadius: 0, padding: '10px 13px', marginBottom: 16, lineHeight: 1.45 }}>{state.pfError}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <div style={{ width: 66, height: 66, borderRadius: 0, background: 'var(--accent,#000000)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F7F3EA', fontWeight: 800, fontSize: 26, fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden', flex: 'none' }}>
            {state.photo ? <img src={state.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profileInitial}
          </div>
          <div>
            <button onClick={pickPhoto} className="lok-btn" style={{ border: '1px solid #C9C9C5', background: '#F5F5F3', color: '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '9px 14px', borderRadius: 0, cursor: 'pointer' }}>{t('Change photo')}</button>
            <div style={{ fontSize: 11, color: '#9A9A94', fontWeight: 500, marginTop: 6 }}>{t('JPG or PNG · shown on all your listings')}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={cap}>{t('FULL NAME')}</div>
            <input className="lok-field" value={pf.name} onChange={(e) => setPf('name', e.target.value)} style={fieldBase} />
          </div>
          {/* dial-code + number needs ~220px — wraps to a full row on phones */}
          <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px' }}>
              <div style={cap}>{t('STUDENT ID')}</div>
              <input className="lok-field" value={pf.studentId} onChange={(e) => setPf('studentId', e.target.value)} style={fieldBase} />
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <div style={cap}>{t('WHATSAPP')}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  className="lok-field"
                  value={waCode}
                  onChange={(e) => {
                    setWaCode(e.target.value)
                    setPf('whatsapp', joinWa(e.target.value, waNum))
                  }}
                  style={{ ...fieldBase, width: 92, flex: 'none', fontWeight: 600, padding: '12px 6px' }}
                >
                  {DIAL_CODES.map((d) => (
                    <option key={d.code} value={d.code}>{d.flag} {d.code}</option>
                  ))}
                </select>
                <input
                  className="lok-field"
                  value={waNum}
                  inputMode="numeric"
                  placeholder="812 3456 7890"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, '')
                    setWaNum(digits)
                    setPf('whatsapp', joinWa(waCode, digits))
                  }}
                  style={{ ...fieldBase, flex: 1, minWidth: 0 }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>{t('DORM BUILDING')}</div>
              <select
                className="lok-field"
                value={pf.building}
                onChange={(e) => {
                  setPf('building', e.target.value)
                  setPf('floor', '') // reset floor — options differ per building
                }}
                style={{ ...fieldBase, fontWeight: 600 }}
              >
                <option value="">{t('Select…')}</option>
                {BUILDINGS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>{t('ROOM')}</div>
              <input className="lok-field" value={pf.room} onChange={(e) => setPf('room', e.target.value)} style={fieldBase} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>{t('FLOOR')}</div>
              <select className="lok-field" value={pf.floor} onChange={(e) => setPf('floor', e.target.value)} style={{ ...fieldBase, fontWeight: 600 }}>
                <option value="">{t('Select…')}</option>
                {floorsForBuilding(pf.building).map((fl) => (
                  <option key={fl.code} value={fl.label}>{t(fl.label)}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>{t('BATCH / YEAR')}</div>
              <select className="lok-field" value={(pf.batch || '').replace(/[^0-9]/g, '')} onChange={(e) => setPf('batch', e.target.value)} style={{ ...fieldBase, fontWeight: 600 }}>
                <option value="">{t('Select…')}</option>
                {BATCH_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>{t('CLASS STANDING')}</div>
              <select className="lok-field" value={pf.standing} onChange={(e) => setPf('standing', e.target.value)} style={{ ...fieldBase, fontWeight: 600 }}>
                {STANDINGS.map((st) => (
                  <option key={st} value={st}>{t(st)}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>{t('MAJOR')}</div>
              <select className="lok-field" value={pf.major} onChange={(e) => setPf('major', e.target.value)} style={{ ...fieldBase, fontWeight: 600 }}>
                <option value="">{t('Select…')}</option>
                {MAJORS.map((m) => (
                  <option key={m} value={m}>{t(m)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 11, marginTop: 20 }}>
          <button onClick={closeEdit} className="lok-btn" style={{ flex: 'none', border: '1px solid #C9C9C5', background: '#F5F5F3', color: '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '13px 20px', borderRadius: 0, cursor: 'pointer' }}>{t('Cancel')}</button>
          <button onClick={savePf} disabled={state.pfSaving} className="lok-btn" style={{ flex: 1, border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 0, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {state.pfSaving ? <span className="lok-spin" style={{ width: 15, height: 15, border: '2px solid rgba(247,243,234,.4)', borderTopColor: '#F7F3EA', borderRadius: '50%', display: 'inline-block' }} /> : t('Save changes')}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
