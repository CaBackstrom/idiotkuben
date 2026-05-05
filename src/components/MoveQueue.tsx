import { useState, useCallback, useRef } from 'react'
import { type MoveName } from '../cube/moves'
import { type QueuedMove } from './Cube3D'

export type MoveQueueAPI = {
  queue: QueuedMove[]
  enqueue: (move: MoveName) => void
  onMoveComplete: (moveId: number) => void
  isAnimating: boolean
  pendingCount: number
  clear: () => void
}

let nextId = 0

export function useMoveQueue(): MoveQueueAPI {
  const [queue, setQueue] = useState<QueuedMove[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const animatingId = useRef<number | null>(null)

  const enqueue = useCallback((move: MoveName) => {
    const item: QueuedMove = { name: move, id: nextId++ }
    setQueue(q => {
      if (q.length === 0 && !animatingId.current) {
        // Will start animating immediately
        animatingId.current = item.id
        setIsAnimating(true)
      }
      return [...q, item]
    })
  }, [])

  const onMoveComplete = useCallback((moveId: number) => {
    setQueue(q => {
      const remaining = q.filter(m => m.id !== moveId)
      if (remaining.length === 0) {
        animatingId.current = null
        setIsAnimating(false)
      } else {
        animatingId.current = remaining[0].id
      }
      return remaining
    })
  }, [])

  const clear = useCallback(() => {
    setQueue([])
    setIsAnimating(false)
    animatingId.current = null
  }, [])

  return {
    queue,
    enqueue,
    onMoveComplete,
    isAnimating,
    pendingCount: Math.max(0, queue.length - 1),
    clear,
  }
}
