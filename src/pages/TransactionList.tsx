import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2, Search, CheckSquare, Square, Tags } from 'lucide-react'
import { api } from '../utils/api'
import type { Transaction, Account, Tag } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { formatCurrency, formatDate } from '../utils/format'
import { useSwipeToDelete } from '../hooks/useSwipeToDelete'
import { haptic } from '../utils/haptic'

function SwipeableRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const { style, onTouchStart, onTouchMove, onTouchEnd } = useSwipeToDelete(onDelete)
  return (
    <div style={style} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  )
}

export function TransactionList() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [search, setSearch] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterTag, setFilterTag] = useState('')

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkTagId, setBulkTagId] = useState('')
  const [bulkAccountId, setBulkAccountId] = useState('')

  const load = async () => {
    const [txs, accs, tgs] = await Promise.all([
      api.list('transactions', 'date', 'desc'),
      api.list('accounts'),
      api.list('tags'),
    ])
    setTransactions(txs)
    setAccounts(accs)
    setTags(tgs)
  }

  useEffect(() => { load() }, [])

  const remove = async (id: number) => {
    const tx = await api.get('transactions', id)
    if (tx?.transferId) {
      const all = await api.query('transactions', {transferId: tx.transferId})
      const pair = all.find(t => t.id !== id)
      if (pair) await api.remove('transactions', pair.id!)
    }
    await api.remove('transactions', id)
    haptic(15)
    await load()
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id!).filter(Boolean)))
    }
  }

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} transactions?`)) return
    for (const id of selectedIds) {
      await api.remove('transactions', id)
    }
    setSelectedIds(new Set())
    setSelectMode(false)
    haptic(15)
    await load()
  }

  const bulkEdit = async () => {
    const updates: Partial<Transaction> = {}
    if (bulkTagId) updates.tagIds = [Number(bulkTagId)]
    if (bulkAccountId) updates.accountId = Number(bulkAccountId)
    if (Object.keys(updates).length === 0) return
    for (const id of selectedIds) {
      const tx = await api.get('transactions', id)
      if (!tx) continue
      let newTags = tx.tagIds
      if (bulkTagId) newTags = tx.tagIds.includes(Number(bulkTagId))
        ? tx.tagIds : [...tx.tagIds, Number(bulkTagId)]
      await api.update('transactions', id, { ...updates, tagIds: newTags })
    }
    setBulkModal(false)
    setSelectedIds(new Set())
    setSelectMode(false)
    await load()
  }

  const filtered = transactions.filter(tx => {
    if (filterAccount && tx.accountId !== Number(filterAccount)) return false
    if (filterType && tx.type !== filterType) return false
    if (filterTag && !tx.tagIds.includes(Number(filterTag))) return false
    if (search) {
      const q = search.toLowerCase()
      const descMatch = tx.description.toLowerCase().includes(q)
      const accMatch = accounts.find(a => a.id === tx.accountId)?.name.toLowerCase().includes(q)
      if (!descMatch && !accMatch) return false
    }
    return true
  })

  const getAccountName = (id: number) => accounts.find(a => a.id === id)?.name ?? 'Unknown'
  const getTagNames = (ids: number[]) => ids.map(tid => tags.find(t => t.id === tid)?.name).filter(Boolean)

  const accountOptions = [
    { value: '', label: 'All Accounts' },
    ...accounts.map(a => ({ value: String(a.id), label: a.name })),
  ]

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
    { value: 'transfer', label: 'Transfer' },
  ]

  const tagOptions = [
    { value: '', label: 'All Tags' },
    ...tags.map(t => ({ value: String(t.id), label: t.name })),
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transactions</h1>
        <Button size="sm" onClick={() => navigate('/transactions/new')}>
          <Plus size={16} /> New
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <Select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} options={accountOptions} />
        <Select value={filterType} onChange={e => setFilterType(e.target.value)} options={typeOptions} />
        <Select value={filterTag} onChange={e => setFilterTag(e.target.value)} options={tagOptions} />
        <button
          onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()) }}
          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            selectMode
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          aria-label="Toggle batch select"
        >
          <CheckSquare size={16} />
        </button>
      </div>

      {selectMode && filtered.length > 0 && (
        <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            {selectedIds.size === filtered.length ? <CheckSquare size={16} className="text-purple-600" /> : <Square size={16} />}
            {selectedIds.size === filtered.length ? 'Deselect all' : `Select all (${filtered.length})`}
          </button>
          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 self-center">{selectedIds.size} selected</span>
              <Button size="sm" variant="secondary" onClick={() => setBulkModal(true)}>
                <Tags size={14} /> Edit
              </Button>
              <Button size="sm" variant="danger" onClick={bulkDelete}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description={search || filterAccount || filterType || filterTag ? 'Try adjusting your filters' : 'Add your first transaction'}
          action={
            <Button size="sm" onClick={() => navigate('/transactions/new')}>
              <Plus size={16} /> Add Transaction
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(tx => (
            <SwipeableRow key={tx.id} onDelete={() => remove(tx.id!)}>
              <Card className={`p-3 flex items-center justify-between ${selectMode ? 'cursor-pointer' : ''}`} onClick={() => selectMode && toggleSelect(tx.id!)}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {selectMode && (
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(tx.id!) }} className="shrink-0" aria-label="Select transaction">
                      {selectedIds.has(tx.id!) ? <CheckSquare size={18} className="text-purple-600" /> : <Square size={18} className="text-gray-400" />}
                    </button>
                  )}
                  <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' : tx.type === 'expense' ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description || 'No description'}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(tx.date)} · {getAccountName(tx.accountId)}
                      {tx.tagIds.length > 0 && <span> · {getTagNames(tx.tagIds).join(', ')}</span>}
                      {tx.type === 'transfer' && <span className="text-blue-500"> · Transfer</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <p className={`font-semibold whitespace-nowrap ${tx.amount >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-red-500'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </p>
                  {!selectMode && (
                    <button onClick={() => remove(tx.id!)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </Card>
            </SwipeableRow>
          ))}
        </div>
      )}

      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title={`Edit ${selectedIds.size} Transactions`}>
        <div className="space-y-4">
          <Select label="Add Tag" value={bulkTagId} onChange={e => setBulkTagId(e.target.value)} options={[{ value: '', label: 'No tag change' }, ...tags.map(t => ({ value: String(t.id), label: t.name }))]} />
          <Select label="Move to Account" value={bulkAccountId} onChange={e => setBulkAccountId(e.target.value)} options={[{ value: '', label: 'Keep current account' }, ...accounts.map(a => ({ value: String(a.id), label: a.name }))]} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={bulkEdit}>Apply</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setBulkModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
