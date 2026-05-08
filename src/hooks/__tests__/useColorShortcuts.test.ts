import { describe, it, expect, vi } from 'vitest'
import { buildColorShortcutHandler } from '../useColorShortcuts'

function evt(key: string, tagName = 'BODY'): KeyboardEvent {
  return { key, target: { tagName } as HTMLElement } as unknown as KeyboardEvent
}

describe('buildColorShortcutHandler', () => {
  it('maps keys 1–6 to the correct StickerColor', () => {
    const onColor = vi.fn()
    const handler = buildColorShortcutHandler(onColor)
    const expected: [string, string][] = [
      ['1', 'U'], ['2', 'R'], ['3', 'F'], ['4', 'D'], ['5', 'L'], ['6', 'B'],
    ]
    for (const [key, color] of expected) {
      handler(evt(key))
      expect(onColor).toHaveBeenCalledWith(color)
      onColor.mockClear()
    }
  })

  it('ignores unmapped keys', () => {
    const onColor = vi.fn()
    const handler = buildColorShortcutHandler(onColor)
    for (const key of ['0', '7', 'a', 'Enter', 'ArrowRight']) {
      handler(evt(key))
    }
    expect(onColor).not.toHaveBeenCalled()
  })

  it('does not fire when focus is inside an input', () => {
    const onColor = vi.fn()
    const handler = buildColorShortcutHandler(onColor)
    handler(evt('1', 'INPUT'))
    expect(onColor).not.toHaveBeenCalled()
  })

  it('does not fire when focus is inside a textarea', () => {
    const onColor = vi.fn()
    const handler = buildColorShortcutHandler(onColor)
    handler(evt('2', 'TEXTAREA'))
    expect(onColor).not.toHaveBeenCalled()
  })
})
