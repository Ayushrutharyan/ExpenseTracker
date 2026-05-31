import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Calendar } from 'lucide-react'
import { api } from '../utils/api'
import type { Account, Tag, RecurringTransaction } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { EmptyState } from '../components/ui/EmptyState'
import { formatCurrency, formatDate, todayISO } from '../utils/format'
import { useRecurringTransactions, processRecurringTransactions } from '../hooks/useRecurringTransactions'

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export function RecurringPage() {
  const { items, loading, create, update, remove, reload } = useRecurringTransactions()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransaction | null>(null)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    accountId: '', amount: '', description: '', type: 'expense' as 'income' | 'expense',
    frequency: 'monthly' as RecurringTransaction['frequency'], interval: '1',
    nextDate: todayISO(), endDate: '', tagIds: [] as number[],
  })

  useEffect(() => {
    (async () => {
      const [accs, tgs] = await Promise.all([api.list('accounts'), api.list('tags')])
      setAccounts(accs.filter(a => a.isActive))
      setTags(tgs)
    })()
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ accountId: '', amount: '', description: '', type: 'expense', frequency: 'monthly', interval: '1', nextDate: todayISO(), endDate: '', tagIds: [] })
    setModalOpen(true)
  }

  const openEdit = (r: RecurringTransaction) => {
    setEditing(r)
    setForm({
      accountId: String(r.accountId), amount: String(Math.abs(r.amount)),
      description: r.description, type: r.type,
      frequency: r.frequency, interval: String(r.interval),
      nextDate: r.nextDate, endDate: r.endDate ?? '',
      tagIds: r.tagIds,
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.accountId || !form.amount) return
    const data = {
      accountId: Number(form.accountId),
      amount: form.type === 'expense' ? -Math.abs(parseFloat(form.amount)) : Math.abs(parseFloat(form.amount)),
      description: form.description,
      type: form.type,
      frequency: form.frequency,
      interval: parseInt(form.interval) || 1,
      nextDate: form.nextDate,
      endDate: form.endDate || undefined,
      tagIds: form.tagIds,
      isActive: true,
    }
    if (editing) {
      await update(editing.id!, data)
    } else {
      await create(data)
    }
    setModalOpen(false)
  }

  const processNow = async () => {
    const n = await processRecurringTransactions()
    setMessage(`Created ${n} transaction(s)`)
    await reload()
    setTimeout(() => setMessage(''), 3000)
  }

  const accountOptions = accounts.map(a => ({ value: String(a.id), label: a.name }))
  const typeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
  ]
  const intervalOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1), label: `Every ${i + 1}`,
  }))

  const toggleTag = (id: number) => {
    setForm(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(id) ? prev.tagIds.filter(t => t !== id) : [...prev.tagIds, id],
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recurring</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={processNow}>
            <RefreshCw size={16} /> Process Now
          </Button>
          <Button size="sm" onClick={openNew}><Plus size={16} /> New</Button>
        </div>
      </div>

      {message && (
        <div className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-lg text-sm">
          {message}
        </div>
      )}

      {loading ? null : items.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title="No recurring transactions"
          description="Add subscriptions, rent, or any regular payments and they'll auto-create on schedule"
          action={<Button size="sm" onClick={openNew}><Plus size={16} /> Add Recurring</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(r => {
            const acc = accounts.find(a => a.id === r.accountId)
            const isOverdue = r.nextDate <= todayISO()
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${r.type === 'income' ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                      <RefreshCw size={14} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{r.description || 'No description'}</p>
                      <p className="text-xs text-gray-400">{acc?.name ?? 'Unknown'} · {r.frequency}{r.interval > 1 ? ` ×${r.interval}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => { if (confirm('Delete this recurring transaction?')) remove(r.id!) }} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`font-semibold ${r.type === 'income' ? 'text-cyan-600 dark:text-cyan-400' : 'text-red-500'}`}>
                    {r.type === 'income' ? '+' : ''}{formatCurrency(Math.abs(r.amount))}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar size={12} />
                    <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                      Next: {formatDate(r.nextDate)}
                    </span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Recurring' : 'New Recurring'}>
        <div className="space-y-4">
          <Select label="Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'income' | 'expense' })} options={typeOptions} />
          <Input label="Amount" type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          <Select label="Account" value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} options={accountOptions} />
          <Input label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Netflix" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Frequency" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as RecurringTransaction['frequency'] })} options={FREQUENCY_OPTIONS} />
            <Select label="Interval" value={form.interval} onChange={e => setForm({ ...form, interval: e.target.value })} options={intervalOptions} />
          </div>
          <Input label="Next Date" type="date" value={form.nextDate} onChange={e => setForm({ ...form, nextDate: e.target.value })} />
          <Input label="End Date (optional)" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />

          {tags.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id!)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      form.tagIds.includes(tag.id!)
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    style={form.tagIds.includes(tag.id!) ? { backgroundColor: tag.color } : {}}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={save}>{editing ? 'Update' : 'Create'}</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
