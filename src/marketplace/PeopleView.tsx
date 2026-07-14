import { useEffect, useState } from 'react'
import { useM } from './context'
import { fetchMembers, getUserId, type MemberRow } from '../lib/api'
import { Verified, MessageBubble } from '../components/Icons'
import { useLang } from '../i18n'

// Every member of the marketplace with live presence: green dot = online right
// now, grey = offline. Members-only (guests are routed to signup before here).

// Relative "last seen" label; null → older than 7 days / unknown (caller keeps
// the plain offline display).
const lastSeenLabel = (iso: string | null, t: (s: string) => string): string | null => {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return null
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return t('just now')
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return days < 7 ? `${days}d` : null
}

export default function PeopleView() {
  const { state, openMember, openRequestChat } = useM()
  const { t } = useLang()
  const s = state
  const [members, setMembers] = useState<MemberRow[] | null>(null)
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    getUserId().then(setUid)
    fetchMembers()
      .then(setMembers)
      .catch(() => setMembers([]))
  }, [])

  const online = new Set(s.onlineIds)
  const sorted = (members || []).slice().sort((a, b) => {
    const ao = online.has(a.id) ? 0 : 1
    const bo = online.has(b.id) ? 0 : 1
    return ao - bo || a.name.localeCompare(b.name)
  })
  const onlineCount = sorted.filter((m) => online.has(m.id)).length

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', marginBottom: 6 }}>{t('YOUR NEIGHBOURS')}</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>{t('People')}</h1>
        <p style={{ fontSize: 14, color: '#5F6063', fontWeight: 500, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3DBB6E', display: 'inline-block', animation: 'lok-pulse 2.2s ease-in-out infinite' }} />
          {onlineCount} {t('online now')} · {sorted.length} {sorted.length === 1 ? t('member') : t('members')}
        </p>
      </div>

      {members === null ? (
        <div style={{ height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 24, height: 24, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px dashed #C9C9C5', borderRadius: 0, padding: '52px 32px', textAlign: 'center', color: '#8B8B86' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>👋</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#000000', marginBottom: 8 }}>{t('No members yet')}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{t('Invite your dorm-mates — everyone who signs up appears here.')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((m) => {
            const isOnline = online.has(m.id)
            const isMe = m.id === uid
            const seen = isOnline ? null : lastSeenLabel(m.last_seen_at, t)
            return (
              <div key={m.id} style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ position: 'relative', flex: 'none' }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#DBE1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, color: '#1E1E1E', fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
                    {m.photo ? <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.name.charAt(0) || '?').toUpperCase()}
                  </div>
                  <span
                    title={isOnline ? t('Online now') : t('Offline')}
                    style={{ position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: '50%', background: isOnline ? '#3DBB6E' : '#C9C2B2', border: '2.5px solid #FFFFFF' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 14.5 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                    {m.role === 'admin' ? (
                      <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 8.5, fontWeight: 700, background: '#519BB8', color: '#FFFFFF', padding: '2px 6px', letterSpacing: 1, borderRadius: 0 }}>🛡️ {t('ADMIN')}</span>
                    ) : (
                      m.verified && <Verified size={13} />
                    )}
                    {isMe && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#8B8B86', background: '#ECECEA', padding: '2px 7px', borderRadius: 0, flex: 'none' }}>{t('YOU')}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#8B8B86', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isOnline ? <span style={{ color: '#1E9E5A' }}>{t('Online now')}</span> : seen ? `${t('Last seen')} ${seen}` : t('Offline')}
                    {m.building ? ` · ${m.building}` : ''}
                    {m.since ? ` · ${t('joined')} ${m.since}` : ''}
                  </div>
                </div>
                <div style={{ flex: 'none', display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openMember(m.id, m.name)}
                    className="lok-btn"
                    style={{ border: '1px solid #C9C9C5', background: '#F5F5F3', color: '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 13px', borderRadius: 0, cursor: 'pointer' }}
                  >
                    {t('Profile')}
                  </button>
                  {!isMe && (
                    <button
                      onClick={() => openRequestChat(m.id)}
                      className="lok-btn"
                      title={`${t('Message')} ${m.name}`}
                      style={{ border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 13px', borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <MessageBubble size={14} />
                      {t('Message')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
