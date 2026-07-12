import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACCENT, ACCENT_DEEP } from '../theme'
import { getSession, onAuthStateChange, updatePassword } from '../lib/auth'

// Landing page for the password-recovery email link. Supabase signs the user in
// via the link's token, then this page lets them set a new password — the
// standard "forgot password" experience.
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

const field: React.CSSProperties = {
  width: '100%',
  background: '#F5F5F3',
  border: '1.5px solid #D8D8D4',
  borderRadius: 0,
  padding: '13px 15px',
  fontSize: 14,
  fontFamily: 'inherit',
  fontWeight: 500,
  color: '#000000',
}

export default function ResetPassword() {
  const navigate = useNavigate()
  // 'waiting' while the recovery link's session is being established
  const [phase, setPhase] = useState<'waiting' | 'form' | 'invalid' | 'done'>('waiting')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getSession().then((s) => {
      if (active && s) setPhase('form')
    })
    const unsub = onAuthStateChange((s) => {
      if (active && s) setPhase('form')
    })
    // if no session materialises, the link is invalid/expired
    const t = window.setTimeout(() => {
      if (active) setPhase((p) => (p === 'waiting' ? 'invalid' : p))
    }, 4000)
    return () => {
      active = false
      unsub()
      window.clearTimeout(t)
    }
  }, [])

  const submit = async () => {
    if (saving) return
    if (pw.length < 6) return setError('Password must be at least 6 characters.')
    if (pw !== pw2) return setError('Passwords do not match.')
    setError('')
    setSaving(true)
    try {
      await updatePassword(pw)
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the password. Try again.')
      setSaving(false)
    }
  }

  return (
    <div style={rootStyle}>
      <div style={{ width: '100%', maxWidth: 420, background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '30px 30px 28px', boxShadow: '0 30px 70px -30px rgba(0,0,0,.4)', animation: 'lok-rise-lg .4s ease both' }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A927F', letterSpacing: '.08em', marginBottom: 8 }}>ACCOUNT SECURITY</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', margin: '0 0 6px' }}>Set a new password</h1>

        {phase === 'waiting' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 0 6px', color: '#5F6063', fontSize: 13.5, fontWeight: 600 }}>
            <span className="lok-spin" style={{ width: 18, height: 18, border: '2.5px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
            Checking your reset link…
          </div>
        )}

        {phase === 'invalid' && (
          <>
            <p style={{ fontSize: 13.5, color: '#5F6063', lineHeight: 1.6, margin: '4px 0 18px' }}>
              This reset link is invalid or has expired. Request a new one from the login screen.
            </p>
            <button onClick={() => navigate('/', { replace: true })} className="lok-btn" style={{ width: '100%', border: 'none', background: 'var(--accent,#000000)', color: '#F5F1E8', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 13, borderRadius: 0, cursor: 'pointer' }}>Back to login</button>
          </>
        )}

        {phase === 'form' && (
          <>
            <p style={{ fontSize: 13.5, color: '#5F6063', lineHeight: 1.6, margin: '4px 0 18px' }}>
              Choose a new password for your LOKITA account.
            </p>
            {error && (
              <div style={{ background: '#FBEEE9', border: '1px solid #E4C4B8', color: '#B23A1B', fontSize: 12.5, fontWeight: 600, borderRadius: 0, padding: '10px 13px', marginBottom: 14, lineHeight: 1.45 }}>{error}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min. 6 characters)" className="lok-field" style={field} />
              <input
                type="password" autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit()
                }}
                placeholder="Repeat new password"
                className="lok-field"
                style={field}
              />
            </div>
            <button onClick={submit} className="lok-btn" style={{ width: '100%', border: 'none', background: 'var(--accent,#000000)', color: '#F5F1E8', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 13, borderRadius: 0, cursor: 'pointer', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              {saving ? <span className="lok-spin" style={{ width: 16, height: 16, border: '2px solid rgba(245,241,232,.4)', borderTopColor: '#F5F1E8', borderRadius: '50%', display: 'inline-block' }} /> : 'Save new password'}
            </button>
          </>
        )}

        {phase === 'done' && (
          <>
            <p style={{ fontSize: 13.5, color: '#5F6063', lineHeight: 1.6, margin: '4px 0 18px' }}>
              Your password has been changed. You're signed in — welcome back! 🎉
            </p>
            <button onClick={() => navigate('/app', { replace: true })} className="lok-btn" style={{ width: '100%', border: 'none', background: 'var(--accent,#000000)', color: '#F5F1E8', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 13, borderRadius: 0, cursor: 'pointer' }}>Enter the marketplace</button>
          </>
        )}
      </div>
    </div>
  )
}
