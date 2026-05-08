// Soft mesh-gradient aura for landing page hero only.
// Pure CSS — no JS. Two blurred radial blobs using brand palette.
export default function MeshAura() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '-15%',
          width: '65%',
          height: '65%',
          background: 'radial-gradient(circle, #C8102E 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '70%',
          height: '70%',
          background: 'radial-gradient(circle, #FFC72C 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.35,
        }}
      />
    </div>
  )
}
