import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, PiggyBank, TrendingUp } from 'lucide-react'
import { api } from '../utils/api'
import type { SavingGoal } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { ColorPicker } from '../components/ui/ColorPicker'
import { EmptyState } from '../components/ui/EmptyState'
import { formatCurrency } from '../utils/format'
import { format } from 'date-fns'

function formatDate(dateStr: string): string {
  return format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy')
}

export function GoalsPage() {
  const [goals, setGoals] = useState<SavingGoal[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SavingGoal | null>(null)
  const [form, setForm] = useState({ name: '', targetAmount: '', currentAmount: '0', deadline: '', color: '#3b82f6' })
  const [fundsOpen, setFundsOpen] = useState(false)
  const [fundsGoalId, setFundsGoalId] = useState<number | undefined>(undefined)
  const [fundsAmount, setFundsAmount] = useState('')

  const load = async () => {
    const data = await api.list('savingGoals')
    setGoals(data)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', targetAmount: '', currentAmount: '0', deadline: '', color: '#3b82f6' })
    setModalOpen(true)
  }

  const openEdit = (g: SavingGoal) => {
    setEditing(g)
    setForm({
      name: g.name,
      targetAmount: String(g.targetAmount),
      currentAmount: String(g.currentAmount),
      deadline: g.deadline ?? '',
      color: g.color,
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.targetAmount) return
    const target = parseFloat(form.targetAmount)
    const current = parseFloat(form.currentAmount) || 0
    if (editing) {
      await api.update('savingGoals', editing.id!, {
        name: form.name,
        targetAmount: target,
        currentAmount: current,
        deadline: form.deadline || undefined,
        color: form.color,
      })
    } else {
      await api.create('savingGoals', {
        name: form.name,
        targetAmount: target,
        currentAmount: current,
        deadline: form.deadline || undefined,
        color: form.color,
        icon: '',
        isActive: true,
      })
    }
    setModalOpen(false)
    await load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this saving goal?')) return
    await api.remove('savingGoals', id)
    await load()
  }

  const openFunds = (id: number) => {
    setFundsGoalId(id)
    setFundsAmount('')
    setFundsOpen(true)
  }

  const addFunds = async () => {
    if (!fundsGoalId || !fundsAmount) return
    const goal = goals.find(g => g.id === fundsGoalId)
    if (!goal) return
    const added = parseFloat(fundsAmount)
    if (isNaN(added) || added <= 0) return
    await api.update('savingGoals', fundsGoalId, {
      currentAmount: goal.currentAmount + added,
    })
    setFundsOpen(false)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Saving Goals</h1>
        <Button size="sm" onClick={openNew}><Plus size={16} /> New Goal</Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={48} />}
          title="No saving goals yet"
          description="Create goals to track your savings progress"
          action={<Button size="sm" onClick={openNew}><Plus size={16} /> Create Goal</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map(goal => {
            const displayPct = goal.targetAmount > 0
              ? (goal.currentAmount / goal.targetAmount) * 100
              : 0
            const isOver = goal.currentAmount > goal.targetAmount

            return (
              <Card key={goal.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: goal.color }} />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{goal.name}</h3>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(goal)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(goal.id!)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(goal.currentAmount)}
                  </span>
                  <span className="text-sm text-gray-400">
                    / {formatCurrency(goal.targetAmount)}
                  </span>
                </div>

                <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(displayPct, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${isOver ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                    {displayPct.toFixed(1)}%
                  </span>
                  {goal.deadline && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <TrendingUp size={12} />
                      Due {formatDate(goal.deadline)}
                    </span>
                  )}
                </div>

                <Button size="sm" variant="secondary" onClick={() => openFunds(goal.id!)} className="w-full">
                  <Plus size={14} /> Add Funds
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Goal' : 'New Goal'}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. New Laptop" />
          <Input label="Target Amount" type="number" step="0.01" min="0" inputMode="decimal" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} placeholder="0.00" />
          <Input label="Current Amount" type="number" step="0.01" min="0" inputMode="decimal" value={form.currentAmount} onChange={e => setForm({ ...form, currentAmount: e.target.value })} placeholder="0.00" />
          <Input label="Deadline (optional)" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
            <ColorPicker value={form.color} onChange={c => setForm({ ...form, color: c })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={save}>{editing ? 'Update' : 'Create'}</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={fundsOpen} onClose={() => setFundsOpen(false)} title="Add Funds">
        <div className="space-y-4">
          <Input
            label="Amount to add"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={fundsAmount}
            onChange={e => setFundsAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={addFunds}>Add</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setFundsOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
