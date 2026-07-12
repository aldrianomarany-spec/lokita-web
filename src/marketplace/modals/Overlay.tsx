// Shared modal overlay: dimmed backdrop that closes on click, with a card that
// stops propagation. zIndex is configurable so checkout can sit above detail.
export default function Overlay({
  onClose,
  z = 80,
  children,
}: {
  onClose: () => void
  z?: number
  children: React.ReactNode
}) {
  return (
    <div
      onClick={onClose}
      className="lok-overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: z, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, animation: 'lok-fade .2s ease both', backdropFilter: 'blur(3px)' }}
    >
      {children}
    </div>
  )
}

export const stop = (e: React.MouseEvent) => e.stopPropagation()

export const closeBtnStyle: React.CSSProperties = {
  border: '1px solid #D8D8D4',
  background: '#F5F5F3',
  width: 34,
  height: 34,
  borderRadius: 0,
  fontSize: 15,
  cursor: 'pointer',
  color: '#4A4B4E',
}
