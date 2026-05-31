import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import type { RecurringTransaction, Transaction } from '../types'

function computeNextDate(current: string, frequency: RecurringTransaction['frequency'], interval: number): string {
  const d = new Date(current + 'T00:00:00')
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7 * interval); break
    case 'biweekly': d.setDate(d.getDate() + 14 * interval); break
    case 'monthly': d.setMonth(d.getMonth() + interval); break
    case 'yearly': d.setFullYear(d.getFullYear() + interval); break
  }
  return d.toISOString().slice(0, 10)
}

export async function processRecurringTransactions(): Promise<number> {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const all = await api.list('recurringTransactions')
  const due = all.filter(r => r.isActive && r.nextDate <= today && (!r.endDate || r.endDate >= today))

  let created = 0
  for (const r of due) {
    const tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
      accountId: r.accountId,
      date: r.nextDate,
      amount: r.type === 'expense' ? -Math.abs(r.amount) : Math.abs(r.amount),
      description: r.description,
      type: r.type,
      tagIds: r.tagIds,
      notes: '',
      isReconciled: false,
      recurringId: r.id,
    }
    await api.create('transactions', tx)
    created++

    const next = computeNextDate(r.nextDate, r.frequency, r.interval)
    await api.update('recurringTransactions', r.id!, { nextDate: next })
  }
  return created
}

export function useRecurringTransactions() {
  const [items, setItems] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const data = await api.list('recurringTransactions', 'nextDate')
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const create = async (r: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = await api.create('recurringTransactions', r)
    await load()
    return result
  }

  const update = async (id: number, data: Partial<RecurringTransaction>) => {
    await api.update('recurringTransactions', id, data)
    await load()
  }

  const remove = async (id: number) => {
    await api.remove('recurringTransactions', id)
    await load()
  }

  return { items, loading, create, update, remove, reload: load }
}
