type Props = {
  pct: number // 0-100
}

// 2px strip below TopNav, visible only on /solve.
// Filled portion animates on phase change with 600ms ease-out.
export default function ProgressStrip({ pct }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '56px',
        left: 0,
        right: 0,
        height: '2px',
        background: 'rgba(26,26,26,0.06)',
        zIndex: 49,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: 'var(--accent)',
          transition: 'width 600ms ease-out',
        }}
      />
    </div>
  )
}
