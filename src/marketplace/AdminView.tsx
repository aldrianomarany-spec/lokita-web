import { useCallback, useEffect, useState } from 'react'
import { useM } from './context'
import {
  fetchAdminStats,
  fetchAdminListings,
  fetchAdminMembers,
  fetchAdminReports,
  adminSetListingStatus,
  adminSetFeatured,
  adminSetVerification,
  adminSetReportStatus,
  type AdminStats,
  type AdminListingRow,
  type AdminMemberRow,
  type AdminReportRow,
} from '../lib/api'
import { Verified } from '../components/Icons'

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
const mono: React.CSSProperties = { fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', letterSpacing: '.08em' }
const card: React.CSSProperties = { background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18 }

const STATUS_CHIP: Record<string, { bg: string; fg: string }> = {
  active: { bg: '#EAF1EC', fg: '#12503A' },
  sold: { bg: '#FBF2DD', fg: '#9A6A12' },
  removed: { bg: '#FBEEE9', fg: '#B23A1B' },
  flagged: { bg: '#FBEEE9', fg: '#B23A1B' },
}

function SmallBtn({ label, onClick, tone = 'plain', busy }: { label: string; onClick: () => void; tone?: 'plain' | 'danger' | 'accent'; busy?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    plain: { border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#3A362C' },
    danger: { border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A' },
    accent: { border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA' },
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="lok-btn"
      style={{ ...styles[tone], fontFamily: 'inherit', fontWeight: 700, fontSize: 11.5, padding: '7px 12px', borderRadius: 10, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, flex: 'none' }}
    >
      {label}
    </button>
  )
}

export default function AdminView() {
  const { state, refreshReports, openMember } = useM()
  const isAdmin = !state.guest && state.profile.role === 'admin'

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [listings, setListings] = useState<AdminListingRow[] | null>(null)
  const [members, setMembers] = useState<AdminMemberRow[] | null>(null)
  const [reports, setReports] = useState<AdminReportRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [s, l, m, r] = await Promise.all([fetchAdminStats(), fetchAdminListings(), fetchAdminMembers(), fetchAdminReports()])
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
      <div style={{ ...card, borderStyle: 'dashed', padding: '52px 32px', textAlign: 'center', color: '#8A8578', maxWidth: 520, margin: '40px auto 0' }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>🛡️</div>
        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#201E18', marginBottom: 8 }}>Admins only</div>
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
        <div style={{ background: '#FBEEE9', border: '1px solid #E4C4B8', color: '#B23A1B', borderRadius: 14, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{err}</div>
      )}

      {/* stats tiles + revenue */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ ...card, flex: '1 1 130px', padding: '16px 18px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>{t.value}</div>
            <div style={{ ...mono, fontSize: 9.5, marginTop: 4 }}>{t.label}</div>
          </div>
        ))}
        <div style={{ flex: '2 1 240px', background: '#201E18', borderRadius: 18, padding: '16px 18px', color: '#F7F3EA' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#8FB4E3' }}>
            {stats ? rp(stats.feeCollected) : '…'}
          </div>
          <div style={{ ...mono, fontSize: 9.5, marginTop: 4, color: 'rgba(247,243,234,.6)' }}>LOKITA REVENUE — FEES ON SOLD ITEMS</div>
          {stats && stats.feePending > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(247,243,234,.65)', fontWeight: 600, marginTop: 6 }}>+ {rp(stats.feePending)} riding on active listings</div>
          )}
        </div>
      </div>

      {/* reports queue — open ones first, resolved/dismissed shown muted */}
      <div style={{ ...mono, marginBottom: 10 }}>
        REPORTS · QUEUE {reports && reports.filter((r) => r.status === 'open').length > 0 ? `· ${reports.filter((r) => r.status === 'open').length} OPEN` : ''}
      </div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 26 }}>
        {reports === null ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <span className="lok-spin" style={{ width: 22, height: 22, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#8A8578', fontSize: 13 }}>No reports — all quiet. 🎉</div>
        ) : (
          [...reports]
            .sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1))
            .map((r) => {
              const open = r.status === 'open'
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #EEE7D8', opacity: open ? 1 : 0.55 }}>
                  <span style={{ flex: 'none', fontSize: 16 }}>{r.target_type === 'listing' ? '🏷️' : '👤'}</span>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.target_label}</div>
                    <div style={{ fontSize: 11.5, color: '#8A8578', fontWeight: 600, marginTop: 2 }}>
                      {r.reason} — reported by {r.reporter_name}
                    </div>
                  </div>
                  <span style={{ ...mono, fontSize: 9, color: open ? '#B23A1B' : '#3D7A54', background: open ? '#FBEEE9' : '#EAF1EC', padding: '4px 9px', borderRadius: 7, flex: 'none' }}>
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

      {/* listings moderation */}
      <div style={{ ...mono, marginBottom: 10 }}>LISTINGS · MODERATION</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 26 }}>
        {listings === null ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <span className="lok-spin" style={{ width: 22, height: 22, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#8A8578', fontSize: 13 }}>No listings yet.</div>
        ) : (
          listings.map((l) => {
            const chip = STATUS_CHIP[l.status] || STATUS_CHIP.active
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #EEE7D8' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</span>
                    {l.is_featured && <span style={{ ...mono, fontSize: 8.5, color: '#9A6A12', background: '#FBF2DD', padding: '2px 6px', borderRadius: 6, flex: 'none' }}>FEATURED</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8A8578', fontWeight: 600, marginTop: 2 }}>
                    {l.seller_name} · {rp(l.price)}{l.platform_fee > 0 ? ` (fee ${rp(l.platform_fee)})` : ''}
                  </div>
                </div>
                <span style={{ ...mono, fontSize: 9, color: chip.fg, background: chip.bg, padding: '4px 9px', borderRadius: 7, flex: 'none' }}>{l.status.toUpperCase()}</span>
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

      {/* members — verify/unverify; the DB trigger only lets admins touch this column */}
      <div style={{ ...mono, marginBottom: 10 }}>MEMBERS · VERIFICATION</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 30 }}>
        {members === null ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <span className="lok-spin" style={{ width: 22, height: 22, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#8A8578', fontSize: 13 }}>No members yet.</div>
        ) : (
          members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #EEE7D8' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DBE1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#3A362C', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                {(m.name.charAt(0) || '?').toUpperCase()}
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                  {m.verification_status === 'verified' && <Verified size={13} />}
                  {m.role === 'admin' && <span style={{ ...mono, fontSize: 8.5, color: '#12503A', background: '#EAF1EC', padding: '2px 6px', borderRadius: 6, flex: 'none' }}>ADMIN</span>}
                </div>
                <div style={{ fontSize: 11.5, color: '#8A8578', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 7, flex: 'none' }}>
                {m.verification_status === 'verified' ? (
                  <SmallBtn label="Unverify" tone="danger" busy={busyId === m.id} onClick={() => act(m.id, () => adminSetVerification(m.id, 'pending'))} />
                ) : (
                  <SmallBtn label="Verify ✓" tone="accent" busy={busyId === m.id} onClick={() => act(m.id, () => adminSetVerification(m.id, 'verified'))} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
