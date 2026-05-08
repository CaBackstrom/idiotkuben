import { describe, it, expect } from 'vitest'
import { getPhaseTabItems } from './PhaseTabs'
import type { Phase } from '../../solver/phases'
import { solvedState } from '../../cube/CubeState'

const solved = solvedState()
const mockPhases: Phase[] = [
  { id: 1, nameKey: 'phase1', moves: [], stateAfter: solved },
  { id: 2, nameKey: 'phase2', moves: [], stateAfter: solved },
  { id: 3, nameKey: 'phase3', moves: [], stateAfter: solved },
  { id: 4, nameKey: 'phase4', moves: [], stateAfter: solved },
]

const t = (key: string) => key

describe('getPhaseTabItems', () => {
  it('beginner mode (guided) returns 4 tabs', () => {
    const tabs = getPhaseTabItems('guided', mockPhases, 1, t)
    expect(tabs).toHaveLength(4)
  })

  it('advanced mode (quick) returns 1 tab', () => {
    const tabs = getPhaseTabItems('quick', mockPhases, 1, t)
    expect(tabs).toHaveLength(1)
  })

  it('advanced mode tab has id "optimal"', () => {
    const [tab] = getPhaseTabItems('quick', mockPhases, 1, t)
    expect(tab.id).toBe('optimal')
    expect(tab.isActive).toBe(true)
  })

  it('beginner tabs have correct ids 1–4', () => {
    const tabs = getPhaseTabItems('guided', mockPhases, 2, t)
    expect(tabs.map(t => t.id)).toEqual(['1', '2', '3', '4'])
  })

  it('beginner mode marks correct tab as active', () => {
    const tabs = getPhaseTabItems('guided', mockPhases, 3, t)
    const active = tabs.filter(t => t.isActive)
    expect(active).toHaveLength(1)
    expect(active[0].id).toBe('3')
  })

  it('beginner labels come from t() with phases.* keys', () => {
    const tabs = getPhaseTabItems('guided', mockPhases, 1, t)
    expect(tabs[0].label).toBe('phases.1')
    expect(tabs[1].label).toBe('phases.2')
  })

  it('advanced label comes from t("phases.optimal")', () => {
    const [tab] = getPhaseTabItems('quick', mockPhases, 1, t)
    expect(tab.label).toBe('phases.optimal')
  })
})
