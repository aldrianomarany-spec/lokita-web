import { useM } from './context'
import { useLang } from '../i18n'

// 📖 The LOKITA guidebook — how buying and selling work, plus a glossary of
// every feature. Static, bilingual (via t()), visible to guests too.
const INK = '#000000'
const LINE = '#D8D8D4'
const BLUE = '#519BB8'

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 13, padding: '13px 0', borderBottom: '1px solid #ECECEA' }}>
      <div style={{ width: 30, height: 30, flex: 'none', background: INK, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14 }}>
        {n}
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#5F6063', lineHeight: 1.6 }}>{body}</div>
      </div>
    </div>
  )
}

function Feature({ icon, name, body }: { icon: string; name: string; body: string }) {
  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, padding: '13px 15px' }}>
      <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 4 }}>
        {icon} {name}
      </div>
      <div style={{ fontSize: 12.5, color: '#5F6063', lineHeight: 1.55 }}>{body}</div>
    </div>
  )
}

export default function GuideView() {
  const { t } = useLang()
  const { state, openSell, goSignup } = useM()

  const sectionCap: React.CSSProperties = { fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: '#9A9A94', margin: '26px 0 10px' }
  const card: React.CSSProperties = { background: '#FFFFFF', border: `1px solid ${LINE}`, padding: '6px 18px' }

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', marginBottom: 6 }}>{t('THE LOKITA GUIDEBOOK')}</div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: '0 0 8px', lineHeight: 1.02 }}>{t('How LOKITA works')}</h1>
      <p style={{ fontSize: 14, color: '#5F6063', lineHeight: 1.65, margin: '0 0 6px', maxWidth: 620 }}>
        {t('Buy and sell secondhand with your dorm neighbours. Money sits safely in escrow and items change hands at the campus Security Post — no risky meetups, no strangers.')}
      </p>

      <div style={sectionCap}>🛒 {t('BUYING — 5 STEPS')}</div>
      <div style={card}>
        <Step n={1} title={t('Find something you like')} body={t('Browse the homepage, search, filter by category or building — or check Requests to see what neighbours are hunting for.')} />
        <Step n={2} title={t('Check the seller')} body={t('Open the item, tap the seller card: rating, reviews, Dorm-Verified badge and Top Seller status tell you who you are dealing with.')} />
        <Step n={3} title={t('Chat or make an offer')} body={t('Message the seller (the product card attaches automatically) or tap 💰 Make an offer to propose your price.')} />
        <Step n={4} title={t('Buy — your money is protected')} body={t('Tap Buy now and pay in-app. The money is held in escrow: the seller only gets it after you receive the item.')} />
        <Step n={5} title={t('Pick it up at the Security Post')} body={t('The seller drops the item at the campus Security Post. Collect it whenever suits you, tap "Confirm I picked it up", then leave a review.')} />
      </div>

      <div style={sectionCap}>🏷️ {t('SELLING — 5 STEPS')}</div>
      <div style={card}>
        <Step n={1} title={t('Post your item in under a minute')} body={t('Tap Sell, add up to 5 photos (first one is the cover), pick a category and condition, set your price.')} />
        <Step n={2} title={t('Know your take-home')} body={t('LOKITA adds a small platform fee (5%, min Rp 1.000, max Rp 4.000) on top of your ask — buyers pay it, you receive your full price.')} />
        <Step n={3} title={t('Answer chats fast')} body={t('Use quick replies and counter offers. Fast, friendly sellers get better ratings — and ratings earn the ⭐ Top Seller badge.')} />
        <Step n={4} title={t('Got an order? Drop it off')} body={t('Confirm the order, then leave the item at the Security Post before the deadline and mark it dropped off.')} />
        <Step n={5} title={t('Get paid & reviewed')} body={t('Once the buyer confirms pickup the trade completes. Want more eyes? Tap 🚀 Boost on your listing for the FEATURED slot.')} />
      </div>

      <div style={sectionCap}>🧭 {t('EVERY FEATURE, EXPLAINED')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
        <Feature icon="🛡️" name={t('Escrow payments')} body={t('Your payment is held by LOKITA until you collect the item. Sellers never see your money before you get your stuff.')} />
        <Feature icon="🪪" name={t('Dorm-Verified badge')} body={t('Upload your student ID in your profile; the LOKITA team checks it by hand. The ✔ badge shows neighbours you are real.')} />
        <Feature icon="⭐" name={t('Top Seller badge')} body={t('Automatic: 5+ completed sales with a 4.5★+ rating. The mark of a seller you can trust.')} />
        <Feature icon="💬" name={t('Chat with product cards')} body={t('One conversation per person. When you message about an item, its card attaches so nobody asks "which one?"')} />
        <Feature icon="💰" name={t('Make an offer')} body={t('Propose your price right from the item page — it lands in the seller\'s chat, ready to accept or counter.')} />
        <Feature icon="🔔" name={t('Notifications that ring')} body={t('Chime + vibration for messages, orders and price drops. Enable popup alerts to get pinged even outside the tab.')} />
        <Feature icon="⭐" name={t('Saved items')} body={t('Tap the star on any listing to save it. If the price drops later, you get notified.')} />
        <Feature icon="🙋" name={t('Requests board')} body={t('Cannot find it? Post what you are hunting for and your budget — neighbours who have one will chat you.')} />
        <Feature icon="🚀" name={t('Featured boost')} body={t('Sellers can rent the big FEATURED slot on the homepage for 3 or 7 days to sell faster.')} />
        <Feature icon="🔗" name={t('Share links')} body={t('Every item has a link that opens for anyone — share it to your dorm WhatsApp group straight from the item page.')} />
        <Feature icon="🌐" name={t('Two languages')} body={t('Switch between English and Bahasa Indonesia anytime with the EN | ID toggle in the top bar.')} />
        <Feature icon="🚩" name={t('Report & moderation')} body={t('See something off? Report the listing or member — the LOKITA team reviews every report, and scam words are auto-blocked.')} />
      </div>

      <div style={sectionCap}>🤝 {t('HOUSE RULES')}</div>
      <div style={{ ...card, padding: '14px 18px' }}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#5F6063', lineHeight: 1.9 }}>
          <li>{t('Only trade with campus neighbours — that is what keeps LOKITA safe.')}</li>
          <li>{t('Describe items honestly; photos must show the real item.')}</li>
          <li>{t('Always exchange via the Security Post unless you both agree otherwise.')}</li>
          <li>{t('No prohibited items: weapons, drugs, alcohol, counterfeits, or anything illegal.')}</li>
          <li>{t('Be kind in chat. Harassment or scam attempts mean a ban.')}</li>
        </ul>
      </div>

      <div style={{ marginTop: 26, background: INK, color: '#F5F5F3', padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, marginBottom: 3 }}>{t('Ready to trade?')}</div>
          <div style={{ fontSize: 12.5, color: '#B9B9B3' }}>{t('Your first listing takes less than a minute.')}</div>
        </div>
        <button
          onClick={() => (state.guest ? goSignup() : openSell())}
          style={{ flex: 'none', border: 'none', background: BLUE, color: '#FFFFFF', fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 13.5, padding: '12px 22px', cursor: 'pointer' }}
        >
          {state.guest ? t("Sign up — it's free") : t('Sell an item')} →
        </button>
      </div>
    </div>
  )
}
