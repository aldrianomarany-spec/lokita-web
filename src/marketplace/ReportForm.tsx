import { useState } from 'react'
import { createReport, type ReportTargetType } from '../lib/api'

const REASONS = ['Scam or fraud', 'Prohibited item', 'Wrong information', 'Harassment', 'Other']

// Small inline report form (🚩) used on the item detail modal and member
// profiles. Reason chips + optional note; collapses back to a link when idle.
export default function ReportForm({ targetType, targetId, label }: { targetType: ReportTargetType; targetId: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')

  const send = async () => {
    if (!reason || state !== 'idle') return
    setState('sending')
    try {
      await createReport(targetType, targetId, reason, note)
      setState('done')
    } catch (e) {
      setState('idle')
      alert('Could not send the report: ' + (e instanceof Error ? e.message : 'unknown error'))
    }
  }

  if (state === 'done') {
    return (
      <div style={{ fontSize: 12, color: '#3D7A54', fontWeight: 700, padding: '6px 2px' }}>
        ✓ Report sent — the LOKITA team will take a look. Thank you.
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="lok-navi"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#A29C8B', padding: '6px 2px', textAlign: 'left' }}
      >
        🚩 Report {label}
      </button>
    )
  }

  return (
    <div style={{ background: '#F4EFE5', border: '1px solid #E4DDCE', borderRadius: 14, padding: '12px 14px', animation: 'lok-fade .25s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em' }}>REPORT {label.toUpperCase()} — WHY?</span>
        <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A29C8B', fontSize: 13 }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 }}>
        {REASONS.map((r) => {
          const on = reason === r
          return (
            <button
              key={r}
              onClick={() => setReason(r)}
              className="lok-btn"
              style={{ cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, padding: '6px 11px', borderRadius: 9, border: `1.5px solid ${on ? 'var(--accent,#2A5FA8)' : '#D8CFBB'}`, background: on ? '#EAF1EC' : '#FBF8F1', color: on ? '#12503A' : '#5A5648' }}
            >
              {r}
            </button>
          )
        })}
      </div>
      <input
        className="lok-field"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a short note (optional)"
        style={{ width: '100%', boxSizing: 'border-box', background: '#FBF8F1', border: '1.5px solid #E4DDCE', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, fontFamily: 'inherit', fontWeight: 500, color: '#201E18', marginBottom: 9 }}
      />
      <button
        onClick={send}
        disabled={!reason || state === 'sending'}
        className="lok-btn"
        style={{ border: 'none', background: reason ? '#C0492A' : '#D8CFBB', color: '#FBF8F1', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 16px', borderRadius: 10, cursor: reason ? 'pointer' : 'default' }}
      >
        {state === 'sending' ? 'Sending…' : 'Send report'}
      </button>
    </div>
  )
}
