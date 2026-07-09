import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, onAuthStateChange } from '../lib/auth'

// Gate for authenticated routes: redirects to the login flow if there's no
// session, and reacts to sign-out (e.g. from another tab) by kicking back to /.
export default function RequireSession({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'checking' | 'ok'>('checking')

  useEffect(() => {
    let active = true
    getSession().then((session) => {
      if (!active) return
      if (session) setStatus('ok')
      else navigate('/', { replace: true })
    })
    const unsub = onAuthStateChange((session) => {
      if (!session) navigate('/', { replace: true })
    })
    return () => {
      active = false
      unsub()
    }
  }, [navigate])

  if (status === 'checking') {
    return (
      <div style={{ height: '100vh', background: '#F1ECE1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span
          className="lok-spin"
          style={{ width: 26, height: 26, border: '3px solid #DAD1BF', borderTopColor: '#2A5FA8', borderRadius: '50%', display: 'inline-block' }}
        />
      </div>
    )
  }
  return <>{children}</>
}
