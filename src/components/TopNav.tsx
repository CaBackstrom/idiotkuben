import { useState, type ReactNode } from 'react'
import { type Navigate } from '../pages/routes'
import { useLanguage } from '../context/LanguageContext'
import { sounds } from '../utils/sounds'

type Props = {
  navigate: Navigate
  onBack?: () => void
  right?: ReactNode
  wordmarkOnly?: boolean
  keyboardHint?: string
}

function SoundIcon({ on }: { on: boolean }) {
  return on ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 5.5h2.5L8 2.5v11L4.5 10.5H2V5.5z" fill="currentColor" />
      <path d="M10.5 5.5c1.1.6 1.5 1.5 1.5 2.5s-.4 1.9-1.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12.5 3.5c2 1.1 2.5 2.8 2.5 4.5s-.5 3.4-2.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 5.5h2.5L8 2.5v11L4.5 10.5H2V5.5z" fill="currentColor" />
      <line x1="11" y1="5" x2="15" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="15" y1="5" x2="11" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export default function TopNav({ navigate, onBack, right, wordmarkOnly = false, keyboardHint }: Props) {
  const { t, lang, setLang } = useLanguage()
  const [soundOn, setSoundOn] = useState(sounds.isEnabled())

  function toggleSound() {
    const next = !soundOn
    sounds.toggle(next)
    setSoundOn(next)
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--border)] h-12 sm:h-14">
      <div className="flex items-center h-full px-4 sm:px-6 gap-3">
        {/* Left: back button */}
        <div className="flex-1">
          {!wordmarkOnly && onBack && (
            <button
              onClick={onBack}
              className="text-[var(--muted)] hover:text-[var(--fg)] text-sm flex items-center gap-1 transition-colors"
            >
              {'←'} {t('nav.back')}
            </button>
          )}
        </div>

        {/* Center: wordmark */}
        <button
          onClick={() => navigate('/')}
          className="text-[var(--fg)] font-bold text-lg shrink-0 hover:opacity-70 transition-opacity"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('nav.wordmark')}
        </button>

        {/* Right: controls or page label */}
        <div className="flex-1 flex justify-end items-center gap-3">
          {right != null && (
            <span className="text-sm text-[var(--muted)] hidden sm:block">{right}</span>
          )}
          {keyboardHint && (
            <span
              title={keyboardHint}
              className="hidden sm:inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-[var(--muted)] border border-[var(--border)] rounded-full cursor-default hover:text-[var(--fg)] transition-colors"
            >
              {'?'}
            </span>
          )}

          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute' : 'Sound on'}
            className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors p-1"
            aria-pressed={soundOn}
          >
            <SoundIcon on={soundOn} />
          </button>

          {/* Language toggle */}
          <div className="flex items-center gap-0.5 text-xs font-medium">
            <button
              onClick={() => setLang('en')}
              className={`px-1.5 py-0.5 transition-colors ${
                lang === 'en'
                  ? 'text-[var(--fg)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
            >
              EN
            </button>
            <span className="text-[var(--border)]">|</span>
            <button
              onClick={() => setLang('sv')}
              className={`px-1.5 py-0.5 transition-colors ${
                lang === 'sv'
                  ? 'text-[var(--fg)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
            >
              SV
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
