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
  adminSetTickerSettings,
  type TickerSettings,
  adminSetReportStatus,
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

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
const mono: React.CSSProperties = { fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em' }
const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0 }

const STATUS_CHIP: Record<string, { bg: string; fg: string }> = {
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
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  // inline student-ID viewer (signed URL from the private verification bucket)
  const [docView, setDocView] = useState<{ id: string; name: string; url: string } | null>(null)

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
      alert('Could not save ticker settings: ' + (e instanceof Error ? e.message : 'run migration 0026 first?'))
    }
  }

  const viewDoc = async (m: AdminMemberRow) => {
    if (!m.verification_doc_url) return
    try {
      const url = await getVerificationDocUrl(m.verification_doc_url, 300)
      setDocView({ id: m.id, name: m.name, url })
    } catch (e) {
      alert('Could not open the ID photo: ' + (e instanceof Error ? e.message : 'unknown error'))
    }
  }

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [s, l, m, r] = await Promise.all([fetchAdminStats(), fetchAdminListings(), fetchAdminMembers(), fetchAdminReports()])
      fetchAdminBanners().then(setBannersA).catch(() => setBannersA([]))
      fetchTickerSettings().then(setTickerCfg).catch(() => setTickerCfg(null))
      fetchAdminTrends().then(setTrends).catch(() => setTrends(null)) // errors → hide the analytics section
      setStats(s)
      setListings(l)
      setMembers(m)
      setReports(r)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load admin data')
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
      alert('Action failed: ' + (e instanceof Error ? e.message : 'unknown error'))
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
    trendCards = (
      <>
        <div style={{ ...mono, marginBottom: 10 }}>ANALYTICS · LAST 8 WEEKS</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
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

      {/* promotion banners — the big black homepage slot */}
      <div style={{ ...mono, marginBottom: 10 }}>PROMOTION BANNERS · BIG BLACK SLOT</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 26, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input className="lok-field" value={bForm.title} onChange={(e) => setBForm({ ...bForm, title: e.target.value })} placeholder="Headline (e.g. Graduation clearout week)" style={{ flex: '2 1 240px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
          <input className="lok-field" value={bForm.subtitle} onChange={(e) => setBForm({ ...bForm, subtitle: e.target.value })} placeholder="Subtitle (optional)" style={{ flex: '2 1 220px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="lok-field" value={bForm.cta} onChange={(e) => setBForm({ ...bForm, cta: e.target.value })} placeholder="Button label (e.g. Shop bundles)" style={{ flex: '1 1 170px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', color: '#000000' }} />
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
                alert('Could not publish: ' + (e instanceof Error ? e.message : 'run migration 0021 first?'))
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
                alert('Could not publish: ' + (e instanceof Error ? e.message : 'run migration 0023 first?'))
              } finally {
                setTSaving(false)
              }
            }}
          />
        </div>
        <BannerList items={(bannersA || []).filter((b) => b.placement === 'ticker')} busyId={busyId} act={act} refresh={() => fetchAdminBanners().then(setBannersA).catch(() => {})} />
      </div>

      {/* listings moderation */}
      <div style={{ ...mono, marginBottom: 10 }}>LISTINGS · MODERATION</div>
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
                  {l.status === 'active' && (
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
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DBE1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#1E1E1E', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                {(m.name.charAt(0) || '?').toUpperCase()}
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
    </div>
  )
}
