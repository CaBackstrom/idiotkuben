import { useLanguage } from '../../context/LanguageContext'
import type { Navigate } from '../../pages/routes'

export default function TwoLevels({ navigate }: { navigate: Navigate }) {
  const { t } = useLanguage()

  const levels = [
    {
      name: t('landing.beginnerName'),
      desc: t('landing.beginnerDesc'),
      moves: t('landing.beginnerMoves'),
      accent: '#C8102E',
      label: 'Guided',
    },
    {
      name: t('landing.advancedName'),
      desc: t('landing.advancedDesc'),
      moves: t('landing.advancedMoves'),
      accent: '#0051BA',
      label: 'Optimal',
    },
  ]

  return (
    <section style={{ padding: '5rem 1.5rem' }}>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontStyle: 'italic',
          fontWeight: 400,
          textAlign: 'center',
          marginBottom: '3rem',
          color: 'var(--fg)',
        }}
      >
        {t('landing.twoLevelsTitle')}
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          maxWidth: '700px',
          margin: '0 auto',
        }}
      >
        {levels.map(({ name, desc, moves, accent, label }) => (
          <div
            key={name}
            className="card-base"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  background: accent,
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{name}</h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>{desc}</p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: accent, margin: 0 }}>{moves}</p>
            <button
              onClick={() => navigate('/level')}
              style={{
                marginTop: '0.5rem',
                padding: '0.625rem 1.25rem',
                background: accent,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              {t('landing.cta').replace(' →', '')} →
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
