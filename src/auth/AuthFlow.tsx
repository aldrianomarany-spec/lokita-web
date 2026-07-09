import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACCENT, ACCENT_DEEP } from '../theme'
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  getSession,
  getMyProfile,
  resetPassword,
  isProfileComplete,
  onAuthStateChange,
} from '../lib/auth'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.')

type View = 'login' | 'signup' | 'forgot' | 'reset'

const Spinner = () => (
  <span
    className="lok-spin"
    style={{
      width: 16,
      height: 16,
      border: '2px solid rgba(245,241,232,.4)',
      borderTopColor: '#F5F1E8',
      borderRadius: '50%',
      display: 'inline-block',
    }}
  />
)

const LocMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--accent,#2A5FA8)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21c5-5 8-8.4 8-12a8 8 0 1 0-16 0c0 3.6 3 7 8 12z" />
    <circle cx="12" cy="9" r="3" />
  </svg>
)

const perks = [
  {
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 1.8 3-.2 1 2.8 2.6 1.5-.7 2.9L23 12l-1.7 2.4.7 2.9-2.6 1.5-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L2.7 16.3l.7-2.9L1 12l1.7-2.4L2 6.7l2.6-1.5 1-2.8 3 .2z" />
      </svg>
    ),
    label: 'Every trader is a dorm-verified student',
  },
  {
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 4 6v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    label: 'Escrow payments held until pickup',
  },
  {
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21c4-4 7-7.4 7-11a7 7 0 1 0-14 0c0 3.6 3 7 7 11z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
    ),
    label: 'Collect at the campus Security Post',
  },
]

const eyeOpen = (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const eyeOff = (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A11 11 0 0 1 23 12s-1.3 2.3-3.6 4.1M6.6 6.6C3.7 8.3 1 12 1 12s4 7 11 7c2 0 3.7-.6 5.2-1.4" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)

const fieldWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: '#FBF8F1',
  border: '1.5px solid #E4DDCE',
  borderRadius: 13,
  padding: '13px 15px',
}
const inputStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  background: 'none',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 500,
  color: '#201E18',
  width: '100%',
}
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 700,
  color: '#3A362C',
  marginBottom: 7,
}
const primaryBtn: React.CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'var(--accent,#2A5FA8)',
  color: '#F5F1E8',
  fontFamily: 'inherit',
  fontWeight: 700,
  fontSize: 15,
  padding: 14,
  borderRadius: 13,
  cursor: 'pointer',
  boxShadow: '0 10px 24px -10px rgba(42,95,168,.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
}
const linkStyle: React.CSSProperties = {
  cursor: 'pointer',
  fontWeight: 700,
  color: 'var(--accent,#2A5FA8)',
}

// brand accent (tweakable). CSS custom properties aren't in React.CSSProperties.
const authRootStyle = {
  '--accent': ACCENT,
  '--accent-deep': ACCENT_DEEP,
  height: '100vh',
  overflow: 'hidden',
  background: '#F1ECE1',
  position: 'relative',
} as React.CSSProperties

export default function AuthFlow() {
  const navigate = useNavigate()
  // "?signup=1" (from guest mode's sign-up prompts) skips the splash and opens
  // the signup form directly.
  const wantSignup = useRef(new URLSearchParams(window.location.search).has('signup')).current
  const [screen, setScreen] = useState<'splash' | 'login'>(wantSignup ? 'login' : 'splash')
  const [splashLeaving, setSplashLeaving] = useState(false)
  const [view, setView] = useState<View>(wantSignup ? 'signup' : 'login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [f, setF] = useState({ user: '', pass: '', name: '', email: '', np: '', cp: '', fEmail: '' })
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (wantSignup) return // no splash when jumping straight to signup
    timers.current.push(window.setTimeout(() => setSplashLeaving(true), 1900))
    timers.current.push(window.setTimeout(() => setScreen('login'), 2350))
    return () => timers.current.forEach(clearTimeout)
  }, [wantSignup])

  // Guest mode: browse the marketplace without an account (read-only).
  const browseAsGuest = () => {
    sessionStorage.setItem('lokita-guest', '1')
    navigate('/app')
  }

  // Already signed in (returning user, or back from Google OAuth)? Skip the
  // auth UI and route by whether onboarding is done. The OAuth return stores
  // the session asynchronously AFTER first render, so a one-shot getSession()
  // check misses it — we also subscribe to auth state changes and route the
  // moment the session lands (fixes "Google login bounces back to login").
  useEffect(() => {
    let active = true
    let routed = false
    const route = async () => {
      if (routed) return
      routed = true
      sessionStorage.removeItem('lokita-guest') // a real session replaces guest mode
      try {
        const p = await getMyProfile()
        if (active) navigate(isProfileComplete(p) ? '/app' : '/onboarding', { replace: true })
      } catch {
        // session exists but the profile read failed — send them to onboarding
        // rather than stranding them on the login screen
        if (active) navigate('/onboarding', { replace: true })
      }
    }
    getSession().then((session) => {
      if (session) route()
    })
    const unsub = onAuthStateChange((session) => {
      if (session) route()
    })
    return () => {
      active = false
      unsub()
    }
  }, [navigate])

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }))

  const goView = (v: View) => () => {
    setView(v)
    setLoading('')
    setError('')
  }

  // ---- real auth handlers ----
  const doLogin = async () => {
    if (loading) return
    setError('')
    setLoading('login')
    try {
      await signInWithEmail({ email: f.user.trim(), password: f.pass })
      const p = await getMyProfile()
      navigate(isProfileComplete(p) ? '/app' : '/onboarding')
    } catch (e) {
      setError(errMsg(e))
      setLoading('')
    }
  }

  const doSignup = async () => {
    if (loading) return
    if (!f.name.trim()) return setError('Please enter your name.')
    if (!f.email.trim()) return setError('Please enter your email.')
    if (f.np.length < 6) return setError('Password must be at least 6 characters.')
    if (f.np !== f.cp) return setError('Passwords do not match.')
    setError('')
    setLoading('signup')
    try {
      const res = await signUpWithEmail({ name: f.name.trim(), email: f.email.trim(), password: f.np })
      if (!res.session) {
        // email confirmation is on — no session yet
        setLoading('')
        setView('login')
        setError('Account created. Check your email to confirm, then log in.')
        return
      }
      navigate('/onboarding')
    } catch (e) {
      setError(errMsg(e))
      setLoading('')
    }
  }

  const doGoogle = async () => {
    if (loading) return
    setError('')
    setLoading('login')
    try {
      // redirects away to Google; the session-bootstrap effect handles the return
      await signInWithGoogle(window.location.origin)
    } catch (e) {
      setError(errMsg(e))
      setLoading('')
    }
  }

  const doReset = async () => {
    if (loading) return
    if (!f.fEmail.trim()) return setError('Please enter your email.')
    setError('')
    setLoading('reset')
    try {
      await resetPassword(f.fEmail.trim())
      setView('reset')
      setLoading('')
    } catch (e) {
      setError(errMsg(e))
      setLoading('')
    }
  }

  const cpMismatch = f.cp.length > 0 && f.np !== f.cp
  const btn = (key: string, idle: string) => (loading === key ? <Spinner /> : idle)

  const errorBanner = error ? (
    <div style={{ background: '#FBEEE9', border: '1px solid #E4C4B8', color: '#B23A1B', fontSize: 12.5, fontWeight: 600, borderRadius: 11, padding: '10px 13px', marginBottom: 16, lineHeight: 1.45 }}>
      {error}
    </div>
  ) : null

  return (
    <div style={authRootStyle}>
      {/* ================= SPLASH ================= */}
      {screen === 'splash' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            background: 'var(--accent,#2A5FA8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: splashLeaving ? 'lok-splashout .45s ease forwards' : 'none',
          }}
        >
          <div style={{ position: 'absolute', top: -80, left: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
          <div style={{ position: 'absolute', bottom: -120, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
          <div style={{ animation: 'lok-pop-lg .6s cubic-bezier(.2,.9,.3,1.2) both', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: '#F5F1E8', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 50px -18px rgba(0,0,0,.5)', position: 'relative' }}>
              <LocMark size={46} />
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 38, letterSpacing: '.02em', color: '#F5F1E8', marginTop: 22 }}>LOKITA</div>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: 'rgba(245,241,232,.7)', letterSpacing: '.34em', marginTop: 6 }}>LOKAL · KITA</div>
          </div>
          <div style={{ position: 'absolute', bottom: 72, width: 180, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#F5F1E8', borderRadius: 3, animation: 'lok-load 1.9s cubic-bezier(.5,0,.2,1) forwards' }} />
          </div>
          <div style={{ position: 'absolute', bottom: 44, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: 'rgba(245,241,232,.55)', letterSpacing: '.12em' }}>SETTING UP YOUR NEIGHBOURHOOD…</div>
        </div>
      )}

      {/* ================= AUTH (split) ================= */}
      <div style={{ height: '100%', display: 'flex', animation: 'lok-fade .5s ease both' }}>
        {/* LEFT BRAND PANEL */}
        <div
          className="lok-authbrand"
          style={{ width: '44%', flex: 'none', background: 'var(--accent,#2A5FA8)', color: '#EAF0F8', padding: '48px 46px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -90, right: -70, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
          <div style={{ position: 'absolute', bottom: -140, left: -60, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: '#F5F1E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LocMark size={22} />
            </div>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 21, letterSpacing: '-.01em', color: '#F5F1E8', lineHeight: 1 }}>LOKITA</div>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: 'rgba(245,241,232,.65)', letterSpacing: '.16em', marginTop: 2 }}>LOKAL · KITA</div>
            </div>
          </div>
          <div style={{ marginTop: 'auto', position: 'relative' }}>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: 'rgba(245,241,232,.7)', letterSpacing: '.1em', marginBottom: 16 }}>THE DORM MARKETPLACE · JIU CIKARANG</div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 40, lineHeight: 1.08, letterSpacing: '-.025em', margin: 0, color: '#F8F5EE' }}>Buy &amp; sell with the students next door.</h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(234,240,248,.82)', margin: '18px 0 0', maxWidth: 400 }}>Trade furniture, gadgets and textbooks with verified neighbours in your building. Pay in-app, pick up at the Security Post.</p>
          </div>
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
            {perks.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: '#F5F1E8' }}>{p.icon}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#EAF0F8' }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 396 }}>
            {view === 'login' && (
              <div style={{ animation: 'lok-rise-lg .4s ease both' }}>
                <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A927F', letterSpacing: '.08em', marginBottom: 8 }}>WELCOME BACK</div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-.02em', margin: '0 0 22px' }}>Log in to Lokita</h2>

                {errorBanner}
                <label style={labelStyle}>Email address</label>
                <div className="lok-in" style={{ ...fieldWrap, marginBottom: 15 }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#A29C8B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3 7 9 6 9-6" /></svg>
                  <input value={f.user} onChange={set('user')} type="email" placeholder="you@jiu.ac" style={inputStyle} onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#3A362C' }}>Password</label>
                  <span onClick={goView('forgot')} className="lok-link" style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--accent,#2A5FA8)' }}>Forgot password?</span>
                </div>
                <div className="lok-in" style={{ ...fieldWrap, marginBottom: 22 }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#A29C8B" strokeWidth={2} strokeLinecap="round"><rect x="4" y="10" width="16" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                  <input value={f.pass} onChange={set('pass')} type={showPw ? 'text' : 'password'} placeholder="••••••••" style={inputStyle} onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }} />
                  <span onClick={() => setShowPw(!showPw)} style={{ cursor: 'pointer', color: '#A29C8B', display: 'flex' }}>{showPw ? eyeOff : eyeOpen}</span>
                </div>

                <button className="lok-btn" onClick={doLogin} style={primaryBtn}>{btn('login', 'Log in')}</button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#E4DDCE' }} />
                  <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em' }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: '#E4DDCE' }} />
                </div>

                <button className="lok-btn" onClick={doGoogle} style={{ width: '100%', border: '1.5px solid #E4DDCE', background: '#FBF8F1', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11 }}>
                  <svg width={18} height={18} viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7C43.9 37.9 46.5 31.7 46.5 24.5z" /><path fill="#FBBC05" d="M10.4 28.3c-.5-1.4-.8-3-.8-4.3s.3-2.9.8-4.3l-7.8-6.1C.9 16.8 0 20.3 0 24s.9 7.2 2.6 10.4l7.8-6.1z" /><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.6l-7.3-5.7c-2 1.4-4.7 2.3-7.9 2.3-6.3 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
                  Continue with Google
                </button>

                <div style={{ textAlign: 'center', marginTop: 26, fontSize: 13.5, color: '#6F6A5C', fontWeight: 500 }}>New to Lokita? <span onClick={goView('signup')} className="lok-link" style={linkStyle}>Create an account</span></div>
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#8A8578', fontWeight: 500 }}>Just looking? <span onClick={browseAsGuest} className="lok-link" style={{ ...linkStyle, color: '#6F6A5C' }}>Browse as guest →</span></div>
              </div>
            )}

            {view === 'signup' && (
              <div style={{ animation: 'lok-rise-lg .4s ease both' }}>
                <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A927F', letterSpacing: '.08em', marginBottom: 8 }}>JOIN YOUR DORM</div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-.02em', margin: '0 0 22px' }}>Create your account</h2>

                {errorBanner}
                <label style={labelStyle}>Full name</label>
                <div className="lok-in" style={{ ...fieldWrap, padding: '12px 15px', marginBottom: 13 }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#A29C8B" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 21c0-4 3.5-6 7-6s7 2 7 6" /></svg>
                  <input value={f.name} onChange={set('name')} placeholder="Aldriano" style={inputStyle} />
                </div>

                <label style={labelStyle}>Email</label>
                <div className="lok-in" style={{ ...fieldWrap, padding: '12px 15px', marginBottom: 13 }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#A29C8B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3 7 9 6 9-6" /></svg>
                  <input value={f.email} onChange={set('email')} placeholder="you@jiu.ac" style={inputStyle} />
                </div>

                <div style={{ display: 'flex', gap: 11, marginBottom: 22 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Password</label>
                    <div className="lok-in" style={{ display: 'flex', alignItems: 'center', background: '#FBF8F1', border: '1.5px solid #E4DDCE', borderRadius: 13, padding: '12px 14px' }}>
                      <input value={f.np} onChange={set('np')} type="password" placeholder="••••••" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Confirm</label>
                    <div className="lok-in" style={{ display: 'flex', alignItems: 'center', background: '#FBF8F1', border: `1.5px solid ${cpMismatch ? '#D4562F' : '#E4DDCE'}`, borderRadius: 13, padding: '12px 14px' }}>
                      <input value={f.cp} onChange={set('cp')} type="password" placeholder="••••••" style={inputStyle} />
                    </div>
                  </div>
                </div>

                <button className="lok-btn" onClick={doSignup} style={primaryBtn}>{btn('signup', 'Create account')}</button>

                <div style={{ fontSize: 11.5, color: '#9A927F', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>By creating an account you agree to Lokita's <a href="#">Community Rules</a> &amp; dorm verification.</div>
                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: '#6F6A5C', fontWeight: 500 }}>Already a member? <span onClick={goView('login')} className="lok-link" style={linkStyle}>Log in</span></div>
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#8A8578', fontWeight: 500 }}>Just looking? <span onClick={browseAsGuest} className="lok-link" style={{ ...linkStyle, color: '#6F6A5C' }}>Browse as guest →</span></div>
              </div>
            )}

            {view === 'forgot' && (
              <div style={{ animation: 'lok-rise-lg .4s ease both' }}>
                <span onClick={goView('login')} className="lok-link" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#6F6A5C', marginBottom: 22 }}>
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>Back to log in
                </span>
                <div style={{ width: 52, height: 52, borderRadius: 15, background: '#EEF3FA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent,#2A5FA8)', marginBottom: 18 }}>
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="4" y="10" width="16" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                </div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 27, letterSpacing: '-.02em', margin: '0 0 8px' }}>Forgot password?</h2>
                <p style={{ fontSize: 14, color: '#6F6A5C', lineHeight: 1.6, margin: '0 0 24px' }}>Enter the email tied to your Lokita account and we'll send you a secure reset link.</p>

                {errorBanner}
                <label style={labelStyle}>Registered email</label>
                <div className="lok-in" style={{ ...fieldWrap, marginBottom: 22 }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#A29C8B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3 7 9 6 9-6" /></svg>
                  <input value={f.fEmail} onChange={set('fEmail')} placeholder="you@jiu.ac" style={inputStyle} />
                </div>
                <button className="lok-btn" onClick={doReset} style={primaryBtn}>{btn('reset', 'Send reset link')}</button>
              </div>
            )}

            {view === 'reset' && (
              <div style={{ animation: 'lok-pop-lg .4s ease both', textAlign: 'center' }}>
                <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#E7F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B7A4B', margin: '0 auto 22px' }}>
                  <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3 7 9 6 9-6" /><path d="m14 15 2 2 4-4" stroke="#1B7A4B" /></svg>
                </div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', margin: '0 0 10px' }}>Check your inbox</h2>
                <p style={{ fontSize: 14, color: '#6F6A5C', lineHeight: 1.65, margin: '0 0 8px' }}>We sent a password reset link to</p>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#201E18', marginBottom: 22, wordBreak: 'break-all' }}>{f.fEmail || 'you@jiu.ac'}</div>
                <div style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 14, padding: '14px 16px', fontSize: 12.5, color: '#6F6A5C', lineHeight: 1.55, marginBottom: 24, textAlign: 'left' }}>The link expires in 30 minutes. Didn't get it? Check spam, or <span onClick={doReset} className="lok-link" style={linkStyle}>resend</span>.</div>
                <button className="lok-btn" onClick={goView('login')} style={{ ...primaryBtn, boxShadow: '0 10px 24px -10px rgba(42,95,168,.8)' }}>Back to log in</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
