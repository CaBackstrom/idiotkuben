import type { CSSProperties } from 'react'

// Blobs sized and centered so they're visible within whatever container is clipped around them.
// No white blob — invisible on the #FAFAF7 background.
const BLOBS: CSSProperties[] = [
  // Red — center-right
  { top: '30%', left: '55%', background: 'radial-gradient(circle, #C8102E 0%, transparent 65%)', opacity: 0.70 },
  // Green — center-left
  { top: '35%', left: '-8%', background: 'radial-gradient(circle, #009E60 0%, transparent 65%)', opacity: 0.65 },
  // Yellow — lower center
  { top: '55%', left: '30%', background: 'radial-gradient(circle, #FFD500 0%, transparent 65%)', opacity: 0.75 },
  // Blue — top-left
  { top: '0%',  left: '5%',  background: 'radial-gradient(circle, #0051BA 0%, transparent 65%)', opacity: 0.60 },
  // Orange — top-right
  { top: '5%',  right: '5%', background: 'radial-gradient(circle, #FF5800 0%, transparent 65%)', opacity: 0.60 },
]

// Six-color Rubik mesh aura — blobs centered in visible area, 350px, 80px blur.
export default function MeshAura() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {BLOBS.map((style, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '350px',
            height: '350px',
            filter: 'blur(80px)',
            ...style,
          }}
        />
      ))}
    </div>
  )
}
