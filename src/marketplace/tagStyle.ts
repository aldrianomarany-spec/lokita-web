import type { Item } from '../types'

// Feed/detail corner tag derived from an item's category.
export function tagStyle(it: Pick<Item, 'cat'>): {
  tag: string
  tagBg: string
  tagFg: string
} {
  if (it.cat === 'Bundles') return { tag: 'GRAD BUNDLE', tagBg: '#EFEFDD', tagFg: '#7E8154' }
  return { tag: '', tagBg: '', tagFg: '' }
}
