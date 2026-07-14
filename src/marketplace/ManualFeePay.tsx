import { useState } from 'react'
import { useM } from './context'
import { useLang } from '../i18n'

// Manual fee payment (middleman launch mode): transfer to the ADMIN's
// GoPay/bank, upload the transfer screenshot, the team verifies in the
// Control Room. Used for 🚀 boosts and 🛡️ Buyer Protection.
export default function ManualFeePay({
  title,
  amount,
  uploaded,
  onUpload,
}: {
  title: string
  amount: number
  uploaded: boolean
  onUpload: (file: File) => Promise<void>
}) {
  const { state } = useM()
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(uploaded)
  const ap = state.adminPay
  const hasDetails = !!(ap.gopay || ap.bank_account)

  if (sent) {
    return (
      <div style={{ background: '#EAF5EE', border: '1px solid #BFE3CC', padding: '11px 14px', fontSize: 12.5, color: '#2C6E49', fontWeight: 700, textAlign: 'left' }}>
        ✓ {t('Proof sent — the LOKITA team verifies it and activates this shortly.')}
      </div>
    )
  }

  return (
    <div style={{ background: '#EDF5F9', border: '1px solid #BFDCE8', padding: '13px 14px', textAlign: 'left' }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: '#27607A', marginBottom: 4 }}>{title}</div>
      <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 17, color: '#27607A', marginBottom: 8 }}>Rp {amount.toLocaleString('id-ID')}</div>
      {hasDetails ? (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
          {ap.gopay && (
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1E1E1E', background: '#FFFFFF', border: '1px solid #BFDCE8', padding: '7px 11px' }}>GoPay · {ap.gopay}</span>
          )}
          {ap.bank_account && (
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1E1E1E', background: '#FFFFFF', border: '1px solid #BFDCE8', padding: '7px 11px' }}>{ap.bank_name || 'Bank'} · {ap.bank_account}</span>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#8B8B86', fontWeight: 600, marginBottom: 10 }}>{t('Ask the LOKITA team for payment details in chat.')}</div>
      )}
      <label className="lok-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: '#519BB8', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '10px 16px', borderRadius: 0, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
        📤 {busy ? t('Uploading…') : t('Upload transfer screenshot')}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file || busy) return
            setBusy(true)
            try {
              await onUpload(file)
              setSent(true)
            } catch (err) {
              alert((err as { message?: string })?.message || t('Something went wrong'))
            } finally {
              setBusy(false)
            }
          }}
        />
      </label>
      <div style={{ fontSize: 10.5, color: '#5F6063', fontWeight: 500, marginTop: 8, lineHeight: 1.5 }}>
        {t('Transfer the amount, screenshot the receipt, upload it here — the team approves after checking.')}
      </div>
    </div>
  )
}
