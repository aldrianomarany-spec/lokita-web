import { useM } from '../context'
import { BUILDINGS, FLOORS, STANDINGS } from '../../theme'
import Overlay, { stop } from './Overlay'

const fieldBase: React.CSSProperties = {
  width: '100%',
  background: '#F4EFE5',
  border: '1.5px solid #E4DDCE',
  borderRadius: 12,
  padding: '12px 15px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  fontWeight: 500,
  color: '#201E18',
}
const cap: React.CSSProperties = {
  fontFamily: "'Spline Sans Mono',monospace",
  fontSize: 9.5,
  color: '#A29C8B',
  letterSpacing: '.06em',
  marginBottom: 6,
}

export default function EditProfileModal() {
  const { state, closeEdit, setPf, savePf, pickPhoto } = useM()
  const pf = state.pf
  const profileInitial = (state.profile.name || 'A').trim().charAt(0).toUpperCase()

  return (
    <Overlay onClose={closeEdit}>
      <div onClick={stop} style={{ background: '#FBF8F1', borderRadius: 26, padding: '30px 32px', width: '100%', maxWidth: 500, animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(32,30,24,.5)', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, margin: 0 }}>Edit profile</h2>
          <button onClick={closeEdit} className="lok-navi" style={{ border: '1px solid #E4DDCE', background: '#F4EFE5', width: 34, height: 34, borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#5A5648' }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#8A8578', fontWeight: 600, margin: '0 0 18px' }}>Keep your details current so neighbours know they can trust the trade.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <div style={{ width: 66, height: 66, borderRadius: 20, background: 'var(--accent,#2A5FA8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F7F3EA', fontWeight: 800, fontSize: 26, fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden', flex: 'none' }}>
            {state.photo ? <img src={state.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profileInitial}
          </div>
          <div>
            <button onClick={pickPhoto} className="lok-btn" style={{ border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '9px 14px', borderRadius: 11, cursor: 'pointer' }}>Change photo</button>
            <div style={{ fontSize: 11, color: '#A29C8B', fontWeight: 500, marginTop: 6 }}>JPG or PNG · shown on all your listings</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={cap}>FULL NAME</div>
            <input className="lok-field" value={pf.name} onChange={(e) => setPf('name', e.target.value)} style={fieldBase} />
          </div>
          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>STUDENT ID</div>
              <input className="lok-field" value={pf.studentId} onChange={(e) => setPf('studentId', e.target.value)} style={fieldBase} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>WHATSAPP</div>
              <input className="lok-field" value={pf.whatsapp} onChange={(e) => setPf('whatsapp', e.target.value)} style={fieldBase} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>DORM BUILDING</div>
              <select className="lok-field" value={pf.building} onChange={(e) => setPf('building', e.target.value)} style={{ ...fieldBase, fontWeight: 600 }}>
                {BUILDINGS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>ROOM</div>
              <input className="lok-field" value={pf.room} onChange={(e) => setPf('room', e.target.value)} style={fieldBase} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={cap}>FLOOR</div>
              <select className="lok-field" value={pf.floor} onChange={(e) => setPf('floor', e.target.value)} style={{ ...fieldBase, fontWeight: 600 }}>
                {FLOORS.map((fl) => (
                  <option key={fl}>{fl}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={cap}>BATCH / YEAR</div>
              <input className="lok-field" value={pf.batch} onChange={(e) => setPf('batch', e.target.value)} style={fieldBase} />
            </div>
          </div>
          <div>
            <div style={cap}>CLASS STANDING</div>
            <select className="lok-field" value={pf.standing} onChange={(e) => setPf('standing', e.target.value)} style={{ ...fieldBase, fontWeight: 600 }}>
              {STANDINGS.map((st) => (
                <option key={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 11, marginTop: 20 }}>
          <button onClick={closeEdit} className="lok-btn" style={{ flex: 'none', border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '13px 20px', borderRadius: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={savePf} className="lok-btn" style={{ flex: 1, border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 13, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(27,94,67,.7)' }}>Save changes</button>
        </div>
      </div>
    </Overlay>
  )
}
