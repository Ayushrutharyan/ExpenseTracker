import { useEffect, useState, useCallback } from 'react'
import { db } from '../db/db'
import type { Rule } from '../types'

export function useRules() {
  const [items, setItems] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await db.rules.orderBy('createdAt').toArray()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (rule: Omit<Rule, 'id' | 'createdAt'>) => {
    const id = await db.rules.add({ ...rule, createdAt: new Date() } as Rule)
    await load()
    return id
  }

  const update = async (id: number, data: Partial<Rule>) => {
    await db.rules.update(id, data)
    await load()
  }

  const remove = async (id: number) => {
    await db.rules.delete(id)
    await load()
  }

  return { items, loading, create, update, remove, reload: load }
}

export async function applyRules(description: string, accountId: number): Promise<number[]> {
  const rules = await db.rules.filter(r => r.isActive).toArray()
  const desc = description.toLowerCase()
  const matched = new Set<number>()

  for (const rule of rules) {
    if (!desc.includes(rule.pattern.toLowerCase())) continue
    if (rule.accountId !== undefined && rule.accountId !== accountId) continue
    for (const tagId of rule.tagIds) {
      matched.add(tagId)
    }
  }

  return Array.from(matched)
}
