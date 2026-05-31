import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react'
import { db } from '../db/db'
import type { Account, Transaction, Tag } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
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

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [balance, setBalance] = useState(0)

  const load = async () => {
    if (!id) return
    const acc = await db.accounts.get(Number(id))
    setAccount(acc ?? null)
    const tgs = await db.tags.toArray()
    setTags(tgs)
    if (acc) {
      const txs = await db.transactions
        .where('accountId').equals(acc.id!)
        .reverse().sortBy('date')
      setTransactions(txs)
      setBalance(txs.reduce((s, t) => s + t.amount, 0))
    }
  }

  useEffect(() => { load() }, [id])

  const removeTx = async (txId: number) => {
    const tx = await db.transactions.get(txId)
    if (tx?.transferId) {
      const pair = await db.transactions
        .where('transferId').equals(tx.transferId)
        .and(t => t.id !== txId)
        .first()
      if (pair) await db.transactions.delete(pair.id!)
    }
    await db.transactions.delete(txId)
    haptic(15)
    await load()
  }

  if (!account) return null

  const getTagNames = (ids: number[]) => ids.map(tid => tags.find(t => t.id === tid)?.name).filter(Boolean)

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/accounts')}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft size={16} /> Accounts
      </button>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: account.color }}>
              {account.name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{account.name}</h1>
              <p className="text-sm text-gray-400 capitalize">{account.type}</p>
            </div>
          </div>
        </div>
        <p className={`text-3xl font-bold mt-4 ${balance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}>
          {formatCurrency(balance)}
        </p>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Transactions</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate('/transfers/new')}>Transfer</Button>
          <Button size="sm" onClick={() => navigate(`/transactions/new?account=${account.id}`)}>
            + Add
          </Button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <EmptyState title="No transactions" description="Add your first transaction to this account" />
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => (
            <SwipeableRow key={tx.id} onDelete={() => removeTx(tx.id!)}>
              <Card className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' : tx.type === 'expense' ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description || 'No description'}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(tx.date)}
                      {tx.tagIds.length > 0 && <span> · {getTagNames(tx.tagIds).join(', ')}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <p className={`font-semibold whitespace-nowrap ${tx.amount >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-red-500'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </p>
                  <button onClick={() => removeTx(tx.id!)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            </SwipeableRow>
          ))}
        </div>
      )}
    </div>
  )
}
