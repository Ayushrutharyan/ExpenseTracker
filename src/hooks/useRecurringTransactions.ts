import { useState, useEffect } from 'react'
import { db } from '../db/db'
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

  const due = await db.recurringTransactions
    .filter(r => r.isActive && r.nextDate <= today && (!r.endDate || r.endDate >= today))
    .toArray()

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
    await db.transactions.add({ ...tx, createdAt: new Date(), updatedAt: new Date() })
    created++

    const next = computeNextDate(r.nextDate, r.frequency, r.interval)
    await db.recurringTransactions.update(r.id!, { nextDate: next, updatedAt: new Date() })
  }
  return created
}

export function useRecurringTransactions() {
  const [items, setItems] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const data = await db.recurringTransactions.orderBy('nextDate').toArray()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const create = async (r: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    const id = await db.recurringTransactions.add({ ...r, createdAt: now, updatedAt: now } as RecurringTransaction)
    await load()
    return id
  }

  const update = async (id: number, data: Partial<RecurringTransaction>) => {
    await db.recurringTransactions.update(id, { ...data, updatedAt: new Date() })
    await load()
  }

  const remove = async (id: number) => {
    await db.recurringTransactions.delete(id)
    await load()
  }

  return { items, loading, create, update, remove, reload: load }
}
