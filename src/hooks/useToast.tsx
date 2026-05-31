import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { Undo2 } from 'lucide-react'
import { haptic } from '../utils/haptic'

interface Toast {
  message: string
  undo?: () => void
}

interface ToastContextValue {
  showToast: (message: string, undo?: () => void) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showToast = useCallback((message: string, undo?: () => void) => {
    haptic(10)
    setToast({ message, undo })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 5000)
  }, [])

  const handleUndo = useCallback(() => {
    toast?.undo?.()
    setToast(null)
    if (timer.current) clearTimeout(timer.current)
  }, [toast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up" role="alert" aria-live="polite">
          <div className="flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white px-4 py-3 rounded-xl shadow-xl border border-gray-700 dark:border-gray-600">
            <span className="text-sm">{toast.message}</span>
            {toast.undo && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-1 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Undo2 size={14} /> Undo
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
