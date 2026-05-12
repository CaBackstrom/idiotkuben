import { useLanguage } from '../../context/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer
      style={{
        padding: '3rem 1.5rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center' }}>
        {t('landing.footerCredit')}
      </p>
      <a
        href="https://github.com/CaBackstrom/idiotkuben"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '0.875rem',
          color: 'var(--muted)',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        GitHub
      </a>
    </footer>
  )
}
