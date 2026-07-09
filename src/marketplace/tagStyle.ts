import type { Item } from '../types'

// Feed/detail corner tag derived from an item's flags (matches the prototype).
export function tagStyle(it: Pick<Item, 'hot' | 'new' | 'cat'>): {
  tag: string
  tagBg: string
  tagFg: string
} {
  if (it.hot) return { tag: '🔥 HOT', tagBg: '#FBE3D8', tagFg: '#C24A22' }
  if (it.new) return { tag: 'NEW', tagBg: '#E7F1EA', tagFg: '#1B5E43' }
  if (it.cat === 'Bundles') return { tag: 'GRAD BUNDLE', tagBg: '#EFEFDD', tagFg: '#7E8154' }
  return { tag: '', tagBg: '', tagFg: '' }
}
