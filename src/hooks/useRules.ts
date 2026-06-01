import { useEffect, useState, useCallback } from 'react'
import { api } from '../utils/api'
import type { Rule } from '../types'

export function useRules() {
  const [items, setItems] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await api.list('rules', 'createdAt')
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (rule: Record<string, unknown>) => {
    const result = await api.create('rules', rule)
    await load()
    return result
  }

  const update = async (id: number, data: Record<string, unknown>) => {
    await api.update('rules', id, data)
    await load()
  }

  const remove = async (id: number) => {
    await api.remove('rules', id)
    await load()
  }

  return { items, loading, create, update, remove, reload: load }
}

export async function applyRules(description: string, accountId: number): Promise<number[]> {
  const all = await api.list('rules')
  const rules = all.filter(r => r.isActive)
  const desc = description.toLowerCase()
  const matched = new Set<number>()

    for (const rule of rules) {
      if (!desc.includes(rule.pattern.toLowerCase())) continue
      if (rule.accountId != null && rule.accountId !== accountId) continue
      if (!Array.isArray(rule.tagIds)) continue
      for (const tagId of rule.tagIds) {
        matched.add(tagId)
      }
    }

  return Array.from(matched)
}
