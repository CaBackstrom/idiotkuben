import { useEffect, useRef } from 'react'

type Callbacks = {
  onNext: () => void
  onPrev: () => void
  onTogglePlay?: () => void
  onHome?: () => void
  onEnd?: () => void
}

// Pure function — testable without React.
export function buildKeydownHandler(cbs: Callbacks, isDisabled: () => boolean) {
  return (e: KeyboardEvent) => {
    if (isDisabled()) return
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); e.stopPropagation(); cbs.onNext(); break
      case 'ArrowLeft':  e.preventDefault(); e.stopPropagation(); cbs.onPrev(); break
      case ' ':          e.preventDefault(); e.stopPropagation(); cbs.onTogglePlay?.(); break
      case 'Home':       e.preventDefault(); e.stopPropagation(); cbs.onHome?.(); break
      case 'End':        e.preventDefault(); e.stopPropagation(); cbs.onEnd?.(); break
    }
  }
}

export function useKeyboardNav(cbs: Callbacks & { disabled?: boolean }) {
  const { disabled = false, onNext, onPrev, onTogglePlay, onHome, onEnd } = cbs
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled

  useEffect(() => {
    const handler = buildKeydownHandler(
      { onNext, onPrev, onTogglePlay, onHome, onEnd },
      () => disabledRef.current,
    )
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // Stable callbacks expected; consumers should use useCallback if needed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNext, onPrev, onTogglePlay, onHome, onEnd])
}
