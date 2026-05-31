interface Env {
  DB: D1Database
  SYNC_KEY_SALT?: string
}

interface ApiRequest {
  syncKey: string
  table: string
  action: 'list' | 'get' | 'create' | 'update' | 'delete' | 'query' | 'between' | 'count'
  id?: number
  data?: Record<string, unknown>
  filters?: Record<string, unknown>
  field?: string
  start?: string
  end?: string
  orderBy?: string
  order?: 'asc' | 'desc'
  limit?: number
}

const TABLE_MAP: Record<string, string> = {
  accounts: 'accounts',
  transactions: 'transactions',
  tags: 'tags',
  budgets: 'budgets',
  recurringTransactions: 'recurring_transactions',
  transactionSplits: 'transaction_splits',
  savingGoals: 'saving_goals',
  rules: 'rules',
  exchangeRates: 'exchange_rates',
}

function tableName(key: string): string {
  return TABLE_MAP[key] || key
}

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k.replace(/[A-Z]/g, m => '_' + m.toLowerCase())] = v
  }
  return result
}

function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k.replace(/_([a-z])/g, (_, l) => l.toUpperCase())] = v
  }
  return result
}

function convertRow(row: Record<string, unknown>): Record<string, unknown> {
  if (!row) return row
  const r = toCamelCase(row)
  if (typeof r.isActive === 'number') r.isActive = !!r.isActive
  if (typeof r.isReconciled === 'number') r.isReconciled = !!r.isReconciled
  if (typeof r.tagIds === 'string') {
    try { r.tagIds = JSON.parse(r.tagIds as string) } catch { r.tagIds = [] }
  }
  return r
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const body: ApiRequest = await request.json()
  const { syncKey, table, action } = body

  if (!syncKey || !table || !action) {
    return new Response(JSON.stringify({ error: 'Missing syncKey, table, or action' }), { status: 400 })
  }

  const tb = tableName(table)
  const db = env.DB

  try {
    switch (action) {
      case 'list': {
        let sql = `SELECT * FROM ${tb} WHERE sync_key = ?`
        const params: unknown[] = [syncKey]
        if (body.orderBy) {
          const col = body.orderBy.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
          sql += ` ORDER BY ${col} ${body.order === 'desc' ? 'DESC' : 'ASC'}`
        }
        if (body.limit) sql += ` LIMIT ?`
        if (body.limit) params.push(body.limit)
        const stmt = db.prepare(sql)
        const result = await stmt.bind(...params).all()
        return new Response(JSON.stringify(result.results.map(convertRow)), {
          headers: { 'content-type': 'application/json' },
        })
      }

      case 'get': {
        if (!body.id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })
        const stmt = db.prepare(`SELECT * FROM ${tb} WHERE id = ? AND sync_key = ?`)
        const result = await stmt.bind(body.id, syncKey).first()
        return new Response(JSON.stringify(convertRow(result as Record<string, unknown>)), {
          headers: { 'content-type': 'application/json' },
        })
      }

      case 'create': {
        if (!body.data) return new Response(JSON.stringify({ error: 'Missing data' }), { status: 400 })
        const data = { ...toSnakeCase(body.data), sync_key: syncKey }
        const cols = Object.keys(data).join(', ')
        const placeholders = Object.keys(data).map(() => '?').join(', ')
        const values = Object.values(data)
        const stmt = db.prepare(`INSERT INTO ${tb} (${cols}) VALUES (${placeholders})`)
        const result = await stmt.bind(...values).run()
        return new Response(JSON.stringify({ id: result.meta.last_row_id }), {
          headers: { 'content-type': 'application/json' },
        })
      }

      case 'update': {
        if (!body.id || !body.data) return new Response(JSON.stringify({ error: 'Missing id or data' }), { status: 400 })
        const data = toSnakeCase(body.data)
        data.updated_at = new Date().toISOString()
        const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ')
        const values = [...Object.values(data), body.id, syncKey]
        const stmt = db.prepare(`UPDATE ${tb} SET ${setClause} WHERE id = ? AND sync_key = ?`)
        await stmt.bind(...values).run()
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'content-type': 'application/json' },
        })
      }

      case 'delete': {
        if (!body.id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })
        const stmt = db.prepare(`DELETE FROM ${tb} WHERE id = ? AND sync_key = ?`)
        await stmt.bind(body.id, syncKey).run()
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'content-type': 'application/json' },
        })
      }

      case 'count': {
        const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tb} WHERE sync_key = ?`)
        const result = await stmt.bind(syncKey).first() as { count: number }
        return new Response(JSON.stringify({ count: result.count }), {
          headers: { 'content-type': 'application/json' },
        })
      }

      case 'query': {
        if (!body.filters || Object.keys(body.filters).length === 0) {
          return new Response(JSON.stringify({ error: 'Missing filters' }), { status: 400 })
        }
        const conditions = Object.entries(body.filters).map(([k]) => {
          const col = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
          return `${col} = ?`
        })
        const values = [...Object.values(body.filters), syncKey]
        let sql = `SELECT * FROM ${tb} WHERE ${conditions.join(' AND ')} AND sync_key = ?`
        if (body.orderBy) {
          const col = body.orderBy.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
          sql += ` ORDER BY ${col} ${body.order === 'desc' ? 'DESC' : 'ASC'}`
        }
        if (body.limit) sql += ` LIMIT ?`
        if (body.limit) values.push(body.limit)
        const stmt = db.prepare(sql)
        const result = await stmt.bind(...values).all()
        return new Response(JSON.stringify(result.results.map(convertRow)), {
          headers: { 'content-type': 'application/json' },
        })
      }

      case 'between': {
        if (!body.field || !body.start || !body.end) {
          return new Response(JSON.stringify({ error: 'Missing field, start, or end' }), { status: 400 })
        }
        const col = body.field.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
        let sql = `SELECT * FROM ${tb} WHERE sync_key = ? AND ${col} >= ? AND ${col} <= ?`
        const values: unknown[] = [syncKey, body.start, body.end]
        if (body.orderBy) {
          const ob = body.orderBy.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
          sql += ` ORDER BY ${ob} ${body.order === 'desc' ? 'DESC' : 'ASC'}`
        }
        const stmt = db.prepare(sql)
        const result = await stmt.bind(...values).all()
        return new Response(JSON.stringify(result.results.map(convertRow)), {
          headers: { 'content-type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
