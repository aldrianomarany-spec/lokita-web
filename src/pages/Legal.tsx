import { Link } from 'react-router-dom'

// Public legal pages (/terms, /privacy) — plain language on purpose: the
// audience is students, and honesty reads better than legalese. Update the
// date line whenever the substance changes.

const UPDATED = '11 July 2026'
const CONTACT = 'jiupoem2026@jiu.ac'

const wrap: React.CSSProperties = { minHeight: '100vh', background: '#ECECEA', padding: '40px 20px 80px', fontFamily: "'Hanken Grotesque',sans-serif", color: '#000000' }
const card: React.CSSProperties = { maxWidth: 720, margin: '0 auto', background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '38px 40px' }
const h1: React.CSSProperties = { fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '-.02em', margin: '6px 0 4px' }
const h2: React.CSSProperties = { fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 19, fontWeight: 800, letterSpacing: '-.01em', margin: '28px 0 8px' }
const p: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, color: '#3A3B3E', margin: '0 0 10px' }
const mono: React.CSSProperties = { fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em' }

function Shell({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  return (
    <div style={wrap}>
      <div style={card}>
        <Link to="/" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent,#000000)', textDecoration: 'none' }}>‹ Back to LOKITA</Link>
        <div style={{ ...mono, marginTop: 20 }}>{label}</div>
        <h1 style={h1}>{title}</h1>
        <div style={{ ...mono, fontSize: 10, marginBottom: 8 }}>LAST UPDATED · {UPDATED.toUpperCase()}</div>
        {children}
        <div style={{ marginTop: 34, paddingTop: 18, borderTop: '1px dashed #C9C9C5', fontSize: 13, color: '#8B8B86' }}>
          Questions? Contact the LOKITA team: <b style={{ color: '#000000' }}>{CONTACT}</b> ·{' '}
          <Link to="/terms" style={{ color: 'var(--accent,#000000)' }}>Terms</Link> ·{' '}
          <Link to="/privacy" style={{ color: 'var(--accent,#000000)' }}>Privacy</Link>
        </div>
      </div>
    </div>
  )
}

export function Terms() {
  return (
    <Shell title="Terms of Service" label="LOKITA · THE RULES, IN PLAIN LANGUAGE">
      <h2 style={h2}>1. What LOKITA is</h2>
      <p style={p}>
        LOKITA is a marketplace for students, staff and lecturers of Jakarta International University (JIU), Cikarang, to buy and
        sell secondhand items with each other. LOKITA connects buyers and sellers — the items themselves belong to, and are the
        responsibility of, the members who list them.
      </p>
      <h2 style={h2}>2. Who can use it</h2>
      <p style={p}>
        Anyone can browse as a guest. To buy, sell or chat you need an account. One account per person, with truthful profile
        information. Accounts that scam, harass, or repeatedly break these rules can be restricted or banned by the LOKITA team.
      </p>
      <h2 style={h2}>3. The platform fee</h2>
      <p style={p}>
        When you publish a listing, LOKITA adds a platform fee on top of your asking price: <b>5% of your price, minimum Rp 1.000,
        maximum Rp 4.000</b>. Buyers pay the listed price with no extra charges at checkout. When your item sells, you receive 100%
        of your asking price; LOKITA keeps the fee. The fee is always shown to you before you publish.
      </p>
      <h2 style={h2}>4. How trades work</h2>
      <p style={p}>
        The default exchange is the campus <b>Security Post</b>: the buyer pays in-app (QRIS) or chooses cash, the seller confirms
        the order and drops the item off within 2 days, and the buyer collects it within 2 days. Orders that are ignored past their
        deadlines are cancelled automatically and the item returns to sale. Meet-ups and trusted-friend handoffs are available but
        happen at your own arrangement.
      </p>
      <h2 style={h2}>5. What's not allowed</h2>
      <p style={p}>
        No prohibited or illegal items, no counterfeits sold as genuine, no weapons, no alcohol or drugs, no accounts or digital
        goods that violate other services' terms, and nothing that breaks Indonesian law or JIU campus rules. The LOKITA team may
        remove any listing and restrict any account that violates this.
      </p>
      <h2 style={h2}>6. Disputes</h2>
      <p style={p}>
        Report problems in-app (the 🚩 Report button) or contact the team. We will look at the order history, chat and reports to
        resolve disputes fairly, but LOKITA is a student-run platform — we can't guarantee outcomes and are not liable for the
        condition of items exchanged between members.
      </p>
      <h2 style={h2}>7. Changes</h2>
      <p style={p}>
        These terms can change as LOKITA grows. Meaningful changes will be announced in-app. Continuing to use LOKITA after a
        change means you accept the updated terms.
      </p>
    </Shell>
  )
}

export function Privacy() {
  return (
    <Shell title="Privacy Policy" label="LOKITA · YOUR DATA, HONESTLY EXPLAINED">
      <h2 style={h2}>1. What we collect</h2>
      <p style={p}>
        Your name, email, campus details (building, floor, room), batch and class standing, WhatsApp number, student ID number, an
        optional photo of your student ID (for verification), your listings and their photos, orders, chats, reviews and reports.
      </p>
      <h2 style={h2}>2. What other members can see</h2>
      <p style={p}>
        <b>Visible to members:</b> your name, profile photo, building and floor, batch, class standing, verified badge, rating,
        reviews, and active listings.
      </p>
      <p style={p}>
        <b>Never visible to other members:</b> your WhatsApp number, email, student ID number, room number, and your verification
        document. All contact between members happens through in-app chat.
      </p>
      <p style={p}>
        <b>Payment details (optional):</b> if you save how buyers can pay you (e-wallet number, bank account, personal QR code),
        those details are shown to exactly one person — a buyer whose order you have accepted, and only while that trade is
        active. They are never on your public profile, never in notifications, and LOKITA never holds or moves the money itself.
        Other members only see a "💳 Cashless ready" mark, never the details. You can edit or delete them anytime.
      </p>
      <h2 style={h2}>3. What we use it for</h2>
      <p style={p}>
        To run the marketplace: showing your listings to neighbours, matching orders, delivering chats and notifications, verifying
        that members are real JIU students, keeping the community safe (reports and moderation), and calculating the platform fee.
        We do not sell your data or use it for advertising.
      </p>
      <h2 style={h2}>4. Where it lives</h2>
      <p style={p}>
        Data is stored with Supabase (our database and authentication provider) and the site is served by Vercel. Access to your
        private fields is enforced at the database level — even a bug in the app cannot expose them to other members. Verification
        documents live in a private storage area readable only by you and the LOKITA team.
      </p>
      <h2 style={h2}>5. Your rights (UU PDP)</h2>
      <p style={p}>
        Under Indonesia's Personal Data Protection Law (UU No. 27/2022) you can ask us what data we hold about you, correct it
        (most of it directly in Edit Profile), or ask for your account and data to be deleted. Email us and we'll handle it.
      </p>
      <h2 style={h2}>6. Cookies & analytics</h2>
      <p style={p}>
        We use a login session (so you stay signed in) and privacy-friendly page analytics to understand how many people use LOKITA.
        No advertising trackers.
      </p>
    </Shell>
  )
}
