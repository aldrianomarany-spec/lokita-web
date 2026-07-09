import { useEffect, useState } from 'react'
import { useM } from './context'
import { getUserId } from '../lib/api'
import { Verified } from '../components/Icons'

const timeShort = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function Avatar({ photo, initial, size }: { photo: string | null; initial: string; size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#DBE1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#3A362C', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
      {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </div>
  )
}

export default function MessagesView() {
  const { state, openConversation, sendMsg, setMsgDraft } = useM()
  const s = state
  const [uid, setUid] = useState<string | null>(null)
  useEffect(() => {
    getUserId().then(setUid)
  }, [])

  // auto-open the most recent conversation when entering the view
  useEffect(() => {
    if (!s.activeConvId && s.convs.length > 0) openConversation(s.convs[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.convs, s.activeConvId])

  const active = s.convs.find((c) => c.id === s.activeConvId) || null

  return (
    <div style={{ animation: 'lok-fade .3s ease both', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', letterSpacing: '.08em', marginBottom: 6 }}>YOUR CONVERSATIONS</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>Messages</h1>
      </div>

      {s.convsLoading && s.convs.length === 0 ? (
        <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 26, height: 26, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : s.convs.length === 0 ? (
        <div style={{ background: '#FBF8F1', border: '1px dashed #D8CFBB', borderRadius: 24, padding: '52px 32px', textAlign: 'center', color: '#8A8578', maxWidth: 520, margin: '20px auto 0' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>💬</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#201E18', marginBottom: 8 }}>No conversations yet</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>Start browsing items and tap <b style={{ color: '#201E18' }}>Message seller</b> on a listing to begin a chat. Your conversations will appear here.</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
          {/* conversation list */}
          <div style={{ width: 300, flex: 'none', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 20, overflow: 'hidden', overflowY: 'auto' }}>
            {s.convs.map((c) => (
              <div key={c.id} onClick={() => openConversation(c.id)} className="lok-navi" style={{ cursor: 'pointer', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid #EEE7D8', background: c.id === s.activeConvId ? '#F1ECE1' : '#FBF8F1' }}>
                <Avatar photo={c.other_photo} initial={(c.other_name.charAt(0) || '?').toUpperCase()} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.other_name}</div>
                    <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', flex: 'none' }}>{timeShort(c.last_at)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6F6A5C', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{c.last_content || 'Say hello 👋'}</div>
                </div>
                {c.unread > 0 && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4562F', flex: 'none' }} />}
              </div>
            ))}
          </div>

          {/* thread */}
          <div style={{ flex: 1, background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {active && (
              <div style={{ padding: '15px 18px', borderBottom: '1px solid #EEE7D8', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar photo={active.other_photo} initial={(active.other_name.charAt(0) || '?').toUpperCase()} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 15 }}>
                    {active.other_name}
                    {active.other_verified && <Verified size={13} />}
                  </div>
                  <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#8A8578', marginTop: 2 }}>Re: {active.item_title}</div>
                </div>
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, background: '#F4EFE5' }}>
              {s.msgs.length === 0 && !s.msgsLoading && (
                <div style={{ margin: 'auto', color: '#A29C8B', fontSize: 13, textAlign: 'center' }}>No messages yet — send the first one.</div>
              )}
              {s.msgs.map((m) => {
                const mine = m.sender_id === uid
                return (
                  <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '64%', background: mine ? 'var(--accent,#2A5FA8)' : '#FBF8F1', color: mine ? '#F7F3EA' : '#201E18', fontSize: 13.5, lineHeight: 1.45, padding: '10px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontWeight: 500, boxShadow: '0 1px 2px rgba(32,30,24,.05)' }}>{m.content}</div>
                )
              })}
            </div>
            <div style={{ padding: '14px 18px', borderTop: '1px solid #EEE7D8', display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                className="lok-field"
                value={s.msgDraft}
                onChange={(e) => setMsgDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMsg()
                }}
                placeholder="Type a message…"
                style={{ flex: 1, background: '#F4EFE5', border: '1.5px solid #E4DDCE', borderRadius: 13, padding: '12px 15px', fontSize: 13.5, fontFamily: 'inherit', fontWeight: 500, color: '#201E18' }}
              />
              <button onClick={() => sendMsg()} className="lok-btn" style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '12px 20px', borderRadius: 13, cursor: 'pointer' }}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
