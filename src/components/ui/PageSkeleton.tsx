export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>
      <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      ))}
    </div>
  )
}
