import { describe, it, expect, vi } from 'vitest'
import { buildKeydownHandler } from '../useKeyboardNav'

function evt(key: string, tagName = 'BODY'): KeyboardEvent {
  return {
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: { tagName } as HTMLElement,
  } as unknown as KeyboardEvent
}

describe('buildKeydownHandler', () => {
  it('ArrowRight calls onNext', () => {
    const onNext = vi.fn()
    buildKeydownHandler({ onNext, onPrev: vi.fn() }, () => false)(evt('ArrowRight'))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('ArrowLeft calls onPrev', () => {
    const onPrev = vi.fn()
    buildKeydownHandler({ onNext: vi.fn(), onPrev }, () => false)(evt('ArrowLeft'))
    expect(onPrev).toHaveBeenCalledOnce()
  })

  it('Space calls onTogglePlay', () => {
    const onTogglePlay = vi.fn()
    buildKeydownHandler({ onNext: vi.fn(), onPrev: vi.fn(), onTogglePlay }, () => false)(evt(' '))
    expect(onTogglePlay).toHaveBeenCalledOnce()
  })

  it('Home calls onHome', () => {
    const onHome = vi.fn()
    buildKeydownHandler({ onNext: vi.fn(), onPrev: vi.fn(), onHome }, () => false)(evt('Home'))
    expect(onHome).toHaveBeenCalledOnce()
  })

  it('End calls onEnd', () => {
    const onEnd = vi.fn()
    buildKeydownHandler({ onNext: vi.fn(), onPrev: vi.fn(), onEnd }, () => false)(evt('End'))
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled', () => {
    const onNext = vi.fn()
    buildKeydownHandler({ onNext, onPrev: vi.fn() }, () => true)(evt('ArrowRight'))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('does not fire when target is INPUT', () => {
    const onNext = vi.fn()
    buildKeydownHandler({ onNext, onPrev: vi.fn() }, () => false)(evt('ArrowRight', 'INPUT'))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('does not fire when target is TEXTAREA', () => {
    const onNext = vi.fn()
    buildKeydownHandler({ onNext, onPrev: vi.fn() }, () => false)(evt('ArrowRight', 'TEXTAREA'))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('calls preventDefault on handled keys', () => {
    const e = evt('ArrowRight')
    buildKeydownHandler({ onNext: vi.fn(), onPrev: vi.fn() }, () => false)(e)
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('does not throw when optional callbacks are absent', () => {
    const handler = buildKeydownHandler({ onNext: vi.fn(), onPrev: vi.fn() }, () => false)
    expect(() => handler(evt(' '))).not.toThrow()
    expect(() => handler(evt('Home'))).not.toThrow()
    expect(() => handler(evt('End'))).not.toThrow()
  })
})
