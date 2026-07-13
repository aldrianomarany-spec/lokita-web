import { createContext, useContext, useState, type ReactNode } from 'react'
import { ID } from './i18n-id'

// Lightweight two-language support (English / Bahasa Indonesia).
// The English string IS the key: t('Log in') looks up the Indonesian
// translation and falls back to the English text when a key is missing —
// untranslated strings can never break the UI. Listings/chat content stays
// in whatever language the author wrote.
export type Lang = 'en' | 'id'

const KEY = 'lokita_lang'
const read = (): Lang => {
  try {
    return localStorage.getItem(KEY) === 'id' ? 'id' : 'en'
  } catch {
    return 'en'
  }
}

interface LangApi {
  lang: Lang
  setLang: (l: Lang) => void
  t: (s: string) => string
}

const Ctx = createContext<LangApi>({ lang: 'en', setLang: () => {}, t: (s) => s })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(read)
  const setLang = (l: Lang) => {
    try {
      localStorage.setItem(KEY, l)
    } catch {
      // private mode — the choice just won't survive a reload
    }
    setLangState(l)
  }
  const t = (s: string) => (lang === 'id' ? (ID[s] ?? s) : s)
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useLang = () => useContext(Ctx)

// small EN|ID switch used in the top bar and on the auth screens
export function LangToggle({ dark }: { dark?: boolean }) {
  const { lang, setLang } = useLang()
  const seg = (l: Lang, label: string) => (
    <button
      key={l}
      onClick={() => setLang(l)}
      aria-label={l === 'en' ? 'English' : 'Bahasa Indonesia'}
      style={{
        border: 'none',
        cursor: 'pointer',
        fontFamily: "'Spline Sans Mono',monospace",
        fontWeight: 700,
        fontSize: 10.5,
        letterSpacing: '.04em',
        padding: '6px 9px',
        borderRadius: 0,
        background: lang === l ? '#519BB8' : 'transparent',
        color: lang === l ? '#FFFFFF' : dark ? '#9A9A94' : '#8B8B86',
      }}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', flex: 'none', border: dark ? '1px solid #222222' : '1px solid #D8D8D4', background: dark ? '#141414' : '#FFFFFF' }}>
      {seg('en', 'EN')}
      {seg('id', 'ID')}
    </div>
  )
}
