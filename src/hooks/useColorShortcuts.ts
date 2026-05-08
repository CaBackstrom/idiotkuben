import { useEffect, useRef } from 'react'
import type { StickerColor } from '../cube/CubeState'

const KEY_TO_COLOR: Record<string, StickerColor> = {
  '1': 'U', '2': 'R', '3': 'F', '4': 'D', '5': 'L', '6': 'B',
}

// Pure function — testable without React.
export function buildColorShortcutHandler(onColor: (color: StickerColor) => void) {
  return (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    const color = KEY_TO_COLOR[e.key]
    if (color) onColor(color)
  }
}

export function useColorShortcuts(onColor: (color: StickerColor) => void) {
  const onColorRef = useRef(onColor)
  onColorRef.current = onColor

  useEffect(() => {
    const handler = buildColorShortcutHandler((c) => onColorRef.current(c))
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
