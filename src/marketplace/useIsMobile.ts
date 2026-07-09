import { useEffect, useState } from 'react'

// Reactive viewport check for the inline-styled components. `narrow` (<900) is
// where the sidebar is hidden; `phone` (<640) is where the top bar compacts and
// modals go full-screen. Subscribes to resize via matchMedia.
export function useMedia(maxWidth: number): boolean {
  const query = `(max-width: ${maxWidth}px)`
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export const useIsNarrow = () => useMedia(900) // sidebar hidden
export const useIsPhone = () => useMedia(640) // top bar compacts, modals full-screen
