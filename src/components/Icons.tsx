// Reusable SVG icons ported from the LOKITA prototypes.
// Stroke icons inherit `currentColor`; the verified badge is a filled mark.

interface IconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

const stroke = (
  size: number,
  width: number,
  children: React.ReactNode,
  rest?: IconProps,
) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={rest?.className}
    style={rest?.style}
  >
    {children}
  </svg>
)

export const Search = ({ size = 17, ...r }: IconProps) =>
  stroke(size, 2.4, (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </>
  ), r)

export const Plus = ({ size = 15, ...r }: IconProps) =>
  stroke(size, 2.6, <path d="M12 5v14M5 12h14" />, r)

export const Heart = ({
  size = 17,
  fill = 'none',
  ...r
}: IconProps & { fill?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={2}
    className={r.className}
    style={r.style}
  >
    <path
      d="M12 21s-7.5-4.6-10-9.2C.2 8.3 1.8 4.7 5.2 4.7c2 0 3.4 1.2 4.2 2.4.8-1.2 2.2-2.4 4.2-2.4 3.4 0 5 3.6 3.2 7.1C19.5 16.4 12 21 12 21z"
      transform="scale(.9) translate(1.3 1.3)"
    />
  </svg>
)

export const MessageBubble = ({ size = 18, ...r }: IconProps) =>
  stroke(size, 2, <path d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1 1 21 11.5z" />, r)

export const Bell = ({ size = 18, ...r }: IconProps) =>
  stroke(size, 2, (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ), r)

export const MapPin = ({ size = 12, ...r }: IconProps) =>
  stroke(size, 2.2, (
    <>
      <path d="M12 21c4-4 7-7.4 7-11a7 7 0 1 0-14 0c0 3.6 3 7 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ), r)

export const ShieldCheck = ({ size = 22, ...r }: IconProps) =>
  stroke(size, 2, (
    <>
      <path d="M12 2 4 6v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ), r)

export const Camera = ({ size = 15, ...r }: IconProps) =>
  stroke(size, 2, (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ), r)

export const Edit = ({ size = 15, ...r }: IconProps) =>
  stroke(size, 2, (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </>
  ), r)

export const Logout = ({ size = 17, ...r }: IconProps) =>
  stroke(size, 2, (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ), r)

export const ChevronRight = ({ size = 18, ...r }: IconProps) =>
  stroke(size, 2, <path d="M9 18l6-6-6-6" />, r)

export const ChevronLeft = ({ size = 15, ...r }: IconProps) =>
  stroke(size, 2.2, <path d="M15 18l-6-6 6-6" />, r)

export const Check = ({ size = 32, ...r }: IconProps) =>
  stroke(size, 2.4, <path d="M20 6 9 17l-5-5" />, r)

export const WhatsApp = ({
  size = 17,
  ...r
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={r.className}
    style={r.style}
  >
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2a.4.4 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1c0 1.2.9 2.4 1 2.6s1.8 2.8 4.4 3.9c1.6.7 2.2.7 3 .6.5 0 1.4-.6 1.6-1.1s.2-1 .1-1.1z" />
  </svg>
)

// filled verified badge (star burst + check). checkColor tints the inner tick
// so it reads against different badge backgrounds.
export const Verified = ({
  size = 14,
  checkColor = '#FBF8F1',
  color = 'var(--accent, #2A5FA8)',
  style,
}: IconProps & { checkColor?: string; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flex: 'none', ...style }}>
    <path d="M12 2l2.4 1.8 3-.2 1 2.8 2.6 1.5-.7 2.9L23 12l-1.7 2.4.7 2.9-2.6 1.5-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L2.7 16.3l.7-2.9L1 12l1.7-2.4L2 6.7l2.6-1.5 1-2.8 3 .2z" />
    <path
      d="M8.5 12.2l2.3 2.3 4.4-4.6"
      fill="none"
      stroke={checkColor}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
