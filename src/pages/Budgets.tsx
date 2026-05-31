import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, PiggyBank, ChevronRight as ChevronRightIcon, ChevronDown } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { api } from '../utils/api'
import type { Budget, Tag } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { formatCurrency, currentMonth } from '../utils/format'

export function Budgets() {
  const [month, setMonth] = useState(currentMonth())
  const [tags, setTags] = useState<Tag[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [spending, setSpending] = useState<Record<number, number>>({})
  const [editAmount, setEditAmount] = useState<Record<number, string>>({})
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const parents = tags.filter(t => !t.parentId)
  const getChildren = (id: number) => tags.filter(t => t.parentId === id)

  const load = async () => {
    const tgs = await api.list('tags')
    setTags(tgs)

    const bgs = await api.query('budgets', {month})
    setBudgets(bgs)

    const spent: Record<number, number> = {}
    const [year, mon] = month.split('-').map(Number)
    const start = `${month}-01`
    const endDate = new Date(year, mon, 0)
    const end = `${month}-${String(endDate.getDate()).padStart(2, '0')}`

    const txs = await api.between('transactions', 'date', start, end)

    for (const tag of tgs) {
      spent[tag.id!] = txs
        .filter(t => t.type === 'expense' && t.tagIds.includes(tag.id!))
        .reduce((s, t) => s + Math.abs(t.amount), 0)
    }
    setSpending(spent)

    const amounts: Record<number, string> = {}
    for (const b of bgs) {
      amounts[b.tagId] = String(b.amount)
    }
    setEditAmount(amounts)
  }

  useEffect(() => { load() }, [month])

  const saveBudget = async (tagId: number) => {
    const amount = parseFloat(editAmount[tagId] || '0')
    if (amount <= 0) return
    const all = await api.query('budgets', {tagId, month})
    const existing = all[0]
    if (existing) {
      await api.update('budgets', existing.id!, { amount })
    } else {
      await api.create('budgets', { tagId, month, amount })
    }
    await load()
  }

  const prevMonth = () => setMonth(format(subMonths(new Date(month + '-01'), 1), 'yyyy-MM'))
  const nextMonth = () => setMonth(format(addMonths(new Date(month + '-01'), 1), 'yyyy-MM'))

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderBudget = (tag: Tag, depth: number = 0) => {
    const children = getChildren(tag.id!)
    const isExpanded = expanded.has(tag.id!)
    const budget = budgets.find(b => b.tagId === tag.id!)
    const spent = spending[tag.id!] ?? 0
    const limit = budget?.amount ?? 0
    const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
    const isOver = limit > 0 && spent > limit

    return (
      <div key={tag.id}>
        <Card className={`p-4 ${depth > 0 ? 'ml-6' : ''}`}>
          {children.length > 0 && (
            <button onClick={() => toggleExpand(tag.id!)} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-1 -ml-1 align-middle">
              {isExpanded ? <ChevronDown size={14} className="inline" /> : <ChevronRightIcon size={14} className="inline" />}
            </button>
          )}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className="font-medium text-gray-900 dark:text-gray-100">{tag.name}</span>
              {depth === 0 && children.length > 0 && (
                <span className="text-xs text-gray-400">({children.length})</span>
              )}
            </div>
            <span className={`text-sm font-semibold ${isOver ? 'text-red-500' : 'text-gray-600'}`}>
              {formatCurrency(spent)} {limit > 0 && `/ ${formatCurrency(limit)}`}
            </span>
          </div>

          {limit > 0 && (
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-purple-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Monthly limit"
              value={editAmount[tag.id!] ?? ''}
              onChange={e => setEditAmount(prev => ({ ...prev, [tag.id!]: e.target.value }))}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={() => saveBudget(tag.id!)}
              disabled={!editAmount[tag.id!] || parseFloat(editAmount[tag.id!] || '0') <= 0}
            >
              Set
            </Button>
          </div>
        </Card>
        {isExpanded && children.map(child => renderBudget(child, depth + 1))}
      </div>
    )
  }

  const monthLabel = format(new Date(month + '-01'), 'MMMM yyyy')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Budgets</h1>
      </div>

      <Card className="p-3">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft size={20} /></button>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronRight size={20} /></button>
        </div>
      </Card>

      {tags.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={48} />}
          title="No tags yet"
          description="Create tags first, then set budgets for each category"
        />
      ) : (
        <div className="space-y-3">
          {parents.map(p => renderBudget(p))}
        </div>
      )}
    </div>
  )
}
