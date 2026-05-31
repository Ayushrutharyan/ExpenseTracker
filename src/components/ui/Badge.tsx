interface BadgeProps {
  label: string
  color?: string
  className?: string
}

export function Badge({ label, color = '#6b7280', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: color + '20', color }}
    >
      {label}
    </span>
  )
}
