import { useState } from 'react'
import { createReport, type ReportTargetType } from '../lib/api'
import { useLang } from '../i18n'
import { errText } from '../lib/err'

const REASONS = ['Scam or fraud', 'Prohibited item', 'Wrong information', 'Harassment', 'Other']

// Small inline report form (🚩) used on the item detail modal and member
// profiles. Reason chips + optional note; collapses back to a link when idle.
export default function ReportForm({ targetType, targetId, label }: { targetType: ReportTargetType; targetId: string; label: string }) {
  const { t } = useLang()
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
      alert(t('Could not send the report:') + ' ' + (errText(e, t('unknown error'))))
    }
  }

  if (state === 'done') {
    return (
      <div style={{ fontSize: 12, color: '#3D7A54', fontWeight: 700, padding: '6px 2px' }}>
        {t('✓ Report sent — the LOKITA team will take a look. Thank you.')}
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="lok-navi"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#9A9A94', padding: '6px 2px', textAlign: 'left' }}
      >
        🚩 {t('Report')} {t(label)}
      </button>
    )
  }

  return (
    <div style={{ background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '12px 14px', animation: 'lok-fade .25s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em' }}>{t('REPORT')} {t(label).toUpperCase()} — {t('WHY?')}</span>
        <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9A9A94', fontSize: 13 }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 }}>
        {REASONS.map((r) => {
          const on = reason === r
          return (
            <button
              key={r}
              onClick={() => setReason(r)}
              className="lok-btn"
              style={{ cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, padding: '6px 11px', borderRadius: 0, border: `1.5px solid ${on ? 'var(--accent,#000000)' : '#C9C9C5'}`, background: on ? '#E8F2F7' : '#FFFFFF', color: on ? '#2F6B85' : '#4A4B4E' }}
            >
              {t(r)}
            </button>
          )
        })}
      </div>
      <input
        className="lok-field"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('Add a short note (optional)')}
        style={{ width: '100%', boxSizing: 'border-box', background: '#FFFFFF', border: '1.5px solid #D8D8D4', borderRadius: 0, padding: '9px 12px', fontSize: 12.5, fontFamily: 'inherit', fontWeight: 500, color: '#000000', marginBottom: 9 }}
      />
      <button
        onClick={send}
        disabled={!reason || state === 'sending'}
        className="lok-btn"
        style={{ border: 'none', background: reason ? '#C0492A' : '#C9C9C5', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 16px', borderRadius: 0, cursor: reason ? 'pointer' : 'default' }}
      >
        {state === 'sending' ? t('Sending…') : t('Send report')}
      </button>
    </div>
  )
}
