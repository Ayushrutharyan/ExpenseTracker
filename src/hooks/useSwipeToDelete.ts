import { useState, useRef, useCallback } from 'react'

export function useSwipeToDelete(onDelete: () => void) {
  const [swiping, setSwiping] = useState(false)
  const [offsetX, setOffsetX] = useState(0)
  const startX = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    setSwiping(true)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffsetX(Math.max(dx, -100))
  }, [])

  const onTouchEnd = useCallback(() => {
    setSwiping(false)
    if (offsetX < -60) {
      if (confirm('Delete this transaction?')) onDelete()
    }
    setOffsetX(0)
  }, [offsetX, onDelete])

  const style: React.CSSProperties = swiping
    ? { transform: `translateX(${offsetX}px)`, transition: 'none' }
    : { transform: 'translateX(0)', transition: 'transform 0.2s ease' }

  return { style, onTouchStart, onTouchMove, onTouchEnd }
}
