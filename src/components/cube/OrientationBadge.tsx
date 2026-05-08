import { forwardRef } from 'react'

// HTML overlay positioned top-right of the cube canvas.
// Text is updated imperatively from FaceTracker (useFrame) to avoid re-renders.
const OrientationBadge = forwardRef<HTMLDivElement>((_, ref) => (
  <div
    ref={ref}
    style={{
      position: 'absolute',
      top: '8px',
      right: '8px',
      background: 'rgba(255,255,255,0.82)',
      border: '1px solid rgba(26,26,26,0.1)',
      borderRadius: '6px',
      padding: '4px 8px',
      fontSize: '11px',
      lineHeight: 1.5,
      color: 'var(--muted, #666)',
      fontFamily: 'var(--font-mono, monospace)',
      pointerEvents: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
    }}
  />
))
OrientationBadge.displayName = 'OrientationBadge'

export default OrientationBadge
