import { format } from 'date-fns'

export function formatCurrency(amount: number, currency?: string): string {
  const c = currency || localStorage.getItem('defaultCurrency') || 'INR'
  const locale = c === 'INR' ? 'en-IN' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: c,
    signDisplay: 'auto',
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy')
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}
