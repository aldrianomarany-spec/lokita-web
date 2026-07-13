// Banned-word filter — keeps listings, requests and chat clean of scams,
// gambling, drugs and abuse. Checked client-side at every post/send call
// site; matches whole words (case-insensitive) so "class" never trips "ass".
const BANNED = [
  // scams & gambling
  'judol', 'judi', 'togel', 'slot gacor', 'pinjol',
  // drugs
  'narkoba', 'ganja', 'sabu', 'kokain', 'heroin', 'weed', 'cocaine',
  // adult
  'porn', 'porno', 'bokep', 'bugil',
  // abuse — Indonesian
  'anjing', 'bangsat', 'babi', 'kontol', 'memek', 'ngentot', 'goblok', 'tolol', 'kampret', 'bajingan',
  // abuse — English
  'fuck', 'fucking', 'bitch', 'asshole', 'whore', 'slut', 'nigger', 'faggot',
  // weapons
  'senjata api', 'pistol', 'revolver', 'amunisi',
]

export function findBannedWord(text: string): string | null {
  const t = ' ' + text.toLowerCase().replace(/[^a-z0-9À-ɏ]+/gi, ' ') + ' '
  for (const w of BANNED) {
    if (t.includes(' ' + w + ' ')) return w
  }
  return null
}

// throws a bilingual error the UI alert can show as-is
export function assertClean(...texts: (string | null | undefined)[]): void {
  for (const x of texts) {
    const hit = x ? findBannedWord(x) : null
    if (hit) {
      throw new Error(`Blocked word / kata terlarang: "${hit}". Keep LOKITA friendly and legal · Jaga LOKITA tetap ramah dan legal.`)
    }
  }
}
