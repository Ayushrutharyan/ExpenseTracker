import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl rounded-xl border border-gray-200/60 dark:border-purple-500/10 shadow-sm dark:shadow-purple-500/5 ${onClick ? 'cursor-pointer hover:shadow-md dark:hover:shadow-purple-500/10 hover:border-purple-200 dark:hover:border-purple-500/20 transition-all duration-200' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
