import { useEffect, useState } from 'react'
import { useM } from './context'
import { fetchMembers, getUserId, type MemberRow } from '../lib/api'
import { Verified, MessageBubble } from '../components/Icons'

// Every member of the marketplace with live presence: green dot = online right
// now, grey = offline. Members-only (guests are routed to signup before here).
export default function PeopleView() {
  const { state, openSellerProfile, openRequestChat } = useM()
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
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', letterSpacing: '.08em', marginBottom: 6 }}>YOUR NEIGHBOURS</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>People</h1>
        <p style={{ fontSize: 14, color: '#6F6A5C', fontWeight: 500, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3DBB6E', display: 'inline-block', animation: 'lok-pulse 2.2s ease-in-out infinite' }} />
          {onlineCount} online now · {sorted.length} member{sorted.length === 1 ? '' : 's'}
        </p>
      </div>

      {members === null ? (
        <div style={{ height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 24, height: 24, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ background: '#FBF8F1', border: '1px dashed #D8CFBB', borderRadius: 24, padding: '52px 32px', textAlign: 'center', color: '#8A8578' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>👋</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#201E18', marginBottom: 8 }}>No members yet</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>Invite your dorm-mates — everyone who signs up appears here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((m) => {
            const isOnline = online.has(m.id)
            const isMe = m.id === uid
            return (
              <div key={m.id} style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 16, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ position: 'relative', flex: 'none' }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#DBE1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, color: '#3A362C', fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
                    {m.photo ? <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.name.charAt(0) || '?').toUpperCase()}
                  </div>
                  <span
                    title={isOnline ? 'Online now' : 'Offline'}
                    style={{ position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: '50%', background: isOnline ? '#3DBB6E' : '#C9C2B2', border: '2.5px solid #FBF8F1' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 14.5 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                    {m.verified && <Verified size={13} />}
                    {isMe && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#8A8578', background: '#F1ECE1', padding: '2px 7px', borderRadius: 6, flex: 'none' }}>YOU</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A8578', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isOnline ? <span style={{ color: '#1B7A4B' }}>Online now</span> : 'Offline'}
                    {m.building ? ` · ${m.building}` : ''}
                    {m.since ? ` · joined ${m.since}` : ''}
                  </div>
                </div>
                <div style={{ flex: 'none', display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openSellerProfile(m.id, m.name)}
                    className="lok-btn"
                    style={{ border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 13px', borderRadius: 10, cursor: 'pointer' }}
                  >
                    Profile
                  </button>
                  {!isMe && (
                    <button
                      onClick={() => openRequestChat(m.id)}
                      className="lok-btn"
                      title={`Message ${m.name}`}
                      style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 13px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <MessageBubble size={14} />
                      Message
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
