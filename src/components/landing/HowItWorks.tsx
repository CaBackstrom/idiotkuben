import { useLanguage } from '../../context/LanguageContext'

// Placeholder images until Carl provides real screenshots.
// Replace <Placeholder> with <img src="/screenshots/step-N-xxx.png" ... /> when ready.
function Placeholder({ label, bg }: { label: string; bg: string }) {
  return (
    <svg
      width="280"
      height="400"
      viewBox="0 0 280 400"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', borderRadius: '12px', flexShrink: 0 }}
    >
      <rect width="280" height="400" fill={bg} rx="12" />
      <text
        x="140"
        y="195"
        textAnchor="middle"
        fill="rgba(255,255,255,0.9)"
        fontSize="15"
        fontFamily="Inter, sans-serif"
        fontWeight="600"
      >
        {label}
      </text>
      <text
        x="140"
        y="218"
        textAnchor="middle"
        fill="rgba(255,255,255,0.5)"
        fontSize="11"
        fontFamily="Inter, sans-serif"
      >
        screenshot placeholder
      </text>
    </svg>
  )
}

export default function HowItWorks() {
  const { t } = useLanguage()

  const steps = [
    {
      visual: <Placeholder label={t('landing.step1Title')} bg="#1A5C7A" />,
      title: t('landing.step1Title'),
      caption: t('landing.step1Desc'),
      rotate: '2deg',
    },
    {
      visual: <Placeholder label={t('landing.step2Title')} bg="#C8102E" />,
      title: t('landing.step2Title'),
      caption: t('landing.step2Desc'),
      rotate: '-1deg',
    },
    {
      visual: <Placeholder label={t('landing.step3Title')} bg="#2D7A4F" />,
      title: t('landing.step3Title'),
      caption: t('landing.step3Desc'),
      rotate: '1.5deg',
    },
  ]

  return (
    <section style={{ padding: '5rem 1.5rem', background: 'linear-gradient(150deg, rgba(0,158,96,0.06) 0%, #FAFAF5 50%, rgba(255,213,0,0.06) 100%)' }}>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontStyle: 'italic',
          fontWeight: 400,
          textAlign: 'center',
          marginBottom: '3.5rem',
          color: 'var(--fg)',
        }}
      >
        {t('landing.howTitle')}
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '3rem',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        {steps.map(({ visual, title, caption, rotate }, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                transform: `rotate(${rotate})`,
                boxShadow: '0 4px 12px rgba(26,26,26,0.08)',
                borderRadius: '12px',
                overflow: 'hidden',
                maxWidth: '280px',
                width: '100%',
              }}
            >
              {visual}
            </div>
            <h3
              style={{
                marginTop: '1.25rem',
                marginBottom: '0.375rem',
                fontSize: '1rem',
                fontWeight: 600,
                textAlign: 'center',
                color: 'var(--fg)',
              }}
            >
              {title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center', lineHeight: '1.5' }}>
              {caption}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
