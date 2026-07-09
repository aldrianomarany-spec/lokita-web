import { useM } from './context'
import { CHATS } from '../data'
import { T } from '../theme'
import { Verified } from '../components/Icons'

export default function MessagesView() {
  const { state, openChat, sendMsg, setMsgDraft } = useM()
  const s = state

  const firstUnread = CHATS.find((c) => c.unread && !s.read[c.id])
  const activeId = s.chatId != null ? s.chatId : (firstUnread || CHATS[0]).id
  const activeRaw = CHATS.find((c) => c.id === activeId) || CHATS[0]

  const fullThread = (activeRaw.thread || []).concat(s.extra[activeId] || [])

  return (
    <div style={{ animation: 'lok-fade .3s ease both', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', letterSpacing: '.08em', marginBottom: 6 }}>YOUR CONVERSATIONS</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>Messages</h1>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        {/* list */}
        <div style={{ width: 300, flex: 'none', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 20, overflow: 'hidden', overflowY: 'auto' }}>
          {CHATS.map((c) => {
            const unread = c.unread && !s.read[c.id]
            return (
              <div
                key={c.id}
                onClick={() => openChat(c.id)}
                className="lok-navi"
                style={{ cursor: 'pointer', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid #EEE7D8', background: c.id === activeId ? '#F1ECE1' : '#FBF8F1' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: T[c.tone].tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#3A362C', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{c.initial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', flex: 'none' }}>{c.ago}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6F6A5C', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{c.last}</div>
                </div>
                {unread && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4562F', flex: 'none' }} />}
              </div>
            )
          })}
        </div>

        {/* thread */}
        <div style={{ flex: 1, background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ padding: '15px 18px', borderBottom: '1px solid #EEE7D8', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: T[activeRaw.tone].tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#3A362C', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{activeRaw.initial}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 15 }}>
                {activeRaw.name}
                <Verified size={13} />
              </div>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#8A8578', marginTop: 2 }}>Re: {activeRaw.item}</div>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#12503A', background: '#EAF1EC', border: '1px solid #CFE2D7', padding: '6px 10px', borderRadius: 9 }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 6v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
              Verified
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, background: '#F4EFE5' }}>
            {fullThread.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.who === 'me' ? 'flex-end' : 'flex-start',
                  maxWidth: '64%',
                  background: m.who === 'me' ? 'var(--accent,#2A5FA8)' : '#FBF8F1',
                  color: m.who === 'me' ? '#F7F3EA' : '#201E18',
                  fontSize: 13.5,
                  lineHeight: 1.45,
                  padding: '10px 14px',
                  borderRadius: m.who === 'me' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontWeight: 500,
                  boxShadow: '0 1px 2px rgba(32,30,24,.05)',
                }}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 18px', borderTop: '1px solid #EEE7D8', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="lok-field"
              value={s.msgDraft}
              onChange={(e) => setMsgDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMsg(activeId)
              }}
              placeholder="Type a message…"
              style={{ flex: 1, background: '#F4EFE5', border: '1.5px solid #E4DDCE', borderRadius: 13, padding: '12px 15px', fontSize: 13.5, fontFamily: 'inherit', fontWeight: 500, color: '#201E18' }}
            />
            <button onClick={() => sendMsg(activeId)} className="lok-btn" style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '12px 20px', borderRadius: 13, cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
