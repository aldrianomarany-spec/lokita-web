import { useCallback, useEffect, useState } from 'react'
import { useM } from './context'
import {
  fetchAdminStats,
  fetchAdminListings,
  fetchAdminMembers,
  fetchAdminReports,
  fetchAdminTrends,
  fetchAdminBanners,
  adminCreateBanner,
  adminSetBannerActive,
  adminDeleteBanner,
  uploadBannerImage,
  adminSetListingStatus,
  adminSetFeatured,
  adminSetVerification,
  adminSetBanned,
  adminDeleteUser,
  fetchTickerSettings,
  fetchAdminBoosts,
  adminResolveBoost,
  type BoostRow,
  adminSetTickerSettings,
  type TickerSettings,
  adminSetReportStatus,
  adminBroadcast,
  fetchAdminAudit,
  type AuditRow,
  fetchClientErrors,
  adminClearClientErrors,
  type ClientErrorRow,
  fetchMoveoutActive,
  adminSetMoveoutActive,
  fetchOpsSettings,
  adminSetOpsSetting,
  fetchAdminProtections,
  adminConfirmProtection,
  type AdminProtectionRow,
  type OpsSettings,
  type AdminStats,
  type AdminListingRow,
  type AdminMemberRow,
  type AdminReportRow,
  type AdminTrendRow,
  type BannerRow,
} from '../lib/api'
import { Verified } from '../components/Icons'
import { getVerificationDocUrl } from '../lib/auth'
import { SELL_CATEGORIES } from '../theme'
import { errText } from '../lib/err'

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
const mono: React.CSSProperties = { fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em' }
const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0 }

const STATUS_CHIP: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#FBF2DD', fg: '#9A6A12' },
  active: { bg: '#E8F2F7', fg: '#2F6B85' },
  sold: { bg: '#FBF2DD', fg: '#9A6A12' },
  removed: { bg: '#FBEEE9', fg: '#B23A1B' },
  flagged: { bg: '#FBEEE9', fg: '#B23A1B' },
}

// ---- analytics: 8 weekly buckets (Monday-start), plain Date math ----
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7)) // getDay(): Sun=0 → Monday offset
  return m
}
/** Monday dates of the last 8 weeks, oldest first, current week last. */
function lastEightMondays(): Date[] {
  const cur = mondayOf(new Date())
  return Array.from({ length: 8 }, (_, i) => new Date(cur.getTime() - (7 - i) * WEEK_MS))
}
function bucketIndex(iso: string, mondays: Date[]): number {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return -1
  const idx = Math.floor((t - mondays[0].getTime()) / WEEK_MS)
  return idx >= 0 && idx < 8 ? idx : -1
}

function TrendCard({ label, values, mondays, isMoney }: { label: string; values: number[]; mondays: Date[]; isMoney?: boolean }) {
  const max = Math.max(...values, 1)
  const fmt = (n: number) => (isMoney ? Math.round(n).toLocaleString('id-ID') : String(n))
  const total = values.reduce((a, b) => a + b, 0)
  return (
    <div style={{ ...card, flex: '1 1 240px', padding: '14px 16px' }}>
      <div style={{ ...mono, fontSize: 9.5, marginBottom: 12 }}>
        {label} · {fmt(total)}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 58 }}>
        {values.map((v, i) => (
          <div key={i} title={`${mondays[i].getDate()}/${mondays[i].getMonth() + 1}: ${fmt(v)}`} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' }}>
            <div style={{ width: '100%', height: Math.max(2, Math.round((v / max) * 54)), background: i === 7 ? '#519BB8' : '#000000' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
        {mondays.map((m, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontFamily: "'Spline Sans Mono',monospace", fontSize: 8.5, color: '#8B8B86', whiteSpace: 'nowrap' }}>
            {m.getDate()}/{m.getMonth() + 1}
          </div>
        ))}
      </div>
    </div>
  )
}

function SmallBtn({ label, onClick, tone = 'plain', busy }: { label: string; onClick: () => void; tone?: 'plain' | 'danger' | 'accent'; busy?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    plain: { border: '1px solid #C9C9C5', background: '#F5F5F3', color: '#1E1E1E' },
    danger: { border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A' },
    accent: { border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA' },
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="lok-btn"
      style={{ ...styles[tone], fontFamily: 'inherit', fontWeight: 700, fontSize: 11.5, padding: '7px 12px', borderRadius: 0, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, flex: 'none' }}
    >
      {label}
    </button>
  )
}

function BannerList({ items, busyId, act, refresh }: { items: BannerRow[]; busyId: string | null; act: (id: string, fn: () => Promise<void>) => Promise<void>; refresh: () => void }) {
  if (!items.length) return null
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid #E6E6E3' }}>
      {items.map((b) => (
        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 2px', borderBottom: '1px solid #E6E6E3', opacity: b.is_active ? 1 : 0.55 }}>
          {b.image_url && <img src={b.image_url} alt="" style={{ width: 44, height: 30, objectFit: 'cover', flex: 'none', border: '1px solid #E6E6E3' }} />}
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
            <div style={{ fontSize: 11, color: '#8B8B86', fontWeight: 600 }}>{b.target_type === 'none' ? 'not clickable' : `→ ${b.target_type}${b.target_value ? ' · ' + b.target_value : ''}`}</div>
          </div>
          <SmallBtn label={b.is_active ? 'Hide' : 'Show'} busy={busyId === b.id} onClick={() => act(b.id, async () => { await adminSetBannerActive(b.id, !b.is_active); refresh() })} />
          <SmallBtn label="Delete" tone="danger" busy={busyId === b.id} onClick={() => act(b.id, async () => { await adminDeleteBanner(b.id); refresh() })} />
        </div>
      ))}
    </div>
  )
}

const CTA_PRESETS = ['Shop now', 'See details', 'Check it out', 'Shop bundles', 'Sell yours', 'Learn more', 'Grab yours']

export default function AdminView() {
  const { state, refreshReports, openMember } = useM()
  const isAdmin = !state.guest && state.profile.role === 'admin'

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [listings, setListings] = useState<AdminListingRow[] | null>(null)
  const [members, setMembers] = useState<AdminMemberRow[] | null>(null)
  const [reports, setReports] = useState<AdminReportRow[] | null>(null)
  const [bannersA, setBannersA] = useState<BannerRow[] | null>(null)
  const [trends, setTrends] = useState<AdminTrendRow[] | null>(null) // null → section hidden
  const [bForm, setBForm] = useState({ title: '', subtitle: '', cta: '', target: 'none', value: '', placement: 'hero' })
  const [bSaving, setBSaving] = useState(false)
  const [bImage, setBImage] = useState<File | null>(null)
  const [tForm, setTForm] = useState({ title: '', target: 'none', value: '' })
  const [tSaving, setTSaving] = useState(false)
  const [tickerCfg, setTickerCfg] = useState<TickerSettings | null>(null)
  const [boosts, setBoosts] = useState<BoostRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  // inline student-ID viewer (signed URL from the private verification bucket)
  const [docView, setDocView] = useState<{ id: string; name: string; url: string } | null>(null)
  // 📣 broadcast to everyone + 🎓 moveout season + audit trail + JS error inbox
  const [bc, setBc] = useState({ title: '', body: '' })
  const [bcState, setBcState] = useState<'idle' | 'busy' | number>('idle')
  const [moveoutOn, setMoveoutOn] = useState<boolean | null>(null)
  const [audit, setAudit] = useState<AuditRow[] | null>(null)
  const [auditOpen, setAuditOpen] = useState(false)
  const [cErrors, setCErrors] = useState<ClientErrorRow[] | null>(null)
  const [errOpen, setErrOpen] = useState(false)
  // 💰 launch-mode ops: fee switch, handover desk, admin payment info, 🛡️ queue
  const [ops, setOps] = useState<OpsSettings | null>(null)
  const [opsSaving, setOpsSaving] = useState(false)
  const [protections, setProtections] = useState<AdminProtectionRow[] | null>(null)

  const saveOps = async (key: 'fees' | 'handover' | 'admin_pay', value: Record<string, unknown>) => {
    setOpsSaving(true)
    try {
      await adminSetOpsSetting(key, value)
    } catch (e) {
      alert('Could not save: ' + ((e as { message?: string })?.message || 'run migration 0034 first?'))
      fetchOpsSettings().then(setOps).catch(() => {})
    } finally {
      setOpsSaving(false)
    }
  }

  const sendBroadcast = async () => {
    if (bcState === 'busy' || !bc.title.trim()) return
    if (!window.confirm(`Send "${bc.title.trim()}" to EVERY member? Each gets a notification + a push buzz.`)) return
    setBcState('busy')
    try {
      const n = await adminBroadcast(bc.title, bc.body)
      setBcState(n)
      setBc({ title: '', body: '' })
      window.setTimeout(() => setBcState('idle'), 6000)
    } catch (e) {
      setBcState('idle')
      alert('Broadcast failed: ' + (errText(e, 'run migration 0029 first?')))
    }
  }

  // pending first; rejected stay listed (members may re-upload a better photo)
  const pendingVerif = (members || [])
    .filter((m) => m.verification_doc_url && m.verification_status !== 'verified')
    .sort((a, b) => (a.verification_status === 'pending' ? 0 : 1) - (b.verification_status === 'pending' ? 0 : 1))
  const saveTickerCfg = async (next: TickerSettings) => {
    const prev = tickerCfg
    setTickerCfg(next) // optimistic — realtime pushes it to every open tab
    try {
      await adminSetTickerSettings(next)
    } catch (e) {
      setTickerCfg(prev)
      alert('Could not save ticker settings: ' + (errText(e, 'run migration 0026 first?')))
    }
  }

  const viewDoc = async (m: AdminMemberRow) => {
    if (!m.verification_doc_url) return
    try {
      const url = await getVerificationDocUrl(m.verification_doc_url, 300)
      setDocView({ id: m.id, name: m.name, url })
    } catch (e) {
      alert('Could not open the ID photo: ' + (errText(e, 'unknown error')))
    }
  }

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [s, l, m, r] = await Promise.all([fetchAdminStats(), fetchAdminListings(), fetchAdminMembers(), fetchAdminReports()])
      fetchAdminBanners().then(setBannersA).catch(() => setBannersA([]))
      fetchTickerSettings().then(setTickerCfg).catch(() => setTickerCfg(null))
      fetchAdminBoosts().then(setBoosts).catch(() => setBoosts(null))
      fetchAdminTrends().then(setTrends).catch(() => setTrends(null)) // errors → hide the analytics section
      fetchMoveoutActive().then(setMoveoutOn).catch(() => setMoveoutOn(null))
      fetchOpsSettings().then(setOps).catch(() => setOps(null))
      fetchAdminProtections().then(setProtections).catch(() => setProtections(null))
      fetchAdminAudit().then(setAudit).catch(() => setAudit(null))
      fetchClientErrors().then(setCErrors).catch(() => setCErrors(null))
      setStats(s)
      setListings(l)
      setMembers(m)
      setReports(r)
    } catch (e) {
      setErr(errText(e, 'Could not load admin data'))
    }
  }, [])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id)
    try {
      await fn()
      await load()
      refreshReports() // keep the sidebar badge in sync
    } catch (e) {
      alert('Action failed: ' + (errText(e, 'unknown error')))
    } finally {
      setBusyId(null)
    }
  }

  if (!isAdmin) {
    return (
      <div style={{ ...card, borderStyle: 'dashed', padding: '52px 32px', textAlign: 'center', color: '#8B8B86', maxWidth: 520, margin: '40px auto 0' }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>🛡️</div>
        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#000000', marginBottom: 8 }}>Admins only</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>This area is for the LOKITA team. If that's you, ask for admin access.</div>
      </div>
    )
  }

  const tiles = stats
    ? [
        { label: 'MEMBERS', value: String(stats.members) },
        { label: 'ACTIVE LISTINGS', value: String(stats.activeListings) },
        { label: 'ITEMS SOLD', value: String(stats.soldListings) },
        { label: 'ORDERS COMPLETED', value: String(stats.completedOrders) },
      ]
    : []

  // weekly trend buckets — only computed once the rows arrive
  let trendCards: React.ReactNode = null
  if (trends) {
    const mondays = lastEightMondays()
    const newListings = new Array(8).fill(0) as number[]
    const itemsSold = new Array(8).fill(0) as number[]
    const revenue = new Array(8).fill(0) as number[]
    for (const row of trends) {
      const ci = bucketIndex(row.created_at, mondays)
      if (ci >= 0) newListings[ci]++
      if (row.status === 'sold') {
        const si = bucketIndex(row.updated_at || row.created_at, mondays)
        if (si >= 0) {
          itemsSold[si]++
          revenue[si] += row.platform_fee || 0
        }
      }
    }
    const newMembers = new Array(8).fill(0) as number[]
    for (const m of members || []) {
      const mi = bucketIndex(m.created_at, mondays)
      if (mi >= 0) newMembers[mi]++
    }
    trendCards = (
      <>
        <div style={{ ...mono, marginBottom: 10 }}>ANALYTICS · LAST 8 WEEKS</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
          <TrendCard label="NEW MEMBERS" values={newMembers} mondays={mondays} />
          <TrendCard label="NEW LISTINGS" values={newListings} mondays={mondays} />
          <TrendCard label="ITEMS SOLD" values={itemsSold} mondays={mondays} />
          <TrendCard label="REVENUE (Rp)" values={revenue} mondays={mondays} isMoney />
        </div>
      </>
    )
  }

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ ...mono, marginBottom: 6 }}>CONTROL ROOM</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>Admin</h1>
        </div>
        <SmallBtn label="↻ Reload" onClick={load} />
      </div>

      {err && (
        <div style={{ background: '#FBEEE9', border: '1px solid #E4C4B8', color: '#B23A1B', borderRadius: 0, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{err}</div>
      )}

      {/* stats tiles + revenue */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ ...card, flex: '1 1 130px', padding: '16px 18px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>{t.value}</div>
            <div style={{ ...mono, fontSize: 9.5, marginTop: 4 }}>{t.label}</div>
          </div>
        ))}
        <div style={{ flex: '2 1 240px', background: '#000000', borderRadius: 0, padding: '16px 18px', color: '#F7F3EA' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#8FB4E3' }}>
            {stats ? rp(stats.feeCollected) : '…'}
          </div>
          <div style={{ ...mono, fontSize: 9.5, marginTop: 4, color: 'rgba(247,243,234,.6)' }}>LOKITA REVENUE — FEES ON SOLD ITEMS</div>
          {stats && stats.feePending > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(247,243,234,.65)', fontWeight: 600, marginTop: 6 }}>+ {rp(stats.feePending)} riding on active listings</div>
          )}
        </div>
      </div>

      {/* analytics — three mini weekly bar charts (hidden if the trends fetch failed) */}
      {trendCards}

      {/* 📣 broadcast — one message → in-app notification + push buzz for everyone */}
      <div style={{ ...mono, marginBottom: 10 }}>📣 ANNOUNCE TO EVERYONE</div>
      <div style={{ ...card, padding: '14px 16px', marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: '#8B8B86', fontWeight: 500, marginBottom: 10, lineHeight: 1.5 }}>
          Every member gets this as a notification — phones buzz even with LOKITA closed. Use it for launches, promos, drop weeks. Don't spam it.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="lok-field"
            value={bc.title}
            maxLength={80}
            onChange={(e) => setBc({ ...bc, title: e.target.value })}
            placeholder="Title (e.g. 📣 Free boosts this week for the first 10 sellers!)"
            style={{ flex: '2 1 260px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }}
          />
          <input
            className="lok-field"
            value={bc.body}
            maxLength={160}
            onChange={(e) => setBc({ ...bc, body: e.target.value })}
            placeholder="Details (optional)"
            style={{ flex: '2 1 220px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }}
          />
          <button
            onClick={sendBroadcast}
            disabled={bcState === 'busy' || !bc.title.trim()}
            className="lok-btn"
            style={{ flex: 'none', border: 'none', background: bc.title.trim() ? '#519BB8' : '#E6E6E3', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, padding: '10px 18px', borderRadius: 0, cursor: bc.title.trim() ? 'pointer' : 'default' }}
          >
            {bcState === 'busy' ? 'Sending…' : 'Send to all →'}
          </button>
        </div>
        {typeof bcState === 'number' && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1E9E5A', marginTop: 8 }}>✓ Sent to {bcState} member{bcState === 1 ? '' : 's'} — pushes are on their way.</div>
        )}
        {/* 🎓 season switch lives here — one click turns the homepage strip on for everyone */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid #ECECEA', flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 9.5 }}>🎓 MOVING-OUT SEASON</span>
          <button
            onClick={() => {
              if (moveoutOn === null) return
              const next = !moveoutOn
              setMoveoutOn(next)
              adminSetMoveoutActive(next).catch(() => {
                setMoveoutOn(!next)
                alert('Could not save — run migration 0029 first?')
              })
            }}
            disabled={moveoutOn === null}
            className="lok-btn"
            style={{ border: `1px solid ${moveoutOn ? '#1E9E5A' : '#D8D8D4'}`, background: moveoutOn ? '#E7F1EA' : '#FFFFFF', color: moveoutOn ? '#1E9E5A' : '#3A3B3E', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, padding: '7px 14px', borderRadius: 0, cursor: moveoutOn === null ? 'default' : 'pointer' }}
          >
            {moveoutOn === null ? '…' : moveoutOn ? 'ON — strip showing' : 'OFF'}
          </button>
          <span style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 500 }}>Shows a 🎓 banner on every homepage pushing bundles — flip it on near semester end.</span>
        </div>
      </div>

      {/* 💰 launch-mode money settings */}
      <div style={{ ...mono, marginBottom: 10 }}>💰 MONEY & HANDOVER DESK</div>
      <div style={{ ...card, padding: '14px 16px', marginBottom: 26 }}>
        {/* fee switch — the whole fee machine sleeps in the DB until this is ON */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{ ...mono, fontSize: 9.5 }}>PLATFORM FEE</span>
          <button
            onClick={() => {
              if (!ops) return
              const next = !ops.feesOn
              if (!window.confirm(next ? 'Turn the platform fee ON? New listings will publish at ask + fee.' : 'Turn the platform fee OFF? New listings publish at exactly the ask.')) return
              setOps({ ...ops, feesOn: next })
              saveOps('fees', { enabled: next })
            }}
            disabled={!ops || opsSaving}
            className="lok-btn"
            style={{ border: `1px solid ${ops?.feesOn ? '#1E9E5A' : '#D8D8D4'}`, background: ops?.feesOn ? '#E7F1EA' : '#FFFFFF', color: ops?.feesOn ? '#1E9E5A' : '#3A3B3E', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, padding: '7px 14px', borderRadius: 0, cursor: 'pointer' }}
          >
            {!ops ? '…' : ops.feesOn ? 'ON — fee added to new listings' : 'OFF — launch mode, everything free'}
          </button>
          <span style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 500 }}>Existing listings keep their published price either way.</span>
        </div>
        {/* where boost/protection transfers go — shown to payers */}
        <div style={{ ...mono, fontSize: 9.5, marginBottom: 8 }}>YOUR PAYMENT DETAILS (shown when someone pays a boost / protection fee)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <input className="lok-field" value={ops?.adminPay.gopay ?? ''} onChange={(e) => ops && setOps({ ...ops, adminPay: { ...ops.adminPay, gopay: e.target.value } })} placeholder="GoPay number (e.g. 0812…)" style={{ flex: '1 1 160px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
          <input className="lok-field" value={ops?.adminPay.bank_name ?? ''} onChange={(e) => ops && setOps({ ...ops, adminPay: { ...ops.adminPay, bank_name: e.target.value } })} placeholder="Bank (e.g. BCA)" style={{ flex: '0 1 110px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
          <input className="lok-field" value={ops?.adminPay.bank_account ?? ''} onChange={(e) => ops && setOps({ ...ops, adminPay: { ...ops.adminPay, bank_account: e.target.value } })} placeholder="Account number" style={{ flex: '1 1 150px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
          <SmallBtn label={opsSaving ? 'Saving…' : 'Save payment info'} tone="accent" busy={opsSaving} onClick={() => ops && saveOps('admin_pay', { ...ops.adminPay })} />
        </div>
        {/* the handover desk shown at checkout */}
        <div style={{ ...mono, fontSize: 9.5, marginBottom: 8 }}>📦 HANDOVER DESK (shown at checkout)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="lok-field" value={ops?.handover.location ?? ''} onChange={(e) => ops && setOps({ ...ops, handover: { ...ops.handover, location: e.target.value } })} placeholder="Location (e.g. Union Building Room 303)" style={{ flex: '1 1 200px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
          <input className="lok-field" value={ops?.handover.hours ?? ''} onChange={(e) => ops && setOps({ ...ops, handover: { ...ops.handover, hours: e.target.value } })} placeholder="Hours (e.g. By appointment — chat the team)" style={{ flex: '2 1 240px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
          <SmallBtn label={opsSaving ? 'Saving…' : 'Save desk info'} tone="accent" busy={opsSaving} onClick={() => ops && saveOps('handover', { ...ops.handover })} />
        </div>
      </div>

      {/* 🛡️ protection payments awaiting your verification */}
      <div style={{ ...mono, marginBottom: 10 }}>
        🛡️ PROTECTION PAYMENTS {protections && protections.length > 0 ? `· ${protections.length} WAITING` : ''}
      </div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 26 }}>
        {!protections || protections.length === 0 ? (
          <div style={{ padding: '18px 20px', color: '#8B8B86', fontSize: 12.5 }}>
            No protection fees waiting. When a buyer chooses 🛡️ Buyer Protection and uploads their transfer proof, it lands here — check your GoPay/bank, then Verify.
          </div>
        ) : (
          protections.map((pr) => (
            <div key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #E6E6E3' }}>
              <span style={{ flex: 'none', fontSize: 16 }}>🛡️</span>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.item_title}</div>
                <div style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 600, marginTop: 2 }}>
                  {pr.buyer_name} · Rp {Number(pr.fee).toLocaleString('id-ID')}
                  {!pr.proof_url && ' · no proof yet'}
                </div>
              </div>
              {pr.proof_url && (
                <a href={pr.proof_url} target="_blank" rel="noreferrer" style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#2F6B85', textDecoration: 'none' }}>
                  <img src={pr.proof_url} alt="" style={{ width: 34, height: 34, objectFit: 'cover', border: '1px solid #BFDCE8' }} />
                  proof
                </a>
              )}
              <SmallBtn
                label="Verify ✓ (money arrived)"
                tone="accent"
                busy={busyId === pr.id}
                onClick={() => act(pr.id, async () => { await adminConfirmProtection(pr.id); fetchAdminProtections().then(setProtections).catch(() => {}) })}
              />
            </div>
          ))
        )}
      </div>

      {/* reports queue — open ones first, resolved/dismissed shown muted */}
      <div style={{ ...mono, marginBottom: 10 }}>
        REPORTS · QUEUE {reports && reports.filter((r) => r.status === 'open').length > 0 ? `· ${reports.filter((r) => r.status === 'open').length} OPEN` : ''}
      </div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 26 }}>
        {reports === null ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <span className="lok-spin" style={{ width: 22, height: 22, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#8B8B86', fontSize: 13 }}>No reports — all quiet. 🎉</div>
        ) : (
          [...reports]
            .sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1))
            .map((r) => {
              const open = r.status === 'open'
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #E6E6E3', opacity: open ? 1 : 0.55 }}>
                  <span style={{ flex: 'none', fontSize: 16 }}>{r.target_type === 'listing' ? '🏷️' : '👤'}</span>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.target_label}</div>
                    <div style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 600, marginTop: 2 }}>
                      {r.reason} — reported by {r.reporter_name}
                    </div>
                  </div>
                  <span style={{ ...mono, fontSize: 9, color: open ? '#B23A1B' : '#3D7A54', background: open ? '#FBEEE9' : '#E8F2F7', padding: '4px 9px', borderRadius: 0, flex: 'none' }}>
                    {open ? 'OPEN' : r.status === 'resolved' ? 'HANDLED' : 'DISMISSED'}
                  </span>
                  {open && (
                    <div style={{ display: 'flex', gap: 7, flex: 'none', flexWrap: 'wrap' }}>
                      {r.target_type === 'listing' && r.target_active && (
                        <SmallBtn
                          label="Remove listing"
                          tone="danger"
                          busy={busyId === r.id}
                          onClick={() =>
                            act(r.id, async () => {
                              await adminSetListingStatus(r.target_id, 'removed')
                              await adminSetReportStatus(r.id, 'resolved')
                            })
                          }
                        />
                      )}
                      {r.target_type === 'user' && (
                        <SmallBtn label="View profile" onClick={() => openMember(r.target_id, r.target_label)} />
                      )}
                      <SmallBtn label="Dismiss" busy={busyId === r.id} onClick={() => act(r.id, () => adminSetReportStatus(r.id, 'reviewed'))} />
                    </div>
                  )}
                </div>
              )
            })
        )}
      </div>

      {/* boost requests — sellers paying for the FEATURED slot (manual payment confirm) */}
      {boosts !== null && (
        <>
          <div style={{ ...mono, marginBottom: 10 }}>
            🚀 BOOST REQUESTS {boosts.filter((b) => b.status === 'pending').length > 0 ? `· ${boosts.filter((b) => b.status === 'pending').length} PENDING` : ''}
          </div>
          <div style={{ ...card, overflow: 'hidden', marginBottom: 26 }}>
            {boosts.length === 0 ? (
              <div style={{ padding: '18px 20px', color: '#8B8B86', fontSize: 12.5 }}>
                No boost requests yet. When a seller taps 🚀 Boost, they transfer the fee to your payment details and upload the receipt — it lands here for you to check and Approve.
              </div>
            ) : (
              [...boosts]
                .sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1))
                .map((b) => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #E6E6E3', opacity: b.status === 'pending' ? 1 : 0.55 }}>
                    <span style={{ flex: 'none', fontSize: 16 }}>🚀</span>
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.listing_title}</div>
                      <div style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 600, marginTop: 2 }}>
                        {b.seller_name} · {b.days} days · Rp {b.amount.toLocaleString('id-ID')}
                        {b.status === 'pending' && !b.proof_url && ' · no transfer proof yet'}
                      </div>
                    </div>
                    {b.proof_url && (
                      <a href={b.proof_url} target="_blank" rel="noreferrer" style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#2F6B85', textDecoration: 'none' }}>
                        <img src={b.proof_url} alt="" style={{ width: 34, height: 34, objectFit: 'cover', border: '1px solid #BFDCE8' }} />
                        proof
                      </a>
                    )}
                    {b.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 7, flex: 'none' }}>
                        <SmallBtn label="Approve ✓ (paid)" tone="accent" busy={busyId === b.id} onClick={() => act(b.id, async () => { await adminResolveBoost(b, true); fetchAdminBoosts().then(setBoosts).catch(() => {}) })} />
                        <SmallBtn label="Reject ✗" tone="danger" busy={busyId === b.id} onClick={() => act(b.id, async () => { await adminResolveBoost(b, false); fetchAdminBoosts().then(setBoosts).catch(() => {}) })} />
                      </div>
                    ) : (
                      <span style={{ ...mono, fontSize: 9, color: b.status === 'approved' ? '#3D7A54' : '#B23A1B', background: b.status === 'approved' ? '#E8F2F7' : '#FBEEE9', padding: '4px 9px', flex: 'none' }}>
                        {b.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                ))
            )}
          </div>
        </>
      )}

      {/* promotion banners — the big black homepage slot */}
      <div style={{ ...mono, marginBottom: 10 }}>PROMOTION BANNERS · BIG BLACK SLOT</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 26, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input className="lok-field" value={bForm.title} onChange={(e) => setBForm({ ...bForm, title: e.target.value })} placeholder="Headline (e.g. Graduation clearout week)" style={{ flex: '2 1 240px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
          <input className="lok-field" value={bForm.subtitle} onChange={(e) => setBForm({ ...bForm, subtitle: e.target.value })} placeholder="Subtitle (optional)" style={{ flex: '2 1 220px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="lok-field"
            value={CTA_PRESETS.includes(bForm.cta) || bForm.cta === '' ? bForm.cta : '__custom'}
            onChange={(e) => setBForm({ ...bForm, cta: e.target.value === '__custom' ? ' ' : e.target.value })}
            title="Button label"
            style={{ flex: 'none', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }}
          >
            <option value="">Button: default (See details)</option>
            {CTA_PRESETS.map((c) => <option key={c} value={c}>Button: {c}</option>)}
            <option value="__custom">Button: custom…</option>
          </select>
          {bForm.cta !== '' && !CTA_PRESETS.includes(bForm.cta) && (
            <input className="lok-field" autoFocus value={bForm.cta.trimStart()} onChange={(e) => setBForm({ ...bForm, cta: e.target.value || ' ' })} placeholder="Custom button label" style={{ flex: '1 1 140px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
          )}
          <select className="lok-field" value={bForm.target} onChange={(e) => setBForm({ ...bForm, target: e.target.value })} title="Where the button goes" style={{ flex: 'none', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }}>
            <option value="none">No button</option>
            <option value="category">Open a category</option>
            <option value="listing">Open a listing</option>
            <option value="requests">Open Requests</option>
            <option value="sell">Open the Sell form</option>
          </select>
          {bForm.target === 'category' && (
            <select className="lok-field" value={bForm.value} onChange={(e) => setBForm({ ...bForm, value: e.target.value })} style={{ flex: '1 1 140px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }}>
              <option value="" disabled>Pick a category…</option>
              {SELL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {bForm.target === 'listing' && (
            <select className="lok-field" value={bForm.value} onChange={(e) => setBForm({ ...bForm, value: e.target.value })} style={{ flex: '1 1 200px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }}>
              <option value="" disabled>Pick a listing…</option>
              {(listings || []).filter((l) => l.status === 'active').map((l) => <option key={l.id} value={l.id}>{l.title} — Rp {Number(l.price).toLocaleString('id-ID')}</option>)}
            </select>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px dashed #C9C9C5', background: '#F5F5F3', padding: '9px 12px', fontSize: 11.5, fontWeight: 700, color: bImage ? '#000000' : '#8B8B86', cursor: 'pointer', flex: 'none' }}>
            🖼️ {bImage ? bImage.name.slice(0, 18) : 'Add image (optional)'}
            <input type="file" accept="image/*" onChange={(e) => setBImage(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          </label>
          <SmallBtn
            label={bSaving ? 'Publishing…' : 'Publish banner'}
            tone="accent"
            busy={bSaving}
            onClick={async () => {
              if (!bForm.title.trim() || bSaving) return
              setBSaving(true)
              try {
                const image_url = bImage ? await uploadBannerImage(bImage) : null
                await adminCreateBanner({ title: bForm.title.trim(), subtitle: bForm.subtitle.trim() || null, cta_label: bForm.cta.trim() || null, target_type: bForm.target as BannerRow['target_type'], target_value: bForm.value.trim() || null, image_url, placement: 'hero' })
                setBForm({ title: '', subtitle: '', cta: '', target: 'none', value: '', placement: 'hero' })
                setBImage(null)
                fetchAdminBanners().then(setBannersA).catch(() => {})
              } catch (e) {
                alert('Could not publish: ' + (errText(e, 'run migration 0021 first?')))
              } finally {
                setBSaving(false)
              }
            }}
          />
        </div>
        <BannerList items={(bannersA || []).filter((b) => b.placement !== 'ticker')} busyId={busyId} act={act} refresh={() => fetchAdminBanners().then(setBannersA).catch(() => {})} />
      </div>

      {/* announcement ticker — the moving blue strip, its own section */}
      <div style={{ ...mono, marginBottom: 10 }}>🔵 ANNOUNCEMENT TICKER · MOVING BLUE STRIP</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 26, padding: '14px 16px' }}>
        <div style={{ fontSize: 12, color: '#8B8B86', fontWeight: 500, marginBottom: 10, lineHeight: 1.5 }}>
          Short announcements that scroll across the top of every page. Keep them one sentence — several items chain together.
        </div>
        {/* strip behaviour — saved to site_settings, live on every open tab (migration 0026) */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', padding: '10px 12px', background: '#F5F5F3', border: '1px solid #E6E6E3', marginBottom: 12 }}>
          <span style={{ ...mono, fontSize: 9.5 }}>SCROLL SPEED</span>
          {(['slow', 'normal', 'fast'] as const).map((sp) => (
            <button
              key={sp}
              onClick={() => tickerCfg && saveTickerCfg({ ...tickerCfg, speed: sp })}
              disabled={!tickerCfg}
              style={{ border: `1px solid ${tickerCfg?.speed === sp ? '#000000' : '#D8D8D4'}`, background: tickerCfg?.speed === sp ? '#000000' : '#FFFFFF', color: tickerCfg?.speed === sp ? '#FFFFFF' : '#3A3B3E', fontFamily: 'inherit', fontWeight: 700, fontSize: 11.5, padding: '6px 13px', borderRadius: 0, cursor: tickerCfg ? 'pointer' : 'default', textTransform: 'capitalize' }}
            >
              {sp}
            </button>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#3A3B3E', cursor: tickerCfg ? 'pointer' : 'default', marginLeft: 'auto' }}>
            <input
              type="checkbox"
              checked={tickerCfg ? !tickerCfg.clickable : false}
              disabled={!tickerCfg}
              onChange={(e) => tickerCfg && saveTickerCfg({ ...tickerCfg, clickable: !e.target.checked })}
            />
            Decoration only — items can't be clicked
          </label>
          {!tickerCfg && <span style={{ fontSize: 11, color: '#B23A1B', fontWeight: 600 }}>run migration 0026 to enable</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="lok-field" value={tForm.title} onChange={(e) => setTForm({ ...tForm, title: e.target.value })} placeholder="Announcement (e.g. Welcome to LOKITA — trade safely via the Security Post)" style={{ flex: '2 1 300px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
          <select className="lok-field" value={tForm.target} onChange={(e) => setTForm({ ...tForm, target: e.target.value })} title="Where a tap goes" style={{ flex: 'none', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }}>
            <option value="none">Not clickable</option>
            <option value="category">Opens a category</option>
            <option value="listing">Opens a listing</option>
            <option value="requests">Opens Requests</option>
            <option value="sell">Opens the Sell form</option>
          </select>
          {tForm.target === 'category' && (
            <select className="lok-field" value={tForm.value} onChange={(e) => setTForm({ ...tForm, value: e.target.value })} style={{ flex: '1 1 140px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }}>
              <option value="" disabled>Pick a category…</option>
              {SELL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {tForm.target === 'listing' && (
            <select className="lok-field" value={tForm.value} onChange={(e) => setTForm({ ...tForm, value: e.target.value })} style={{ flex: '1 1 200px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }}>
              <option value="" disabled>Pick a listing…</option>
              {(listings || []).filter((l) => l.status === 'active').map((l) => <option key={l.id} value={l.id}>{l.title} — Rp {Number(l.price).toLocaleString('id-ID')}</option>)}
            </select>
          )}
          <SmallBtn
            label={tSaving ? 'Publishing…' : 'Add to ticker'}
            tone="accent"
            busy={tSaving}
            onClick={async () => {
              if (!tForm.title.trim() || tSaving) return
              setTSaving(true)
              try {
                await adminCreateBanner({ title: tForm.title.trim(), subtitle: null, cta_label: null, target_type: tForm.target as BannerRow['target_type'], target_value: tForm.value.trim() || null, placement: 'ticker' })
                setTForm({ title: '', target: 'none', value: '' })
                fetchAdminBanners().then(setBannersA).catch(() => {})
              } catch (e) {
                alert('Could not publish: ' + (errText(e, 'run migration 0023 first?')))
              } finally {
                setTSaving(false)
              }
            }}
          />
        </div>
        <BannerList items={(bannersA || []).filter((b) => b.placement === 'ticker')} busyId={busyId} act={act} refresh={() => fetchAdminBanners().then(setBannersA).catch(() => {})} />
      </div>

      {/* listings moderation */}
      <div style={{ ...mono, marginBottom: 10 }}>
        LISTINGS · MODERATION {listings && listings.filter((l) => l.status === 'pending').length > 0 ? `· 📦 ${listings.filter((l) => l.status === 'pending').length} TO RECEIVE` : ''}
      </div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 26 }}>
        {listings === null ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <span className="lok-spin" style={{ width: 22, height: 22, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#8B8B86', fontSize: 13 }}>No listings yet.</div>
        ) : (
          listings.map((l) => {
            const chip = STATUS_CHIP[l.status] || STATUS_CHIP.active
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #E6E6E3' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</span>
                    {l.is_featured && <span style={{ ...mono, fontSize: 8.5, color: '#9A6A12', background: '#FBF2DD', padding: '2px 6px', borderRadius: 0, flex: 'none' }}>FEATURED</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 600, marginTop: 2 }}>
                    {l.seller_name} · {rp(l.price)}{l.platform_fee > 0 ? ` (fee ${rp(l.platform_fee)})` : ''}
                  </div>
                </div>
                <span style={{ ...mono, fontSize: 9, color: chip.fg, background: chip.bg, padding: '4px 9px', borderRadius: 0, flex: 'none' }}>{l.status.toUpperCase()}</span>
                <div style={{ display: 'flex', gap: 7, flex: 'none' }}>
                  {l.status === 'active' && (
                    <SmallBtn label={l.is_featured ? '★ Unfeature' : '☆ Feature'} busy={busyId === l.id} onClick={() => act(l.id, () => adminSetFeatured(l.id, !l.is_featured))} />
                  )}
                  {l.status === 'pending' && (
                    <SmallBtn label="Approve ✓ (item received)" tone="accent" busy={busyId === l.id} onClick={() => act(l.id, () => adminSetListingStatus(l.id, 'active'))} />
                  )}
                  {(l.status === 'active' || l.status === 'pending') && (
                    <SmallBtn label="Remove" tone="danger" busy={busyId === l.id} onClick={() => act(l.id, () => adminSetListingStatus(l.id, 'removed'))} />
                  )}
                  {(l.status === 'removed' || l.status === 'flagged') && (
                    <SmallBtn label="Restore" tone="accent" busy={busyId === l.id} onClick={() => act(l.id, () => adminSetListingStatus(l.id, 'active'))} />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ID verification queue — members who uploaded a student ID and await review.
          Verification is NEVER automatic: the admin looks at the photo and decides. */}
      <div style={{ ...mono, marginBottom: 10 }}>🪪 ID VERIFICATION QUEUE {pendingVerif.length > 0 ? `· ${pendingVerif.length} WAITING` : ''}</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 18 }}>
        {members === null ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#8B8B86', fontSize: 12 }}>…</div>
        ) : pendingVerif.length === 0 ? (
          <div style={{ padding: '18px 20px', color: '#8B8B86', fontSize: 12.5 }}>No IDs waiting for review. When a member uploads their student ID, it appears here for you to approve or reject.</div>
        ) : (
          pendingVerif.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #E6E6E3', background: '#EDF5F9' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DBE1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#1E1E1E', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
                {m.profile_photo_url ? <img src={m.profile_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.name.charAt(0) || '?').toUpperCase()}
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                  {m.verification_status === 'rejected' && <span style={{ ...mono, fontSize: 8.5, color: '#B23A1B', background: '#FBEEE9', padding: '2px 6px', flex: 'none' }}>REJECTED</span>}
                </div>
                <div style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 600, marginTop: 2 }}>{m.email || '—'} · uploaded a student ID</div>
              </div>
              <div style={{ display: 'flex', gap: 7, flex: 'none', flexWrap: 'wrap' }}>
                <SmallBtn label="👁 View ID photo" busy={busyId === m.id} onClick={() => viewDoc(m)} />
                <SmallBtn label="Approve ✓" tone="accent" busy={busyId === m.id} onClick={() => act(m.id, () => adminSetVerification(m.id, 'verified'))} />
                <SmallBtn label="Reject ✗" tone="danger" busy={busyId === m.id} onClick={() => act(m.id, () => adminSetVerification(m.id, 'rejected'))} />
              </div>
            </div>
          ))
        )}
        {/* inline ID photo viewer (signed, time-limited URL from the private bucket) */}
        {docView && (
          <div style={{ padding: 16, borderTop: '1px solid #E6E6E3', background: '#F5F5F3' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>🪪 {docView.name} — student ID</span>
              <SmallBtn label="Close ✕" onClick={() => setDocView(null)} />
            </div>
            <img src={docView.url} alt={`Student ID of ${docView.name}`} style={{ maxWidth: '100%', maxHeight: 380, objectFit: 'contain', border: '1px solid #D8D8D4', background: '#FFFFFF', display: 'block', margin: '0 auto' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <SmallBtn label="Approve ✓" tone="accent" busy={busyId === docView.id} onClick={() => { const id = docView.id; setDocView(null); act(id, () => adminSetVerification(id, 'verified')) }} />
              <SmallBtn label="Reject ✗" tone="danger" busy={busyId === docView.id} onClick={() => { const id = docView.id; setDocView(null); act(id, () => adminSetVerification(id, 'rejected')) }} />
            </div>
          </div>
        )}
      </div>

      {/* members — verify/unverify; the DB trigger only lets admins touch this column */}
      <div style={{ ...mono, marginBottom: 10 }}>MEMBERS · VERIFICATION</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 30 }}>
        {members === null ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <span className="lok-spin" style={{ width: 22, height: 22, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#8B8B86', fontSize: 13 }}>No members yet.</div>
        ) : (
          members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #E6E6E3' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DBE1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#1E1E1E', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
                {m.profile_photo_url ? <img src={m.profile_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.name.charAt(0) || '?').toUpperCase()}
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                  {m.verification_status === 'verified' && <Verified size={13} />}
                  {m.role === 'admin' && <span style={{ ...mono, fontSize: 8.5, color: '#2F6B85', background: '#E8F2F7', padding: '2px 6px', borderRadius: 0, flex: 'none' }}>ADMIN</span>}
                  {m.is_banned && <span style={{ ...mono, fontSize: 8.5, color: '#B23A1B', background: '#FBEEE9', padding: '2px 6px', borderRadius: 0, flex: 'none' }}>BANNED</span>}
                </div>
                <div style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 7, flex: 'none', flexWrap: 'wrap' }}>
                {m.verification_doc_url && <SmallBtn label="🪪 ID" busy={busyId === m.id} onClick={() => viewDoc(m)} />}
                {m.verification_status === 'verified' ? (
                  <SmallBtn label="Unverify" tone="danger" busy={busyId === m.id} onClick={() => act(m.id, () => adminSetVerification(m.id, 'pending'))} />
                ) : (
                  <SmallBtn label="Verify ✓" tone="accent" busy={busyId === m.id} onClick={() => act(m.id, () => adminSetVerification(m.id, 'verified'))} />
                )}
                {m.role !== 'admin' &&
                  (m.is_banned ? (
                    <SmallBtn label="Unban" busy={busyId === m.id} onClick={() => act(m.id, () => adminSetBanned(m.id, false))} />
                  ) : (
                    <SmallBtn
                      label="Ban"
                      tone="danger"
                      busy={busyId === m.id}
                      onClick={() => {
                        if (window.confirm(`Ban ${m.name}? They can still browse but can't post, buy, or message until unbanned.`)) {
                          act(m.id, () => adminSetBanned(m.id, true))
                        }
                      }}
                    />
                  ))}
                {m.role !== 'admin' && (
                  <SmallBtn
                    label="Delete 🗑"
                    tone="danger"
                    busy={busyId === m.id}
                    onClick={() => {
                      if (!window.confirm(`PERMANENTLY delete ${m.name}'s account? Their profile and listings are wiped. This cannot be undone.`)) return
                      if (!window.confirm(`Really sure? Type OK to proceed — deleting ${m.email || m.name} forever.`)) return
                      setDocView(null)
                      act(m.id, () => adminDeleteUser(m.id))
                    }}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🐞 error inbox — crashes reported by members' browsers (migration 0029) */}
      <div style={{ ...mono, marginBottom: 10 }}>
        <button onClick={() => setErrOpen((v) => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', letterSpacing: 'inherit', padding: 0 }}>
          🐞 ERROR INBOX {cErrors && cErrors.length > 0 ? `· ${cErrors.length}` : '· 0'} {errOpen ? '▴' : '▾'}
        </button>
      </div>
      {errOpen && (
        <div style={{ ...card, overflow: 'hidden', marginBottom: 26 }}>
          {!cErrors || cErrors.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8B8B86', fontSize: 13 }}>No crashes reported — smooth sailing. 🎉</div>
          ) : (
            <>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #ECECEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 600 }}>JS errors from members' devices — newest first. Tell Claude the top message to get it fixed.</span>
                <SmallBtn label="Clear all" tone="danger" onClick={() => act('clear-errors', async () => { await adminClearClientErrors() })} />
              </div>
              {cErrors.map((e) => (
                <div key={e.id} style={{ padding: '10px 16px', borderBottom: '1px solid #F0F0EE', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#B23A1B', overflowWrap: 'anywhere' }}>{e.message}</div>
                  <div style={{ ...mono, fontSize: 9.5, marginTop: 3 }}>
                    {new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {e.source ? ` · ${e.source}` : ''}{e.ua ? ` · ${e.ua.slice(0, 60)}` : ''}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* 🧾 audit trail — every admin action, for accountability (migration 0029) */}
      <div style={{ ...mono, marginBottom: 10 }}>
        <button onClick={() => setAuditOpen((v) => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', letterSpacing: 'inherit', padding: 0 }}>
          🧾 ADMIN AUDIT TRAIL {audit ? `· ${audit.length}` : ''} {auditOpen ? '▴' : '▾'}
        </button>
      </div>
      {auditOpen && (
        <div style={{ ...card, overflow: 'hidden', marginBottom: 26 }}>
          {!audit || audit.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8B8B86', fontSize: 13 }}>No admin actions recorded yet.</div>
          ) : (
            audit.map((a) => (
              <div key={a.id} style={{ padding: '9px 16px', borderBottom: '1px solid #F0F0EE', display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12 }}>
                <span style={{ ...mono, fontSize: 9.5, flex: 'none' }}>{new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <b style={{ color: '#2F6B85' }}>{a.action}</b>
                {a.detail && <span style={{ color: '#5F6063' }}>{a.detail}</span>}
                {a.target && <span style={{ ...mono, fontSize: 9, color: '#ABABA6' }}>{a.target.slice(0, 8)}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
