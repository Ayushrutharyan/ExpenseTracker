import { getSyncKey } from './syncKey'

const API_URL = '/api'

function jsonify(obj: unknown): unknown {
  if (Array.isArray(obj)) return JSON.stringify(obj)
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = jsonify(v)
    }
    return result
  }
  return obj
}

async function post(body: Record<string, unknown>) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ syncKey: getSyncKey(), ...jsonify(body) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'API request failed')
  }
  return res.json()
}

export const api = {
  list: (table: string, orderBy?: string, order?: 'asc' | 'desc', limit?: number) =>
    post({ table, action: 'list', orderBy, order, limit }),

  get: (table: string, id: number) =>
    post({ table, action: 'get', id }),

  create: (table: string, data: Record<string, unknown>) =>
    post({ table, action: 'create', data }),

  update: (table: string, id: number, data: Record<string, unknown>) =>
    post({ table, action: 'update', id, data }),

  remove: (table: string, id: number) =>
    post({ table, action: 'delete', id }),

  count: (table: string) =>
    post({ table, action: 'count' }),

  query: (table: string, filters: Record<string, unknown>, orderBy?: string, order?: 'asc' | 'desc', limit?: number) =>
    post({ table, action: 'query', filters, orderBy, order, limit }),

  between: (table: string, field: string, start: string, end: string, orderBy?: string, order?: 'asc' | 'desc') =>
    post({ table, action: 'between', field, start, end, orderBy, order }),
}
