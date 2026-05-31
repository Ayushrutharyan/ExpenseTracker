import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { db } from '../db/db'
import type { Account } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { todayISO } from '../utils/format'

export function Transfers() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])

  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [fromAccount, setFromAccount] = useState('')
  const [toAccount, setToAccount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const allAccs = await db.accounts.toArray()
      const accs = allAccs.filter(a => a.isActive)
      setAccounts(accs)
      if (accs.length >= 2) {
        setFromAccount(String(accs[0].id))
        setToAccount(String(accs[1].id))
      } else if (accs.length === 1) {
        setFromAccount(String(accs[0].id))
      }
    })()
  }, [])

  const save = async () => {
    const numericAmount = parseFloat(amount)
    if (!fromAccount || !toAccount || !numericAmount || fromAccount === toAccount) return

    setSaving(true)
    const now = new Date()
    const transferId = Date.now()

    await db.transactions.add({
      date, amount: -numericAmount, description: description || 'Transfer',
      type: 'transfer', accountId: Number(fromAccount), tagIds: [],
      notes: '', transferId, isReconciled: false, createdAt: now, updatedAt: now,
    })

    await db.transactions.add({
      date, amount: numericAmount, description: description || 'Transfer',
      type: 'transfer', accountId: Number(toAccount), tagIds: [],
      notes: '', transferId, isReconciled: false, createdAt: now, updatedAt: now,
    })

    setSaving(false)
    navigate(-1)
  }

  const accountOptions = accounts.map(a => ({ value: String(a.id), label: a.name }))

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Transfer</h1>

      <Card className="p-4 space-y-4">
        <Input label="Amount" type="number" step="0.01" min="0" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />

        <Select label="From Account" value={fromAccount} onChange={e => setFromAccount(e.target.value)} options={accountOptions.filter(o => o.value !== toAccount)} />
        <Select label="To Account" value={toAccount} onChange={e => setToAccount(e.target.value)} options={accountOptions.filter(o => o.value !== fromAccount)} />

        <Input label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Transfer" />

        <div className="flex gap-3 pt-2">
          <Button className="flex-1" onClick={save} disabled={saving || !fromAccount || !toAccount || fromAccount === toAccount || !amount}>
            <ArrowRight size={16} /> Transfer
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}
