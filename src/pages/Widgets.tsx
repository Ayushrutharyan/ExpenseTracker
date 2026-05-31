import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ArrowDownLeft, PiggyBank, RefreshCw } from 'lucide-react'
import { api } from '../utils/api'
import type { Account, Transaction, Tag, Budget } from '../types'
import { formatCurrency, currentMonth } from '../utils/format'
import { processRecurringTransactions } from '../hooks/useRecurringTransactions'
import { haptic } from '../utils/haptic'

export function Widgets() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [balances, setBalances] = useState<Record<number, number>>({})
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyExpense, setMonthlyExpense] = useState(0)
  const [budgets, setBudgets] = useState<(Budget & { spent: number; tag: Tag | undefined })[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const month = currentMonth()

  const loadData = async () => {
    setRefreshing(true)
    await processRecurringTransactions()
    const allAccs = await api.list('accounts')
    const accs = allAccs.filter(a => a.isActive)
    setAccounts(accs)
    const allTxs = await api.list('transactions', 'date', 'desc', 10)
    setTransactions(allTxs)
    const tgs = await api.list('tags')
    setTags(tgs)
    const balMap: Record<number, number> = {}
    for (const a of accs) {
      const txs = await api.query('transactions', {accountId: a.id!})
      balMap[a.id!] = txs.reduce((s, t) => s + t.amount, 0)
    }
    setBalances(balMap)
    const [year, mon] = month.split('-').map(Number)
    const start = `${month}-01`
    const endDate = new Date(year, mon, 0)
    const end = `${month}-${String(endDate.getDate()).padStart(2, '0')}`
    const monthTxs = await api.between('transactions', 'date', start, end)
    setMonthlyIncome(monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
    setMonthlyExpense(monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0))
    const bgs = await api.query('budgets', {month})
    setBudgets(bgs.map(b => {
      const tag = tgs.find(t => t.id === b.tagId)
      const spent = monthTxs
        .filter(t => t.type === 'expense' && t.tagIds.includes(b.tagId))
        .reduce((s, t) => s + Math.abs(t.amount), 0)
      return { ...b, spent, tag }
    }))
    setRefreshing(false)
  }

  useEffect(() => { loadData() }, [])

  const totalBalance = Object.values(balances).reduce((s, b) => s + b, 0)
  const getTagName = (id: number) => tags.find(t => t.id === id)?.name ?? ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Widgets</h1>
        <button
          onClick={() => { haptic(5); loadData() }}
          className="text-purple-600 dark:text-purple-400 p-1"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/20">
          <p className="text-xs text-purple-100/80 mb-0.5">Balance</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/20">
          <p className="text-xs text-rose-100/80 mb-0.5">Expenses</p>
          <p className="text-xl font-bold text-white">{formatCurrency(monthlyExpense)}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/20">
          <p className="text-xs text-cyan-100/80 mb-0.5">Income</p>
          <p className="text-xl font-bold text-white">{formatCurrency(monthlyIncome)}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
          <p className="text-xs text-amber-100/80 mb-0.5">Net</p>
          <p className="text-xl font-bold text-white">{formatCurrency(monthlyIncome - monthlyExpense)}</p>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl rounded-xl border border-gray-200/60 dark:border-purple-500/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <PiggyBank size={12} /> Budgets
            </h2>
            <button onClick={() => navigate('/budgets')} className="text-xs text-purple-600 dark:text-purple-400 font-medium">All</button>
          </div>
          <div className="space-y-2">
            {budgets.slice(0, 4).map(b => {
              const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
              const over = b.spent > b.amount
              const remaining = b.amount - b.spent
              const barColor = over ? 'bg-red-500' : pct > 90 ? 'bg-amber-500' : 'bg-emerald-500'
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 truncate">{b.tag?.name ?? 'Budget'}</span>
                    <span className={`font-medium ${over ? 'text-red-500' : 'text-gray-500'}`}>
                      {over ? `${formatCurrency(-remaining)}` : formatCurrency(remaining)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-0.5">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl rounded-xl border border-gray-200/60 dark:border-purple-500/10 divide-y divide-gray-100 dark:divide-gray-800">
          <div className="px-3 py-2">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent</h2>
          </div>
          {transactions.map(tx => {
            const acc = accounts.find(a => a.id === tx.accountId)
            const tagName = getTagName(tx.tagIds[0])
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                onClick={() => { haptic(3); navigate(`/transactions/${tx.id}/edit`) }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {tx.type === 'income'
                    ? <ArrowUpRight size={14} className="text-cyan-500 shrink-0" />
                    : <ArrowDownLeft size={14} className="text-rose-500 shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-400 truncate">{tagName && `${tagName} · `}{acc?.name ?? ''}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold shrink-0 ml-2 ${tx.amount >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 pb-2">
        Add to home screen for quick access
      </p>
    </div>
  )
}
