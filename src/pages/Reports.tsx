import { useState, useEffect } from 'react'
import { BarChart3, PieChart, TrendingUp, LineChart, Target, AlertTriangle, CheckCircle } from 'lucide-react'
import { format, subMonths, addMonths } from 'date-fns'
import { api } from '../utils/api'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { formatCurrency, currentMonth } from '../utils/format'
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LineChart as RechartsLine, Line,
} from 'recharts'

export function Reports() {
  const month = currentMonth()
  const [tagSpending, setTagSpending] = useState<{ name: string; value: number; color: string }[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; income: number; expense: number }[]>([])
  const [netWorth, setNetWorth] = useState<{ month: string; value: number }[]>([])
  const [forecast, setForecast] = useState<{ month: string; value: number }[]>([])
  const [budgetVsActual, setBudgetVsActual] = useState<{ name: string; color: string; budget: number; actual: number }[]>([])
  const [insights, setInsights] = useState<{ label: string; value: string; icon: 'good' | 'bad' | 'neutral' }[]>([])

  useEffect(() => {
    (async () => {
      const accs = await api.list('accounts')
      const tgs = await api.list('tags')

      const [year, mon] = month.split('-').map(Number)
      const start = `${month}-01`
      const endDate = new Date(year, mon, 0)
      const end = `${month}-${String(endDate.getDate()).padStart(2, '0')}`

      const txs = await api.between('transactions', 'date', start, end)

      const expenseMap: Record<number, number> = {}
      for (const tag of tgs) { expenseMap[tag.id!] = 0 }
      for (const tx of txs) {
        if (tx.type === 'expense') {
          for (const tagId of tx.tagIds) {
            expenseMap[tagId] = (expenseMap[tagId] ?? 0) + Math.abs(tx.amount)
          }
        }
      }

      setTagSpending(
        Object.entries(expenseMap).filter(([, v]) => v > 0).map(([id, value]) => {
          const tag = tgs.find(t => t.id === Number(id))
          return { name: tag?.name ?? 'Unknown', value, color: tag?.color ?? '#6b7280' }
        }).sort((a, b) => b.value - a.value),
      )

      const trendData: { month: string; income: number; expense: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(month + '-01'), i)
        const m = format(d, 'yyyy-MM')
        const [y, mo] = m.split('-').map(Number)
        const s = `${m}-01`
        const ed = new Date(y, mo, 0)
        const e = `${m}-${String(ed.getDate()).padStart(2, '0')}`
        const tx = await api.between('transactions', 'date', s, e)
        trendData.push({
          month: format(d, 'MMM'),
          income: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expense: tx.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0),
        })
      }
      setMonthlyTrend(trendData)

      const nw: { month: string; value: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(new Date(month + '-01'), i)
        const m = format(d, 'yyyy-MM')
        const [y, mo] = m.split('-').map(Number)
        const s = `${m}-01`
        const ed = new Date(y, mo, 0)
        const e = `${m}-${String(ed.getDate()).padStart(2, '0')}`
        const allTx = await api.between('transactions', 'date', s, e)
        const total = allTx.reduce((sum, t) => sum + t.amount, 0)
        nw.push({ month: format(d, 'MMM yy'), value: (nw.length > 0 ? nw[nw.length - 1].value : 0) + total })
      }
      setNetWorth(nw)

      const allRecurring = await api.list('recurringTransactions')
      const recurring = allRecurring.filter(r => r.isActive)
      let accBalances: Record<number, number> = {}
      for (const a of accs) {
        const aTxs = await api.query('transactions', {accountId: a.id!})
        accBalances[a.id!] = aTxs.reduce((s, t) => s + t.amount, 0)
      }
      const totalBalance = Object.values(accBalances).reduce((s, b) => s + b, 0)

      const fcast: { month: string; value: number }[] = []
      let projected = totalBalance
      for (let i = 1; i <= 6; i++) {
        const d = addMonths(new Date(month + '-01'), i)
        let monthlyDelta = 0
        for (const r of recurring) {
          const nextD = r.nextDate || `${format(d, 'yyyy-MM')}-01`
          if (nextD <= `${format(d, 'yyyy-MM')}-31`) {
            monthlyDelta += r.amount
          }
        }
        projected += monthlyDelta
        fcast.push({ month: format(d, 'MMM yy'), value: projected })
      }
      setForecast(fcast)

      const bgs = await api.query('budgets', {month})
      if (bgs.length > 0) {
        setBudgetVsActual(
          bgs.map(b => {
            const tag = tgs.find(t => t.id === b.tagId)
            const actual = Object.entries(expenseMap)
              .filter(([id]) => Number(id) === b.tagId)
              .reduce((s, [, v]) => s + v, 0)
            return { name: tag?.name ?? 'Unknown', color: tag?.color ?? '#6b7280', budget: b.amount, actual }
          }).filter(b => b.budget > 0 || b.actual > 0),
        )
      }

      const totalInc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const totalExp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
      const topCat = Object.entries(expenseMap).sort(([, a], [, b]) => b - a)[0]
      const topTag = topCat ? tgs.find(t => t.id === Number(topCat[0])) : null
      const ins: { label: string; value: string; icon: 'good' | 'bad' | 'neutral' }[] = []
      const savings = totalInc - totalExp
      ins.push({
        label: 'Savings Rate',
        value: totalInc > 0 ? `${((savings / totalInc) * 100).toFixed(1)}%` : 'N/A',
        icon: savings >= 0 ? 'good' : 'bad',
      })
      if (topTag) {
        ins.push({
          label: 'Top Category',
          value: `${topTag.name} (${formatCurrency(Number(topCat![1]))})`,
          icon: 'neutral',
        })
      }
      const bgsOver = bgs.filter(b => (expenseMap[b.tagId] ?? 0) > b.amount)
      if (bgsOver.length > 0) {
        ins.push({
          label: 'Over Budget',
          value: `${bgsOver.length} categorie${bgsOver.length > 1 ? 's' : ''}`,
          icon: 'bad',
        })
      }
      setInsights(ins)
    })()
  }, [month])

  const hasData = tagSpending.length > 0 || monthlyTrend.some(m => m.income > 0 || m.expense > 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>

      {!hasData ? (
        <EmptyState
          icon={<BarChart3 size={48} />}
          title="Not enough data yet"
          description="Add some transactions to see your spending reports"
        />
      ) : (
        <>
          {insights.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {insights.map((ins, i) => (
                <Card key={i} className="p-3 text-center">
                  <div className="flex justify-center mb-1">
                    {ins.icon === 'good' ? <CheckCircle size={18} className="text-emerald-500" /> :
                     ins.icon === 'bad' ? <AlertTriangle size={18} className="text-rose-500" /> :
                     <TrendingUp size={18} className="text-purple-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{ins.label}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ins.value}</p>
                </Card>
              ))}
            </div>
          )}

          {budgetVsActual.length > 0 && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Target size={20} /> Budget vs Actual
              </h2>
              <div className="space-y-3">
                {budgetVsActual.map((item, i) => {
                  const pct = item.budget > 0 ? Math.min((item.actual / item.budget) * 100, 100) : 0
                  const over = item.budget > 0 && item.actual > item.budget
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                        </div>
                        <span className={`text-xs font-medium ${over ? 'text-red-500' : 'text-gray-500'}`}>
                          {formatCurrency(item.actual)} / {formatCurrency(item.budget)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      {over && <p className="text-xs text-red-500 mt-0.5">{formatCurrency(item.actual - item.budget)} over budget</p>}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {tagSpending.length > 0 && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <PieChart size={20} /> Spending by Category
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={250} className="max-w-xs">
                  <RechartsPie>
                    <Pie data={tagSpending} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                      label={(entry: { name?: string; percent?: number }) => `${entry.name ?? ''} ${((entry.percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {tagSpending.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="space-y-2 w-full sm:w-auto">
                  {tagSpending.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {monthlyTrend.length > 0 && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <TrendingUp size={20} /> Income vs Expenses (6 months)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrend}>
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={v => formatCurrency(v)} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {netWorth.length > 0 && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <LineChart size={20} /> Net Worth (12 months)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLine data={netWorth}>
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={v => formatCurrency(v)} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                  <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
                </RechartsLine>
              </ResponsiveContainer>
            </Card>
          )}

          {forecast.length > 0 && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <LineChart size={20} /> Cash Flow Forecast (6 months)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Projected balance based on recurring transactions</p>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLine data={forecast}>
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={v => formatCurrency(v)} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                  <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} strokeDasharray="5 5" />
                </RechartsLine>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
