import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Split } from 'lucide-react'
import { db } from '../db/db'
import type { Account, Tag, Transaction, TransactionSplit } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { todayISO } from '../utils/format'
import { applyRules } from '../hooks/useRules'
import { haptic } from '../utils/haptic'

export function TransactionForm() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const prefillAccount = searchParams.get('account')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [accountId, setAccountId] = useState(prefillAccount || '')
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [splitMode, setSplitMode] = useState(false)
  const [splits, setSplits] = useState<{ tagId: number; amount: string }[]>([])

  useEffect(() => {
    (async () => {
      const allAccs = await db.accounts.toArray()
      const accs = allAccs.filter(a => a.isActive)
      setAccounts(accs)
      if (!prefillAccount && accs.length > 0 && !accountId) setAccountId(String(accs[0].id))

      const tgs = await db.tags.toArray()
      setTags(tgs)

      if (id) {
        const tx = await db.transactions.get(Number(id))
        if (tx) {
          setDate(tx.date)
          setAmount(String(Math.abs(tx.amount)))
          setType(tx.type === 'transfer' ? 'expense' : tx.type)
          setDescription(tx.description)
          setNotes(tx.notes || '')
          setAccountId(String(tx.accountId))
          setSelectedTags(tx.tagIds)

          const splitRows = await db.transactionSplits.where('transactionId').equals(tx.id!).toArray()
          if (splitRows.length > 0) {
            setSplitMode(true)
            setSplits(splitRows.map(s => ({ tagId: s.tagId, amount: String(s.amount) })))
          }
        }
      }
    })()
  }, [id, prefillAccount, accountId])

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId],
    )
  }

  const parentTags = tags.filter(t => !t.parentId)
  const getChildren = (id: number) => tags.filter(t => t.parentId === id)

  const toggleSplitMode = () => {
    if (!splitMode) {
      setSplits(selectedTags.map(tId => ({ tagId: tId, amount: '' })))
    }
    setSplitMode(!splitMode)
  }

  const updateSplitAmount = (tagId: number, val: string) => {
    setSplits(prev => prev.map(s => s.tagId === tagId ? { ...s, amount: val } : s))
  }

  const save = async () => {
    const numericAmount = parseFloat(amount)
    if (!accountId || !numericAmount) return

    haptic(10)

    const signAmount = type === 'expense' ? -numericAmount : numericAmount
    const now = new Date()

    let tagIds = selectedTags
    if (splitMode && splits.length > 0) {
      tagIds = splits.filter(s => parseFloat(s.amount) > 0).map(s => s.tagId)
    }
    if (!isEdit && tagIds.length === 0) {
      tagIds = await applyRules(description, Number(accountId))
    }

    if (isEdit) {
      await db.transactions.update(Number(id), {
        date, amount: signAmount, description, notes, type,
        accountId: Number(accountId), tagIds,
        updatedAt: now,
      })
      await db.transactionSplits.where('transactionId').equals(Number(id)).delete()
    } else {
      const txId = await db.transactions.add({
        date, amount: signAmount, description, notes, type,
        accountId: Number(accountId), tagIds,
        isReconciled: false, createdAt: now, updatedAt: now,
      } as Transaction)

      if (splitMode && splits.some(s => parseFloat(s.amount) > 0)) {
        for (const s of splits) {
          const amt = parseFloat(s.amount) || 0
          if (amt > 0) {
            await db.transactionSplits.add({
              transactionId: txId as number, tagId: s.tagId, amount: amt,
            } as TransactionSplit)
          }
        }
      }
    }
    navigate(-1)
  }

  const accountOptions = accounts.map(a => ({ value: String(a.id), label: a.name }))
  const typeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer...' },
  ]

  const splitSum = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0)
  const splitValid = !splitMode || splits.length === 0 || Math.abs(splitSum - (parseFloat(amount) || 0)) < 0.01

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {isEdit ? 'Edit Transaction' : 'New Transaction'}
      </h1>

      <Card className="p-4 space-y-4">
        <Select
          label="Type"
          value={type}
          onChange={e => {
            const val = e.target.value
            if (val === 'transfer') {
              navigate(`/transfers/new${accountId ? `?from=${accountId}` : ''}`)
              return
            }
            setType(val as 'income' | 'expense')
          }}
          options={typeOptions}
        />
        <Input label="Amount" type="number" step="0.01" min="0" inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value); haptic(5) }} placeholder="0.00" />
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Select label="Account" value={accountId} onChange={e => setAccountId(e.target.value)} options={accountOptions} />
        <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this for?" />
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes or receipt info" />

        {tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
              <button
                type="button"
                onClick={toggleSplitMode}
                className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  splitMode
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Split size={12} /> Split
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {parentTags.map(pt => {
                const children = getChildren(pt.id!)
                return (
                  <div key={pt.id} className="w-full">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium px-1">{pt.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleTag(pt.id!)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedTags.includes(pt.id!)
                            ? 'text-white'
                            : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        style={selectedTags.includes(pt.id!) ? { backgroundColor: pt.color } : {}}
                      >
                        {pt.name}
                      </button>
                    </div>
                    {children.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 ml-2">
                        {children.map(child => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => toggleTag(child.id!)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              selectedTags.includes(child.id!)
                                ? 'text-white'
                                : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                            style={selectedTags.includes(child.id!) ? { backgroundColor: child.color } : {}}
                          >
                            {child.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {splitMode && splits.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Split amounts per tag {amount && <span>(total: ${parseFloat(amount || '0').toFixed(2)})</span>}
                </p>
                {splits.map(s => {
                  const tag = tags.find(t => t.id === s.tagId)
                  return (
                    <div key={s.tagId} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag?.color }} />
                      <span className="text-sm text-gray-700 dark:text-gray-300 min-w-0 flex-1 truncate">{tag?.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={s.amount}
                        onChange={e => updateSplitAmount(s.tagId, e.target.value)}
                        className="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0.00"
                      />
                    </div>
                  )
                })}
                {!splitValid && (
                  <p className="text-xs text-red-500">Split total (${splitSum.toFixed(2)}) must match amount</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button className="flex-1" onClick={save} disabled={!splitValid}>
            {isEdit ? 'Update' : 'Add Transaction'}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}
