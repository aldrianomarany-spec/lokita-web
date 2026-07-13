import { useLang } from '../i18n'

// Legal footer shown at the bottom of every app view and the auth screens.
// Links open in a new tab so the visitor never loses their place in the app.
export default function Footer() {
  const { t } = useLang()
  const link: React.CSSProperties = { color: '#8B8B86', textDecoration: 'none', fontWeight: 600 }
  return (
    <footer style={{ marginTop: 34, padding: '16px 0 6px', borderTop: '1px solid #D8D8D4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', fontFamily: "'Spline Sans Mono',monospace", fontSize: 10.5, letterSpacing: '.05em', color: '#9A9A94' }}>
      <span style={{ fontWeight: 700, color: '#5F6063' }}>LOKITA<span style={{ color: '#C8A96A' }}>.</span></span>
      <span>© {new Date().getFullYear()}</span>
      <span>·</span>
      <a className="lok-navi" href="/terms" target="_blank" rel="noopener" style={link}>{t('Terms')}</a>
      <span>·</span>
      <a className="lok-navi" href="/privacy" target="_blank" rel="noopener" style={link}>{t('Privacy Policy')}</a>
      <span>·</span>
      <span>{t('THE DORM MARKETPLACE · JIU CIKARANG')}</span>
    </footer>
  )
}
