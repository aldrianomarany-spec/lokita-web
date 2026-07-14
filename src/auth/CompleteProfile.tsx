import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACCENT, ACCENT_DEEP } from '../theme'
import {
  getSession,
  getMyProfile,
  completeProfile,
  type BuildingCode,
  type ClassStanding,
  type FloorCode,
} from '../lib/auth'
import { useLang } from '../i18n'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.')

const rootStyle = {
  '--accent': ACCENT,
  '--accent-deep': ACCENT_DEEP,
  minHeight: '100vh',
  background: '#ECECEA',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
} as React.CSSProperties

const cap: React.CSSProperties = {
  fontFamily: "'Spline Sans Mono',monospace",
  fontSize: 9.5,
  color: '#9A9A94',
  letterSpacing: '.06em',
  marginBottom: 6,
}
const field: React.CSSProperties = {
  width: '100%',
  background: '#F5F5F3',
  border: '1.5px solid #D8D8D4',
  borderRadius: 0,
  padding: '12px 14px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  fontWeight: 500,
  color: '#000000',
}

const BUILDINGS: { v: BuildingCode; label: string }[] = [
  { v: 'thomas', label: 'Thomas Building' },
  { v: 'union', label: 'Union Building' },
  { v: 'elizabeth', label: 'Elizabeth Building' },
  { v: 'main', label: 'Main Building (JIU Staff & Lecturer)' },
]
// floors are specific to each building; Security Post is a separate shared point
const FLOORS_BY_BUILDING: Record<BuildingCode, { v: FloorCode; label: string }[]> = {
  thomas: [
    { v: 'ground', label: 'Ground' },
    { v: 't1', label: 'T1' },
    { v: 't2', label: 'T2' },
    { v: 't3', label: 'T3' },
  ],
  union: [
    { v: 'u2', label: 'U2' },
    { v: 'u3', label: 'U3' },
  ],
  elizabeth: [
    { v: 'e1', label: 'Floor 1' },
    { v: 'e2', label: 'Floor 2' },
    { v: 'e3', label: 'Floor 3' },
  ],
  main: [
    { v: 'mg', label: 'Ground' },
    { v: 'm1', label: 'Floor 1' },
    { v: 'm2', label: 'Floor 2' },
  ],
}
const STANDINGS: { v: ClassStanding; label: string }[] = [
  { v: 'freshman', label: 'Freshman' },
  { v: 'sophomore', label: 'Sophomore' },
  { v: 'junior', label: 'Junior' },
  { v: 'senior', label: 'Senior' },
]

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

export default function CompleteProfile() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [name, setName] = useState('')
  const [building, setBuilding] = useState<BuildingCode | ''>('')
  const [floor, setFloor] = useState<FloorCode | ''>('')
  const [room, setRoom] = useState('')
  const [batch, setBatch] = useState('')
  const [standing, setStanding] = useState<ClassStanding | ''>('')
  const [major, setMajor] = useState('')
  const [waCode, setWaCode] = useState('+62')
  const [waNum, setWaNum] = useState('')
  const [studentId, setStudentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // must be signed in; prefill EVERYTHING already on the profile so landing
  // here again never means retyping from scratch
  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) {
        navigate('/', { replace: true })
        return
      }
      try {
        const p = await getMyProfile()
        if (!p) return
        if (p.name) setName(p.name)
        if (p.building) setBuilding(p.building)
        if (p.floor) setFloor(p.floor)
        if (p.room_number) setRoom(p.room_number)
        if (p.batch_year) setBatch(String(p.batch_year))
        if (p.class_standing) setStanding(p.class_standing)
        if (p.whatsapp_number) {
          const wa = splitWa(p.whatsapp_number)
          setWaCode(wa.code)
          setWaNum(wa.national)
        }
        if (p.major) setMajor(p.major)
        if (p.student_id_number) setStudentId(p.student_id_number)
      } catch {
        /* ignore */
      }
    })
  }, [navigate])

  const submit = async () => {
    if (saving) return
    if (!building || !floor) return setError('Please choose your building and floor.')
    setError('')
    setSaving(true)
    try {
      await completeProfile({
        building,
        floor,
        room_number: room.trim() || undefined,
        batch_year: batch ? Number(batch) : undefined,
        class_standing: standing || undefined,
        major: major || undefined,
        whatsapp_number: joinWa(waCode, waNum) || undefined,
        student_id_number: studentId.trim() || undefined,
      })
      // belt-and-braces: re-read the profile and confirm the save actually
      // stuck before letting the user in — no more silent losses
      const check = await getMyProfile()
      if (!check || check.building !== building || check.floor !== floor) {
        throw new Error('The save did not persist — please try again. If it keeps happening, log out and back in.')
      }
      navigate('/app', { replace: true })
    } catch (e) {
      setError(errMsg(e))
      setSaving(false)
    }
  }

  return (
    <div style={rootStyle}>
      <div style={{ width: '100%', maxWidth: 480, background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '30px 30px 28px', boxShadow: '0 30px 70px -30px rgba(0,0,0,.4)', animation: 'lok-rise-lg .4s ease both' }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A927F', letterSpacing: '.08em', marginBottom: 8 }}>
          {name ? `${t('WELCOME,')} ${name.toUpperCase()}` : t('ALMOST THERE')}
        </div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 27, letterSpacing: '-.02em', margin: '0 0 6px' }}>{t('Complete your profile')}</h1>
        <p style={{ fontSize: 13.5, color: '#5F6063', lineHeight: 1.55, margin: '0 0 22px' }}>
          {t('Tell neighbours where to find you. You can get your Dorm-Verified badge later from your profile.')}
        </p>

        {error && (
          <div style={{ background: '#FBEEE9', border: '1px solid #E4C4B8', color: '#B23A1B', fontSize: 12.5, fontWeight: 600, borderRadius: 0, padding: '10px 13px', marginBottom: 16, lineHeight: 1.45 }}>{t(error)}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>{t('DORM BUILDING *')}</div>
              <select
                value={building}
                onChange={(e) => {
                  setBuilding(e.target.value as BuildingCode)
                  setFloor('') // reset floor — options differ per building
                }}
                className="lok-field"
                style={{ ...field, fontWeight: 600 }}
              >
                <option value="" disabled>{t('Select…')}</option>
                {BUILDINGS.map((b) => <option key={b.v} value={b.v}>{t(b.label)}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>{t('FLOOR *')}</div>
              <select value={floor} onChange={(e) => setFloor(e.target.value as FloorCode)} disabled={!building} className="lok-field" style={{ ...field, fontWeight: 600, opacity: building ? 1 : 0.55 }}>
                <option value="" disabled>{building ? t('Select…') : t('Pick building first')}</option>
                {(building ? FLOORS_BY_BUILDING[building] : []).map((fl) => <option key={fl.v} value={fl.v}>{t(fl.label)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>{t('ROOM NUMBER')}</div>
              <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder={t('e.g. T-108')} className="lok-field" style={field} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>{t('BATCH / YEAR')}</div>
              <select value={batch} onChange={(e) => setBatch(e.target.value)} className="lok-field" style={{ ...field, fontWeight: 600 }}>
                <option value="">{t('Select…')}</option>
                {BATCH_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* the dial-code + number combo needs ~220px — on narrow phones it
              wraps to its own full-width row instead of cropping the number */}
          <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px' }}>
              <div style={cap}>{t('CLASS STANDING')}</div>
              <select value={standing} onChange={(e) => setStanding(e.target.value as ClassStanding)} className="lok-field" style={{ ...field, fontWeight: 600 }}>
                <option value="">{t('Select…')}</option>
                {STANDINGS.map((s) => <option key={s.v} value={s.v}>{t(s.label)}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <div style={cap}>{t('WHATSAPP')}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  value={waCode}
                  onChange={(e) => setWaCode(e.target.value)}
                  className="lok-field"
                  style={{ ...field, width: 92, flex: 'none', fontWeight: 600, padding: '12px 6px' }}
                >
                  {DIAL_CODES.map((d) => <option key={d.code} value={d.code}>{d.flag} {d.code}</option>)}
                </select>
                <input
                  value={waNum}
                  onChange={(e) => setWaNum(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="812 3456 7890"
                  inputMode="numeric"
                  className="lok-field"
                  style={{ ...field, flex: 1, minWidth: 0 }}
                />
              </div>
            </div>
          </div>

          <div>
            <div style={cap}>{t('MAJOR')}</div>
            <select value={major} onChange={(e) => setMajor(e.target.value)} className="lok-field" style={{ ...field, fontWeight: 600 }}>
              <option value="">{t('Select…')}</option>
              {MAJORS.map((m) => <option key={m} value={m}>{t(m)}</option>)}
            </select>
          </div>

          <div>
            <div style={cap}>{t('STUDENT ID NUMBER (optional)')}</div>
            <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder={t('e.g. 2027-01-1234')} className="lok-field" style={field} />
          </div>

        </div>

        <button
          onClick={submit}
          className="lok-btn"
          style={{ width: '100%', border: 'none', background: 'var(--accent,#000000)', color: '#F5F1E8', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 0, cursor: 'pointer', boxShadow: '0 10px 24px -10px rgba(0,0,0,.8)', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
        >
          {saving ? (
            <span className="lok-spin" style={{ width: 16, height: 16, border: '2px solid rgba(245,241,232,.4)', borderTopColor: '#F5F1E8', borderRadius: '50%', display: 'inline-block' }} />
          ) : (
            t('Enter the marketplace')
          )}
        </button>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <span onClick={() => navigate('/app', { replace: true })} className="lok-link" style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#8B8B86' }}>{t('Skip for now')}</span>
        </div>
      </div>
    </div>
  )
}
