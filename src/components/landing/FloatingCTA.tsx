import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import type { Navigate } from '../../pages/routes'

type Props = {
  heroRef: React.RefObject<HTMLElement | null>
  navigate: Navigate
}

// Mobile-only floating CTA that fades in after hero scrolls out of view.
export default function FloatingCTA({ heroRef, navigate }: Props) {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    observerRef.current = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    observerRef.current.observe(el)
    return () => observerRef.current?.disconnect()
  }, [heroRef])

  return (
    <div
      className="sm:hidden"
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: 0,
        right: 0,
        padding: '0 1.5rem',
        display: 'flex',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 250ms ease',
        pointerEvents: visible ? 'auto' : 'none',
        zIndex: 40,
      }}
    >
      <button
        onClick={() => navigate('/level')}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '1rem',
          background: 'var(--accent)',
          backdropFilter: 'blur(12px)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(200,16,46,0.25)',
          fontWeight: 600,
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        {t('landing.floatingCta')}
      </button>
    </div>
  )
}
