import { useLanguage } from '../../context/LanguageContext'

export default function TutorTease() {
  const { t } = useLanguage()

  return (
    <section style={{ padding: '5rem 1.5rem', background: '#FAFAF5' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontStyle: 'italic',
            fontWeight: 400,
            marginBottom: '2.5rem',
            color: 'var(--fg)',
          }}
        >
          {t('landing.tutorTitle')}
        </h2>

        {/* Mock chat bubble */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* User question */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div
              style={{
                background: 'var(--accent)',
                color: 'white',
                borderRadius: '16px 16px 4px 16px',
                padding: '0.75rem 1.125rem',
                maxWidth: '80%',
                fontSize: '0.9375rem',
                lineHeight: '1.5',
              }}
            >
              {t('landing.tutorQ')}
            </div>
          </div>

          {/* Tutor answer */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--fg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ color: 'white', fontSize: '14px' }}>AI</span>
            </div>
            <div
              style={{
                background: 'white',
                border: '1px solid rgba(26,26,26,0.08)',
                borderRadius: '4px 16px 16px 16px',
                padding: '0.75rem 1.125rem',
                maxWidth: '80%',
                fontSize: '0.9375rem',
                lineHeight: '1.5',
                color: 'var(--fg)',
                boxShadow: '0 2px 8px rgba(26,26,26,0.06)',
              }}
            >
              {t('landing.tutorA')}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
