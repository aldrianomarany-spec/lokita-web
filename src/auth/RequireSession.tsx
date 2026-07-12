import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, onAuthStateChange } from '../lib/auth'

// Gate for authenticated routes: lets a session OR explicit guest mode through
// (guest = read-only browsing, chosen on the login screen); otherwise redirects
// to the login flow. Reacts to sign-out from another tab too.
const isGuest = () => sessionStorage.getItem('lokita-guest') === '1'

export default function RequireSession({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'checking' | 'ok'>('checking')

  useEffect(() => {
    let active = true
    getSession().then((session) => {
      if (!active) return
      if (session || isGuest()) setStatus('ok')
      else navigate('/', { replace: true })
    })
    const unsub = onAuthStateChange((session) => {
      if (!session && !isGuest()) navigate('/', { replace: true })
    })
    return () => {
      active = false
      unsub()
    }
  }, [navigate])

  if (status === 'checking') {
    return (
      <div style={{ height: '100vh', background: '#ECECEA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span
          className="lok-spin"
          style={{ width: 26, height: 26, border: '3px solid #D8D8D4', borderTopColor: '#000000', borderRadius: '50%', display: 'inline-block' }}
        />
      </div>
    )
  }
  return <>{children}</>
}
