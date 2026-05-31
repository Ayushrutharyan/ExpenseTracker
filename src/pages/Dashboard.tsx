import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowUpRight, ArrowDownLeft, TrendingUp, ArrowRightLeft, PiggyBank, Search, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { db } from '../db/db'
import type { Account, Transaction, Tag, Budget } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { formatCurrency, formatDate, currentMonth } from '../utils/format'
import { processRecurringTransactions } from '../hooks/useRecurringTransactions'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { haptic } from '../utils/haptic'
import { PageSkeleton } from '../components/ui/PageSkeleton'

export function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [balances, setBalances] = useState<Record<number, number>>({})
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyExpense, setMonthlyExpense] = useState(0)
  const [budgets, setBudgets] = useState<(Budget & { spent: number; tag: Tag | undefined })[]>([])
  const [spendingBreakdown, setSpendingBreakdown] = useState<{ name: string; color: string; amount: number; pct: number }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const month = currentMonth()

  const loadData = useCallback(async () => {
    await processRecurringTransactions()

    const allAccs = await db.accounts.toArray()
    const accs = allAccs.filter(a => a.isActive)
    setAccounts(accs)

    const allTxs = await db.transactions.orderBy('date').reverse().limit(30).toArray()
    setTransactions(allTxs)

    const tgs = await db.tags.toArray()
    setTags(tgs)

    const balMap: Record<number, number> = {}
    for (const a of accs) {
      const txs = await db.transactions.where('accountId').equals(a.id!).toArray()
      balMap[a.id!] = txs.reduce((s, t) => s + t.amount, 0)
    }
    setBalances(balMap)

    const [year, mon] = month.split('-').map(Number)
    const start = `${month}-01`
    const endDate = new Date(year, mon, 0)
    const end = `${month}-${String(endDate.getDate()).padStart(2, '0')}`

    const monthTxs = await db.transactions
      .where('date').between(start, end, true, true).toArray()
    const inc = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const exp = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
    setMonthlyIncome(inc)
    setMonthlyExpense(exp)

    const bgs = await db.budgets.where('month').equals(month).toArray()
    const budgetData = bgs.map(b => {
      const tag = tgs.find(t => t.id === b.tagId)
      const spent = monthTxs
        .filter(t => t.type === 'expense' && t.tagIds.includes(b.tagId))
        .reduce((s, t) => s + Math.abs(t.amount), 0)
      return { ...b, spent, tag }
    })
    setBudgets(budgetData)

    const tagSpendMap: Record<number, { name: string; color: string; amount: number }> = {}
    for (const tx of monthTxs) {
      if (tx.type !== 'expense') continue
      for (const tagId of tx.tagIds) {
        const tag = tgs.find(t => t.id === tagId)
        if (!tag) continue
        if (!tagSpendMap[tagId]) {
          tagSpendMap[tagId] = { name: tag.name, color: tag.color, amount: 0 }
        }
        tagSpendMap[tagId].amount += Math.abs(tx.amount)
      }
    }
    const totalTagSpend = Object.values(tagSpendMap).reduce((s, e) => s + e.amount, 0)
    const sorted = Object.values(tagSpendMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(e => ({ ...e, pct: totalTagSpend > 0 ? (e.amount / totalTagSpend) * 100 : 0 }))
    setSpendingBreakdown(sorted)
    setLoading(false)
  }, [month])

  useEffect(() => {
    loadData()
  }, [loadData])

  const { refreshing, pullDistance, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(loadData)

  if (loading) return <PageSkeleton />

  const totalBalance = Object.values(balances).reduce((s, b) => s + b, 0)
  const getTagName = (id: number) => tags.find(t => t.id === id)?.name ?? 'Unknown'

  const filteredTxns = transactions.filter(tx => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const descMatch = tx.description.toLowerCase().includes(q)
    const accMatch = accounts.find(a => a.id === tx.accountId)?.name.toLowerCase().includes(q)
    const tagMatch = tx.tagIds.some(tid => getTagName(tid).toLowerCase().includes(q))
    return descMatch || accMatch || tagMatch
  })

  return (
    <div
      className="space-y-6"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { haptic(5); navigate('/transfers/new') }} aria-label="New transfer">
            <ArrowRightLeft size={16} /> Transfer
          </Button>
          <Button size="sm" onClick={() => { haptic(5); navigate('/transactions/new') }} aria-label="Add transaction">
            <Plus size={16} /> Add
          </Button>
        </div>
      </div>

      {refreshing && (
        <div className="flex items-center justify-center py-2 text-sm text-purple-600 dark:text-purple-400 animate-fade-in">
          <RefreshCw size={16} className="mr-2 animate-spin" /> Refreshing...
        </div>
      )}
      {pullDistance > 0 && !refreshing && (
        <div className="flex items-center justify-center py-1 text-xs text-gray-400 dark:text-gray-500 transition-all" style={{ opacity: pullDistance / 80 }}>
          <RefreshCw size={12} className={`mr-1 ${pullDistance > 60 ? 'text-purple-500' : ''}`} />
          {pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative p-4 rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
          <p className="relative text-sm text-purple-100 mb-1">Total Balance</p>
          <p className="relative text-2xl font-bold text-white glow-purple">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="relative p-4 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
          <p className="relative text-sm text-cyan-100 mb-1">Monthly Income</p>
          <p className="relative text-2xl font-bold text-white">{formatCurrency(monthlyIncome)}</p>
        </div>
        <div className="relative p-4 rounded-xl overflow-hidden bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
          <p className="relative text-sm text-rose-100 mb-1">Monthly Expenses</p>
          <p className="relative text-2xl font-bold text-white">{formatCurrency(monthlyExpense)}</p>
        </div>
      </div>

      {spendingBreakdown.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Spending Breakdown</h2>
          </div>
          <div className="px-4 py-3 space-y-3">
            {spendingBreakdown.map(item => (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.amount)} ({item.pct.toFixed(0)}%)</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {budgets.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <PiggyBank size={14} /> Budget Progress
              </h2>
              <button onClick={() => navigate('/budgets')} className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium">
                Manage
              </button>
            </div>
          </div>
          <div className="px-4 py-3 space-y-4">
            {budgets.map(b => {
              const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
              const over = b.amount > 0 && b.spent > b.amount
              const remaining = b.amount - b.spent
              const statusColor = over ? 'text-red-500' : remaining < b.amount * 0.1 ? 'text-amber-500' : 'text-emerald-500'
              const barColor = over ? 'bg-red-500' : pct > 90 ? 'bg-amber-500' : pct > 50 ? 'bg-purple-500' : 'bg-emerald-500'
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {b.tag && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.tag.color }} />}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{b.tag?.name ?? 'Unknown'}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${statusColor}`}>
                        {over ? `${formatCurrency(-remaining)} over` : `${formatCurrency(remaining)} left`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {b.spent > 0 ? formatCurrency(b.spent) : '$0'} spent
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      of {formatCurrency(b.amount)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {accounts.length > 0 && (
        <Card className="divide-y divide-gray-100 dark:divide-gray-800">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Accounts</h2>
          </div>
          {['savings', 'credit', 'wallets', 'cash', 'investment'].map(type => {
            const group = accounts.filter(a => a.type === type)
            if (group.length === 0) return null
            const isExpanded = expandedTypes.has(type)
            const typeLabel = type === 'credit' ? 'Credit Card' : type.charAt(0).toUpperCase() + type.slice(1)
            const total = group.reduce((s, a) => s + (balances[a.id!] ?? 0), 0)
            return (
              <div key={type}>
                <button
                  onClick={() => setExpandedTypes(prev => {
                    const next = new Set(prev)
                    if (next.has(type)) next.delete(type)
                    else next.add(type)
                    return next
                  })}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{typeLabel}</span>
                  <span className="text-xs text-gray-400">({group.length})</span>
                  <span className="ml-auto text-xs font-medium text-gray-600 dark:text-gray-400">{formatCurrency(total)}</span>
                </button>
                {isExpanded && group.map(acc => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between px-4 py-3 pl-10 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                    onClick={() => navigate(`/accounts/${acc.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: acc.color }}>
                        {acc.name[0]}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{acc.name}</p>
                    </div>
                    <p className={`font-semibold ${(balances[acc.id!] ?? 0) >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}>
                      {formatCurrency(balances[acc.id!] ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            )
          })}
        </Card>
      )}

      <Card>
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Transactions</h2>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        {filteredTxns.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'No matching transactions' : 'No transactions yet'}
            description={searchQuery ? 'Try a different search term' : 'Add your first transaction to get started'}
            action={
              !searchQuery ? (
                <Button size="sm" onClick={() => navigate('/transactions/new')}>
                  <Plus size={16} /> Add Transaction
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredTxns.slice(0, 10).map(tx => {
              const acct = accounts.find(a => a.id === tx.accountId)
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' : tx.type === 'expense' ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                      {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description || 'No description'}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(tx.date)}
                        {acct && <span> · {acct.name}</span>}
                        {tx.tagIds.length > 0 && (
                          <span> · {tx.tagIds.map(id => getTagName(id)).join(', ')}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className={`font-semibold whitespace-nowrap ml-4 ${tx.amount >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-red-500'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {accounts.length === 0 && transactions.length === 0 && (
        <EmptyState
          icon={<TrendingUp size={48} />}
          title="Welcome to Expense Tracker!"
          description="Create an account and add your first transaction to see your dashboard"
          action={
            <div className="flex gap-3">
              <Button onClick={() => navigate('/accounts')}>Create Account</Button>
              <Button variant="secondary" onClick={() => navigate('/tags')}>Add Tags</Button>
            </div>
          }
        />
      )}
    </div>
  )
}
