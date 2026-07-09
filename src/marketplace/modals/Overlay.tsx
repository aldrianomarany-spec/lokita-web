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
      style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,24,.55)', zIndex: z, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, animation: 'lok-fade .2s ease both', backdropFilter: 'blur(3px)' }}
    >
      {children}
    </div>
  )
}

export const stop = (e: React.MouseEvent) => e.stopPropagation()

export const closeBtnStyle: React.CSSProperties = {
  border: '1px solid #E4DDCE',
  background: '#F4EFE5',
  width: 34,
  height: 34,
  borderRadius: 10,
  fontSize: 15,
  cursor: 'pointer',
  color: '#5A5648',
}
