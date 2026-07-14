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

// Contact-leak detector — phone numbers and WhatsApp links in chat move the
// trade (and LOKITA's fee) off-platform. Blocked until an order exists
// between the two people; after that, contact sharing is their business.
const CONTACT_PATTERNS: RegExp[] = [
  /(?:\+?62|0)8\d{2}[\s.-]?\d{3,4}[\s.-]?\d{3,5}/, // Indonesian mobile numbers
  /\bwa\.me\/|\bwhatsapp\.com\//i,
  /\b(?:wa|whatsapp)\b[\s:]*(?:\+?62|0)?8?\d{6,}/i, // "WA: 0812…"
  /\bt\.me\//i, // telegram links
]

export function findContactLeak(text: string): boolean {
  return CONTACT_PATTERNS.some((re) => re.test(text))
}

export const CONTACT_LEAK_MESSAGE =
  'Phone numbers & chat-app links are shared automatically after an order is placed — keeping trades inside LOKITA is what protects both of you. · Nomor HP & link chat dibagikan otomatis setelah pesanan dibuat — transaksi di dalam LOKITA yang melindungi kalian berdua.'

// throws a bilingual error the UI alert can show as-is
export function assertClean(...texts: (string | null | undefined)[]): void {
  for (const x of texts) {
    const hit = x ? findBannedWord(x) : null
    if (hit) {
      throw new Error(`Blocked word / kata terlarang: "${hit}". Keep LOKITA friendly and legal · Jaga LOKITA tetap ramah dan legal.`)
    }
  }
}
