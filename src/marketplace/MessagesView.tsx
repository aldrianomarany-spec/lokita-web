import { useEffect, useRef, useState } from 'react'
import { useM } from './context'
import { useIsPhone } from './useIsMobile'
import { getUserId } from '../lib/api'
import { Verified } from '../components/Icons'
import { useLang } from '../i18n'

// one-tap canned answers — the sets differ by which side of the trade you're on
const QUICK_SELLER = [
  'Still available! 👍',
  'Sorry, it just sold 🙏',
  "Deal — order it in the app and I'll drop it off",
  "I'll drop it at the Security Post tomorrow",
]
const QUICK_BUYER = [
  'Is this still available?',
  'Can you do a lower price?',
  'When can you drop it at the Security Post?',
  "Deal — I'll order now 👍",
]

// compact emoji keyboard — curated set, no library needed
const EMOJIS = ['😀','😂','🤣','😊','😍','😘','😎','🤔','😅','🙂','😢','😭','😡','🥺','🤝','👍','👎','🙏','👏','💪','✌️','🤙','👋','🫶','❤️','💔','🔥','✨','🎉','🎊','💯','⭐','✅','❌','❓','‼️','💰','💸','🛒','📦','🚚','🏷️','⏰','📍','🏠','🛏️','🪑','📚','💻','📱','🎧','👕','👟','🧺','🍜','☕','🍰','😴','🤗','🤩','😇','🙌','🤞','🆗','🆕']

const timeShort = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function Avatar({ photo, initial, size }: { photo: string | null; initial: string; size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#DBE1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#1E1E1E', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
      {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </div>
  )
}

export default function MessagesView() {
  const { state, openConversation, deleteThread, cancelAttach, sendMsg, setMsgDraft, patch, openListingById } = useM()
  const [emojiOpen, setEmojiOpen] = useState(false)
  const emojiRef = useRef<HTMLDivElement>(null)
  const { t } = useLang()
  const s = state
  const isPhone = useIsPhone()
  const [uid, setUid] = useState<string | null>(null)
  useEffect(() => {
    getUserId().then(setUid)
  }, [])

  // auto-open the most recent conversation when entering the view — desktop only.
  // On phone we keep the list visible until the user taps a conversation.
  useEffect(() => {
    if (!isPhone && !s.activeConvId && s.convs.length > 0) openConversation(s.convs[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.convs, s.activeConvId, isPhone])

  const active = s.convs.find((c) => c.id === s.activeConvId || (s.activeConvId ? c.conv_ids.includes(s.activeConvId) : false)) || null
  const back = () => patch({ activeConvId: null, msgs: [] })
  // on phone show one pane at a time
  const showList = !isPhone || !s.activeConvId
  const showThread = !isPhone || !!s.activeConvId

  return (
    <div style={{ animation: 'lok-fade .3s ease both', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', marginBottom: 6 }}>{t('YOUR CONVERSATIONS')}</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>{t('Messages')}</h1>
      </div>

      {s.convsLoading && s.convs.length === 0 ? (
        <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 26, height: 26, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : s.convs.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px dashed #C9C9C5', borderRadius: 0, padding: '52px 32px', textAlign: 'center', color: '#8B8B86', maxWidth: 520, margin: '20px auto 0' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>💬</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#000000', marginBottom: 8 }}>{t('No conversations yet')}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{t('Start browsing items and tap')} <b style={{ color: '#000000' }}>{t('Message seller')}</b> {t('on a listing to begin a chat. Your conversations will appear here.')}</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
          {/* conversation list */}
          {showList && (
          <div style={{ width: isPhone ? '100%' : 300, flex: 'none', background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, overflow: 'hidden', overflowY: 'auto' }}>
            {s.convs.map((c) => (
              <div key={c.id} onClick={() => openConversation(c.id)} className="lok-navi" style={{ cursor: 'pointer', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid #E6E6E3', background: c.id === s.activeConvId ? '#ECECEA' : '#FFFFFF' }}>
                <div style={{ position: 'relative', flex: 'none' }}>
                  <Avatar photo={c.other_photo} initial={(c.other_name.charAt(0) || '?').toUpperCase()} size={44} />
                  {c.item_photo && (
                    <img src={c.item_photo} alt="" style={{ position: 'absolute', bottom: -3, right: -5, width: 22, height: 22, borderRadius: 0, objectFit: 'cover', border: '2px solid #FFFFFF' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.other_name}</div>
                    <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', flex: 'none' }}>{timeShort(c.last_at)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#5F6063', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{c.last_content || t('Say hello 👋')}</div>
                </div>
                {c.unread > 0 && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4562F', flex: 'none' }} />}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(t('Delete this chat? It disappears for both of you and cannot be undone.'))) deleteThread(c)
                  }}
                  title={t('Delete chat')}
                  className="lok-navi"
                  style={{ flex: 'none', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#B9B9B3', padding: 4 }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
          )}

          {/* thread */}
          {showThread && (
          <div style={{ flex: 1, background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {active && (
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #E6E6E3', display: 'flex', alignItems: 'center', gap: 12 }}>
                {isPhone && (
                  <button onClick={back} aria-label={t('Back')} className="lok-navi" style={{ flex: 'none', border: '1px solid #D8D8D4', background: '#F5F5F3', width: 34, height: 34, borderRadius: 0, cursor: 'pointer', color: '#4A4B4E', fontSize: 16, fontWeight: 700 }}>‹</button>
                )}
                <Avatar photo={active.other_photo} initial={(active.other_name.charAt(0) || '?').toUpperCase()} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 15 }}>
                    {active.other_name}
                    {active.other_verified && <Verified size={13} />}
                  </div>
                  <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#8B8B86', marginTop: 2 }}>{active.item_title ? t('About a listing') : t('Direct message')}</div>
                </div>
              </div>
            )}
            {/* pinned product card — the item this chat is about (like any
                marketplace app), tap to open the listing */}
            {active && active.listing_id && active.item_title && (
              <div
                onClick={() => openListingById(active.listing_id!)}
                className="lok-btn"
                style={{ cursor: 'pointer', margin: '10px 14px 0', background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 0, background: '#ECECEA', overflow: 'hidden', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {active.item_photo ? <img src={active.item_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{active.item_title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    {active.item_price != null && (
                      <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 14, color: 'var(--accent,#000000)' }}>Rp {Number(active.item_price).toLocaleString('id-ID')}</span>
                    )}
                    {active.item_status && active.item_status !== 'active' && (
                      <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 600, color: '#9A6A12', background: '#FBF2DD', padding: '2px 7px', borderRadius: 0 }}>{t(active.item_status.toUpperCase())}</span>
                    )}
                  </div>
                </div>
                <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: 'var(--accent,#000000)' }}>{t('View item ›')}</span>
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, background: '#F5F5F3' }}>
              {s.msgs.length === 0 && !s.msgsLoading && (
                <div style={{ margin: 'auto', color: '#9A9A94', fontSize: 13, textAlign: 'center' }}>{t('No messages yet — send the first one.')}</div>
              )}
              {s.msgs.map((m) => {
                const mine = m.sender_id === uid
                return (
                  <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '64%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* product-card attachment — which item this message is about */}
                    {m.item_title && (
                      <div
                        onClick={() => m.listing_id && openListingById(m.listing_id)}
                        className="lok-btn"
                        style={{ cursor: m.listing_id ? 'pointer' : 'default', background: '#FFFFFF', border: '1px solid #D8D8D4', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 9, borderRadius: 10 }}
                      >
                        <div style={{ width: 38, height: 38, flex: 'none', background: '#ECECEA', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
                          {m.item_photo ? <img src={m.item_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: '#000000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>{m.item_title}</div>
                          {m.item_price != null && <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12, color: '#000000' }}>Rp {Number(m.item_price).toLocaleString('id-ID')}</div>}
                        </div>
                      </div>
                    )}
                    <div style={{ background: mine ? 'var(--accent,#000000)' : '#FFFFFF', color: mine ? '#F7F3EA' : '#000000', fontSize: 13.5, lineHeight: 1.45, padding: '10px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,.05)', alignSelf: mine ? 'flex-end' : 'flex-start' }}>{m.content}</div>
                  </div>
                )
              })}
            </div>
            {/* quick replies — one tap sends; horizontal scroll on small screens */}
            {active && (
              <div style={{ padding: '10px 18px 0', borderTop: '1px solid #E6E6E3', display: 'flex', gap: 7, overflowX: 'auto' }}>
                {(active.i_am_seller ? QUICK_SELLER : QUICK_BUYER).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMsg(t(q))}
                    className="lok-navi"
                    style={{ flex: 'none', border: '1px solid #D8D8D4', background: '#F5F5F3', color: '#1E1E1E', fontFamily: 'inherit', fontWeight: 600, fontSize: 12, padding: '7px 12px', borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {t(q)}
                  </button>
                ))}
              </div>
            )}
            {/* queued product card — attaches to the next message sent */}
            {s.pendingAttach && (
              <div style={{ margin: '10px 18px 0', display: 'flex', alignItems: 'center', gap: 9, background: '#FBF5E9', border: '1px solid #C8A96A', padding: '7px 10px' }}>
                <div style={{ width: 30, height: 30, flex: 'none', background: '#ECECEA', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.pendingAttach.photo ? <img src={s.pendingAttach.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('Attached:')} {s.pendingAttach.title} · {s.pendingAttach.price}
                </div>
                <button onClick={cancelAttach} style={{ flex: 'none', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, color: '#8B8B86' }}>✕</button>
              </div>
            )}
            <div style={{ padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center', position: 'relative' }}>
              {/* emoji keyboard */}
              <button
                onClick={() => setEmojiOpen((v) => !v)}
                title={t('Emoji')}
                className="lok-navi"
                style={{ flex: 'none', border: '1.5px solid #D8D8D4', background: emojiOpen ? '#ECECEA' : '#F5F5F3', width: 42, height: 42, borderRadius: 0, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
              >
                😊
              </button>
              {emojiOpen && (
                <div ref={emojiRef} style={{ position: 'absolute', bottom: 64, left: 18, width: 292, maxHeight: 220, overflowY: 'auto', background: '#FFFFFF', border: '1px solid #D8D8D4', boxShadow: '0 18px 40px -12px rgba(0,0,0,.3)', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, zIndex: 30, animation: 'lok-pop .15s ease both' }}>
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => setMsgDraft(s.msgDraft + e)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 19, padding: 4, lineHeight: 1 }}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
              <input
                className="lok-field"
                value={s.msgDraft}
                onChange={(e) => setMsgDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMsg()
                }}
                placeholder={t('Type a message…')}
                style={{ flex: 1, background: '#F5F5F3', border: '1.5px solid #D8D8D4', borderRadius: 0, padding: '12px 15px', fontSize: 13.5, fontFamily: 'inherit', fontWeight: 500, color: '#000000' }}
              />
              <button onClick={() => sendMsg()} className="lok-btn" style={{ border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '12px 20px', borderRadius: 0, cursor: 'pointer' }}>{t('Send')}</button>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  )
}
