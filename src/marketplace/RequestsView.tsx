import { useCallback, useEffect, useState } from 'react'
import { useM } from './context'
import { fetchRequests, createRequest, setRequestStatus, type RequestRow } from '../lib/api'
import { SELL_CATEGORIES } from '../theme'
import { Verified } from '../components/Icons'

// Buyers post "looking for X"; anyone can respond via chat.
const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')
const timeAgo = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return mins < 1 ? 'just now' : mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  return Math.floor(hrs / 24) + 'd ago'
}

const field: React.CSSProperties = {
  background: '#F4EFE5',
  border: '1.5px solid #E4DDCE',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  fontWeight: 500,
  color: '#201E18',
}

export default function RequestsView() {
  const { state, goSignup, openRequestChat } = useM()
  const s = state
  const [rows, setRows] = useState<RequestRow[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [cat, setCat] = useState('Others')
  const [budget, setBudget] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    fetchRequests()
      .then(setRows)
      .catch(() => setRows([]))
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const post = async () => {
    if (saving) return
    if (s.guest) return goSignup()
    if (!title.trim()) return alert('Please describe what you are looking for.')
    setSaving(true)
    try {
      await createRequest({ title: title.trim(), category: cat, budgetMax: budget ? Number(budget) : null, description: desc.trim() })
      setTitle('')
      setBudget('')
      setDesc('')
      setFormOpen(false)
      load()
    } catch (e) {
      alert('Could not post your request: ' + (e instanceof Error ? e.message : 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const close = async (r: RequestRow, status: 'fulfilled' | 'closed') => {
    if (busyId) return
    setBusyId(r.id)
    try {
      await setRequestStatus(r.id, status)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not update the request')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', letterSpacing: '.08em', marginBottom: 6 }}>WANTED · REQUESTS</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>Looking for…</h1>
          <p style={{ fontSize: 14, color: '#6F6A5C', fontWeight: 500, margin: '8px 0 0' }}>Can't find it in the feed? Post a request — neighbours who have one will message you.</p>
        </div>
        <button
          className="lok-btn"
          onClick={() => (s.guest ? goSignup() : setFormOpen((v) => !v))}
          style={{ flex: 'none', border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '11px 16px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 6px 16px -6px rgba(42,95,168,.6)' }}
        >
          {formOpen ? 'Close form' : '+ Post a request'}
        </button>
      </div>

      {formOpen && (
        <div style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 20, padding: '20px 22px', marginBottom: 20, animation: 'lok-rise .3s ease both' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="lok-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you looking for? e.g. Mini fridge under 500k" style={field} />
            <div style={{ display: 'flex', gap: 10 }}>
              <select className="lok-field" value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...field, flex: 1, fontWeight: 600 }}>
                {SELL_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input className="lok-field" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Max budget in Rp (optional)" inputMode="numeric" style={{ ...field, flex: 1 }} />
            </div>
            <textarea className="lok-field" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Details — condition you'd accept, when you need it…" style={{ ...field, minHeight: 60, resize: 'none' }} />
            <button onClick={post} className="lok-btn" style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 13, cursor: 'pointer' }}>
              {saving ? 'Posting…' : 'Post request'}
            </button>
          </div>
        </div>
      )}

      {rows === null ? (
        <div style={{ height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 24, height: 24, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : rows.length === 0 ? (
        <div style={{ background: '#FBF8F1', border: '1px dashed #D8CFBB', borderRadius: 24, padding: '52px 32px', textAlign: 'center', color: '#8A8578' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>🙋</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#201E18', marginBottom: 8 }}>No open requests</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>Be the first — post what you're hunting for and let neighbours come to you.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#E7EEF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#2A5FA8', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
                  {r.requester_photo ? <img src={r.requester_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (r.requester_name.charAt(0) || '?').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15.5, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{r.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6F6A5C', fontWeight: 600, marginTop: 3, flexWrap: 'wrap' }}>
                    {r.requester_name}
                    {r.requester_verified && <Verified size={12} />}
                    <span style={{ color: '#B7AF9C' }}>· {timeAgo(r.created_at)}</span>
                  </div>
                  {r.description && <div style={{ fontSize: 13, color: '#5A5648', lineHeight: 1.55, marginTop: 7 }}>{r.description}</div>}
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
                    {r.category && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#3A362C', background: '#F1ECE1', padding: '4px 9px', borderRadius: 7 }}>{r.category.toUpperCase()}</span>}
                    {r.budget_max != null && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#12503A', background: '#EAF1EC', padding: '4px 9px', borderRadius: 7 }}>BUDGET · {rupiah(r.budget_max)}</span>}
                  </div>
                </div>
                <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {r.mine ? (
                    <>
                      <button disabled={busyId === r.id} onClick={() => close(r, 'fulfilled')} className="lok-btn" style={{ border: 'none', background: '#E7F1EA', color: '#1B7A4B', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, padding: '9px 13px', borderRadius: 10, cursor: 'pointer' }}>Mark fulfilled ✓</button>
                      <button disabled={busyId === r.id} onClick={() => close(r, 'closed')} className="lok-btn" style={{ border: '1px solid #E4DDCE', background: '#F4EFE5', color: '#8A8578', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, padding: '9px 13px', borderRadius: 10, cursor: 'pointer' }}>Remove</button>
                    </>
                  ) : (
                    <button onClick={() => openRequestChat(r.user_id)} className="lok-btn" style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '10px 14px', borderRadius: 10, cursor: 'pointer' }}>I have this 💬</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
