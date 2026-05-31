import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Wallet, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../utils/api'
import type { Account } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { ColorPicker } from '../components/ui/ColorPicker'
import { EmptyState } from '../components/ui/EmptyState'
import { formatCurrency } from '../utils/format'

const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'wallets', label: 'Wallets' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
]

const TYPE_ORDER = ['savings', 'credit', 'wallets', 'cash', 'investment']
const TYPE_LABELS: Record<string, string> = {
  savings: 'Savings',
  credit: 'Credit Card',
  wallets: 'Wallets',
  cash: 'Cash',
  investment: 'Investment',
}

export function Accounts() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<Record<number, number>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState({ name: '', type: 'wallets' as Account['type'], color: '#3b82f6', icon: '', currency: 'USD', isActive: true })

  const load = async () => {
    const accs = await api.list('accounts', 'name')
    setAccounts(accs)
    const balMap: Record<number, number> = {}
    for (const a of accs) {
      const txs = await api.query('transactions', {accountId: a.id!})
      balMap[a.id!] = txs.reduce((s, t) => s + t.amount, 0)
    }
    setBalances(balMap)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setMessage('')
    setForm({ name: '', type: 'wallets', color: '#3b82f6', icon: '', currency: 'USD', isActive: true })
    setModalOpen(true)
  }

  const openEdit = (acc: Account) => {
    setEditing(acc)
    setMessage('')
    setForm({ name: acc.name, type: acc.type, color: acc.color, icon: acc.icon, currency: acc.currency, isActive: acc.isActive })
    setModalOpen(true)
  }

  const [message, setMessage] = useState('')

  const save = async () => {
    if (!form.name.trim()) return
    const all = await api.list('accounts')
    const dup = all.find(a => a.name.toLowerCase() === form.name.trim().toLowerCase())
    if (dup && (!editing || dup.id !== editing.id)) {
      setMessage(`Account "${form.name}" already exists`)
      setTimeout(() => setMessage(''), 3000)
      return
    }
    if (editing) {
      await api.update('accounts', editing.id!, form)
    } else {
      await api.create('accounts', form)
    }
    setMessage('')
    setModalOpen(false)
    await load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this account and all its transactions?')) return
    const txs = await api.query('transactions', {accountId: id})
    for (const tx of txs) {
      await api.remove('transactions', tx.id!)
    }
    await api.remove('accounts', id)
    await load()
  }

  const toggleType = (type: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const grouped = TYPE_ORDER
    .map(t => ({ type: t, label: TYPE_LABELS[t], accounts: accounts.filter(a => a.type === t) }))
    .filter(g => g.accounts.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Accounts</h1>
        <Button size="sm" onClick={openNew}><Plus size={16} /> New Account</Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet size={48} />}
          title="No accounts yet"
          description="Create your first account to start tracking"
          action={<Button size="sm" onClick={openNew}><Plus size={16} /> Create Account</Button>}
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(g => {
            const isExpanded = expanded.has(g.type)
            const total = g.accounts.reduce((s, a) => s + (balances[a.id!] ?? 0), 0)
            return (
              <div key={g.type}>
                <button
                  onClick={() => toggleType(g.type)}
                  className="flex items-center gap-2 w-full text-left mb-2"
                >
                  {isExpanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{g.label}</h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500">({g.accounts.length})</span>
                  <span className="ml-auto text-sm font-medium text-gray-600 dark:text-gray-400">
                    {formatCurrency(total)}
                  </span>
                </button>
                {isExpanded && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {g.accounts.map(acc => (
                      <Card key={acc.id} className="p-4" onClick={() => navigate(`/accounts/${acc.id}`)}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                              style={{ backgroundColor: acc.color }}
                            >
                              {acc.name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{acc.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={e => { e.stopPropagation(); openEdit(acc) }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500">
                              <Pencil size={16} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); remove(acc.id!) }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className={`text-xl font-bold ${(balances[acc.id!] ?? 0) >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                          {formatCurrency(balances[acc.id!] ?? 0)}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Account' : 'New Account'}>
        <div className="space-y-4">
          {message && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm">{message}</div>}
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Checking" />
          <Select label="Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Account['type'] })} options={ACCOUNT_TYPES} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Color</label>
            <ColorPicker value={form.color} onChange={c => setForm({ ...form, color: c })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={save}>{editing ? 'Update' : 'Create'}</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
