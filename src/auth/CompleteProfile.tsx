import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACCENT, ACCENT_DEEP } from '../theme'
import {
  getSession,
  getMyProfile,
  completeProfile,
  uploadVerificationDoc,
  type BuildingCode,
  type ClassStanding,
  type FloorCode,
} from '../lib/auth'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.')

const rootStyle = {
  '--accent': ACCENT,
  '--accent-deep': ACCENT_DEEP,
  minHeight: '100vh',
  background: '#F1ECE1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
} as React.CSSProperties

const cap: React.CSSProperties = {
  fontFamily: "'Spline Sans Mono',monospace",
  fontSize: 9.5,
  color: '#A29C8B',
  letterSpacing: '.06em',
  marginBottom: 6,
}
const field: React.CSSProperties = {
  width: '100%',
  background: '#F4EFE5',
  border: '1.5px solid #E4DDCE',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  fontWeight: 500,
  color: '#201E18',
}

const BUILDINGS: { v: BuildingCode; label: string }[] = [
  { v: 'thomas', label: 'Thomas Building' },
  { v: 'union', label: 'Union Building' },
  { v: 'elizabeth', label: 'Elizabeth Building' },
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
}
const STANDINGS: { v: ClassStanding; label: string }[] = [
  { v: 'freshman', label: 'Freshman' },
  { v: 'sophomore', label: 'Sophomore' },
  { v: 'junior', label: 'Junior' },
  { v: 'senior', label: 'Senior' },
]

export default function CompleteProfile() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [building, setBuilding] = useState<BuildingCode | ''>('')
  const [floor, setFloor] = useState<FloorCode | ''>('')
  const [room, setRoom] = useState('')
  const [batch, setBatch] = useState('')
  const [standing, setStanding] = useState<ClassStanding | ''>('')
  const [whatsapp, setWhatsapp] = useState('')
  const [docName, setDocName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const fileRef2 = useRef<File | null>(null)

  // must be signed in; prefill the name from the profile the trigger created
  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) {
        navigate('/', { replace: true })
        return
      }
      try {
        const p = await getMyProfile()
        if (p?.name) setName(p.name)
      } catch {
        /* ignore */
      }
    })
  }, [navigate])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    fileRef2.current = file
    setDocName(file ? file.name : '')
  }

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
        whatsapp_number: whatsapp.trim() || undefined,
      })
      if (fileRef2.current) await uploadVerificationDoc(fileRef2.current)
      navigate('/app', { replace: true })
    } catch (e) {
      setError(errMsg(e))
      setSaving(false)
    }
  }

  return (
    <div style={rootStyle}>
      <div style={{ width: '100%', maxWidth: 480, background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 24, padding: '30px 30px 28px', boxShadow: '0 30px 70px -30px rgba(32,30,24,.4)', animation: 'lok-rise-lg .4s ease both' }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A927F', letterSpacing: '.08em', marginBottom: 8 }}>
          {name ? `WELCOME, ${name.toUpperCase()}` : 'ALMOST THERE'}
        </div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 27, letterSpacing: '-.02em', margin: '0 0 6px' }}>Complete your profile</h1>
        <p style={{ fontSize: 13.5, color: '#6F6A5C', lineHeight: 1.55, margin: '0 0 22px' }}>
          Tell neighbours where to find you and upload your student ID so we can verify you're a real JIU dorm resident.
        </p>

        {error && (
          <div style={{ background: '#FBEEE9', border: '1px solid #E4C4B8', color: '#B23A1B', fontSize: 12.5, fontWeight: 600, borderRadius: 11, padding: '10px 13px', marginBottom: 16, lineHeight: 1.45 }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>DORM BUILDING *</div>
              <select
                value={building}
                onChange={(e) => {
                  setBuilding(e.target.value as BuildingCode)
                  setFloor('') // reset floor — options differ per building
                }}
                className="lok-field"
                style={{ ...field, fontWeight: 600 }}
              >
                <option value="" disabled>Select…</option>
                {BUILDINGS.map((b) => <option key={b.v} value={b.v}>{b.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>FLOOR *</div>
              <select value={floor} onChange={(e) => setFloor(e.target.value as FloorCode)} disabled={!building} className="lok-field" style={{ ...field, fontWeight: 600, opacity: building ? 1 : 0.55 }}>
                <option value="" disabled>{building ? 'Select…' : 'Pick building first'}</option>
                {(building ? FLOORS_BY_BUILDING[building] : []).map((fl) => <option key={fl.v} value={fl.v}>{fl.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>ROOM NUMBER</div>
              <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. T-108" className="lok-field" style={field} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>BATCH / YEAR</div>
              <input value={batch} onChange={(e) => setBatch(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g. 2027" inputMode="numeric" className="lok-field" style={field} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>CLASS STANDING</div>
              <select value={standing} onChange={(e) => setStanding(e.target.value as ClassStanding)} className="lok-field" style={{ ...field, fontWeight: 600 }}>
                <option value="">Select…</option>
                {STANDINGS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>WHATSAPP</div>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+62 812-…" className="lok-field" style={field} />
            </div>
          </div>

          <div>
            <div style={cap}>STUDENT ID PHOTO (for verification)</div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
            <button
              onClick={() => fileRef.current?.click()}
              className="lok-btn"
              style={{ width: '100%', border: '1.5px dashed #C9BFA8', background: '#F4EFE5', color: docName ? '#201E18' : '#8A8578', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, padding: '13px 14px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
            >
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-4-4-9 8" /></svg>
              {docName || 'Upload a photo of your student ID'}
            </button>
            <div style={{ fontSize: 11, color: '#A29C8B', fontWeight: 500, marginTop: 6 }}>Private — only you and admins can see this. Reviewed for your Dorm-Verified badge.</div>
          </div>
        </div>

        <button
          onClick={submit}
          className="lok-btn"
          style={{ width: '100%', border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F5F1E8', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 13, cursor: 'pointer', boxShadow: '0 10px 24px -10px rgba(42,95,168,.8)', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
        >
          {saving ? (
            <span className="lok-spin" style={{ width: 16, height: 16, border: '2px solid rgba(245,241,232,.4)', borderTopColor: '#F5F1E8', borderRadius: '50%', display: 'inline-block' }} />
          ) : (
            'Enter the marketplace'
          )}
        </button>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <span onClick={() => navigate('/app', { replace: true })} className="lok-link" style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#8A8578' }}>Skip for now</span>
        </div>
      </div>
    </div>
  )
}
