import { useEffect } from 'react'
import type { RefObject } from 'react'

// Close floating menus the way people expect: tapping or clicking anywhere
// outside the menu (or pressing Escape) dismisses it. Pass every element that
// counts as "inside" — the menu itself plus the button that toggles it, so the
// toggle doesn't close-then-reopen on the same tap.
export function useClickOutside(refs: Array<RefObject<HTMLElement | null>>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (refs.some((r) => r.current && r.current.contains(target))) return
      onOutside()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutside()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
