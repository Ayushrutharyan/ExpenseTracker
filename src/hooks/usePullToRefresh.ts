import { useState, useRef, useCallback } from 'react'

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)

  const [pullDistance, setPullDistance] = useState(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY
      pulling.current = true
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0) {
      setPullDistance(Math.min(diff, 120))
    }
  }, [])

  const onTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (!pulling.current) return
    pulling.current = false
    setPullDistance(0)
    const diff = e.changedTouches[0].clientY - startY.current
    if (diff > 80 && !refreshing) {
      setRefreshing(true)
      await onRefresh()
      setRefreshing(false)
    }
  }, [onRefresh, refreshing])

  return { refreshing, pullDistance, onTouchStart, onTouchMove, onTouchEnd }
}
