import { T, type Tone } from '../theme'

// The prototype uses labelled striped CSS placeholders in place of real photos.
// Drop real <img> here when photography is available.
interface StripeProps {
  tone: Tone
  photo: string
  height?: number | string
  gap?: number // stripe repeat size (12 in cards, 14 in detail modal)
  fontSize?: number
  radiusTop?: boolean
  children?: React.ReactNode // absolutely-positioned overlays (tags, buttons)
}

export default function Stripe({
  tone,
  photo,
  height = 172,
  gap = 12,
  fontSize = 11,
  children,
}: StripeProps) {
  const t = T[tone]
  return (
    <div style={{ position: 'relative', height, overflow: 'hidden', background: t.tint }}>
      <div
        className="lok-img"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(135deg,${t.stripe} 0 ${gap}px,transparent ${gap}px ${gap * 2}px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'Spline Sans Mono',monospace",
            fontSize,
            color: t.label,
            letterSpacing: '.02em',
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          {photo}
        </span>
      </div>
      {children}
    </div>
  )
}
