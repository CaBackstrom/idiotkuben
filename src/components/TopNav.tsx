import { type ReactNode } from 'react'
import { sv } from '../i18n/sv'
import { type Navigate } from '../pages/routes'

type Props = {
  navigate: Navigate
  onBack?: () => void
  right?: ReactNode
}

export default function TopNav({ navigate, onBack, right }: Props) {
  return (
    <header
      className="sticky top-0 z-40 bg-white border-b border-[var(--border)]"
      style={{ height: '56px' }}
    >
      <div className="flex items-center h-full px-4 sm:px-6 gap-4">
        <div className="flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="text-[var(--muted)] hover:text-[var(--fg)] text-sm flex items-center gap-1 transition-colors"
            >
              {'←'} {sv.nav.back}
            </button>
          )}
        </div>

        <button
          onClick={() => navigate('/')}
          className="text-[var(--fg)] font-bold text-lg shrink-0 hover:opacity-70 transition-opacity"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {sv.nav.wordmark}
        </button>

        <div className="flex-1 flex justify-end">
          {right != null && (
            <span className="text-sm text-[var(--muted)]">{right}</span>
          )}
        </div>
      </div>
    </header>
  )
}
