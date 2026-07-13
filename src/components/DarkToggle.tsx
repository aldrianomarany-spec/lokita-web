import { useState } from 'react'
import { applyDark, isDark } from '../lib/darkmode'

// small moon/sun square that flips dark mode (beta) — sits next to the
// language toggle in the top bar and on the auth screens
export default function DarkToggle({ dark }: { dark?: boolean }) {
  const [on, setOn] = useState(isDark())
  return (
    <button
      onClick={() => {
        applyDark(!on)
        setOn(!on)
      }}
      title={on ? 'Light mode' : 'Dark mode'}
      aria-label={on ? 'Light mode' : 'Dark mode'}
      style={{
        flex: 'none',
        width: 33,
        height: 30,
        border: dark ? '1px solid #222222' : '1px solid #D8D8D4',
        background: dark ? '#141414' : '#FFFFFF',
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1,
        borderRadius: 0,
      }}
    >
      {on ? '☀️' : '🌙'}
    </button>
  )
}
