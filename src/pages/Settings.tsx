import { useState, useEffect } from 'react'
import {
  Download, Upload, Trash2, Settings as SettingsIcon, Moon, Sun,
  FileText, Bell, DollarSign,
} from 'lucide-react'
import { db } from '../db/db'
import type { ExchangeRate } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useDarkMode } from '../hooks/useDarkMode'
import { haptic } from '../utils/haptic'
import { share } from '../utils/share'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'INR', 'BRL', 'MXN', 'SGD', 'NZD']

export function Settings() {
  const { isDark, toggle: toggleDark } = useDarkMode()
  const [importModal, setImportModal] = useState(false)
  const [csvModal, setCsvModal] = useState(false)
  const [importData, setImportData] = useState('')
  const [csvData, setCsvData] = useState('')
  const [csvAccounts, setCsvAccounts] = useState<{ id: number; name: string }[]>([])
  const [csvAccountId, setCsvAccountId] = useState('')
  const [csvDelimiter, setCsvDelimiter] = useState(',')
  const [message, setMessage] = useState('')

  const [defaultCurrency, setDefaultCurrency] = useState(() => localStorage.getItem('defaultCurrency') || 'INR')
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [rateModal, setRateModal] = useState(false)
  const [rateForm, setRateForm] = useState({ fromCurrency: 'USD', toCurrency: 'EUR', rate: '' })

  const [notifPerm, setNotifPerm] = useState(() => typeof Notification !== 'undefined' ? Notification.permission : 'denied')

  useEffect(() => {
    localStorage.setItem('defaultCurrency', defaultCurrency)
  }, [defaultCurrency])

  useEffect(() => {
    (async () => {
      const r = await db.exchangeRates.toArray()
      setRates(r)
    })()
  }, [])

  const loadAccounts = async () => {
    const accs = await db.accounts.toArray()
    setCsvAccounts(accs.map(a => ({ id: a.id!, name: a.name })))
    if (accs.length > 0) setCsvAccountId(String(accs[0].id))
  }

  const exportData = async () => {
    const accounts = await db.accounts.toArray()
    const transactions = await db.transactions.toArray()
    const tags = await db.tags.toArray()
    const budgets = await db.budgets.toArray()
    const recurringTransactions = await db.recurringTransactions.toArray()
    const savingGoals = await db.savingGoals.toArray()
    const rules = await db.rules.toArray()
    const data = JSON.stringify({ accounts, transactions, tags, budgets, recurringTransactions, savingGoals, rules }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expense-tracker-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async () => {
    try {
      const data = JSON.parse(importData)
      if (data.accounts) for (const a of data.accounts) await db.accounts.put(a)
      if (data.transactions) for (const t of data.transactions) await db.transactions.put(t)
      if (data.tags) for (const t of data.tags) await db.tags.put(t)
      if (data.budgets) for (const b of data.budgets) await db.budgets.put(b)
      if (data.recurringTransactions) for (const r of data.recurringTransactions) { const { id, ...rest } = r; await db.recurringTransactions.add(rest) }
      if (data.savingGoals) for (const g of data.savingGoals) { const { id, ...rest } = g; await db.savingGoals.add(rest) }
      if (data.rules) for (const r of data.rules) { const { id, ...rest } = r; await db.rules.add(rest) }
      setMessage('Data imported successfully!')
      setImportModal(false)
    } catch {
      setMessage('Invalid JSON file')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const parseCSV = (text: string, delimiter: string): string[][] => {
    return text.trim().split('\n').map(line => {
      const row: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i++
            continue
          }
          inQuotes = !inQuotes
          continue
        }
        if (ch === delimiter && !inQuotes) { row.push(current.trim()); current = ''; continue }
        current += ch
      }
      row.push(current.trim())
      return row
    })
  }

  const doCsvImport = async () => {
    if (!csvAccountId) return
    const rows = parseCSV(csvData, csvDelimiter)
    if (rows.length < 2) { setMessage('CSV must have a header + data rows'); setTimeout(() => setMessage(''), 3000); return }
    const header = rows[0].map(h => h.replace(/^\uFEFF/, '').toLowerCase())
    const dateIdx = header.findIndex(h => /date/i.test(h))
    const descIdx = header.findIndex(h => /desc|memo|payee|name|note/i.test(h))
    const amountIdx = header.findIndex(h => /amount|value|sum/i.test(h))
    const debitIdx = header.findIndex(h => /debit|withdrawal|out/i.test(h))
    const creditIdx = header.findIndex(h => /credit|deposit|in/i.test(h))
    if (dateIdx === -1 || (amountIdx === -1 && (debitIdx === -1 || creditIdx === -1))) {
      setMessage('Could not detect columns. Need Date + Amount columns.')
      setTimeout(() => setMessage(''), 3000); return
    }
    let created = 0; const now = new Date()
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row.length < 2 || row.every(c => !c)) continue
      let date = dateIdx < row.length ? row[dateIdx]?.trim() : ''
      date = date.replace(/^\uFEFF/, '')
      const parts = date.split(/[/-]/)
      if (parts.length === 3) {
        const y = parts[2].length === 4 ? parts[2] : (parts[0].length === 4 ? parts[0] : '')
        let m = '', d = ''
        if (y === parts[2]) { let a = parseInt(parts[0]), b = parseInt(parts[1]); if (a > 12) { d = parts[0]; m = parts[1] } else if (b > 12) { d = parts[1]; m = parts[0] } else { m = parts[0]; d = parts[1] } }
        else if (y === parts[0]) { m = parts[1]; d = parts[2] }
        if (y) date = `${y}-${String(parseInt(m)).padStart(2, '0')}-${String(parseInt(d)).padStart(2, '0')}`
      } else if (/^\d{8}$/.test(date)) { date = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}` }
      let amount = 0
      if (amountIdx >= 0 && amountIdx < row.length) { amount = parseFloat(row[amountIdx]?.replace(/[^0-9.-]/g, '') || '0') }
      else { const debit = debitIdx >= 0 ? parseFloat(row[debitIdx]?.replace(/[^0-9.-]/g, '') || '0') : 0; const credit = creditIdx >= 0 ? parseFloat(row[creditIdx]?.replace(/[^0-9.-]/g, '') || '0') : 0; amount = credit - debit }
      if (!date || !amount) continue
      const description = descIdx >= 0 && descIdx < row.length ? row[descIdx] : ''
      await db.transactions.add({ accountId: Number(csvAccountId), date, amount, description, type: amount >= 0 ? 'income' as const : 'expense' as const, tagIds: [], notes: '', isReconciled: false, createdAt: now, updatedAt: now })
      created++
    }
    setMessage(`Imported ${created} transactions from CSV`); setCsvModal(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const clearAll = async () => {
    if (!confirm('This will delete ALL your data. Are you sure?')) return
    if (!confirm('Really? This cannot be undone!')) return
    await db.accounts.clear(); await db.transactions.clear(); await db.tags.clear(); await db.budgets.clear()
    await db.recurringTransactions.clear(); await db.savingGoals.clear(); await db.rules.clear()
    setMessage('All data cleared'); setTimeout(() => setMessage(''), 3000)
  }

  const generatePDF = async () => {
    const txs = await db.transactions.orderBy('date').reverse().limit(50).toArray()
    const accs = await db.accounts.toArray()
    const tgs = await db.tags.toArray()
    const rows = txs.map(tx => {
      const a = accs.find(a => a.id === tx.accountId)
      const tagNames = tx.tagIds.map(id => tgs.find(t => t.id === id)?.name).filter(Boolean).join(', ')
      return `<tr><td>${tx.date}</td><td>${tx.description}</td><td>${a?.name ?? ''}</td><td>${tagNames}</td><td style="text-align:right;color:${tx.amount >= 0 ? '#059669' : '#ef4444'}">${tx.amount >= 0 ? '+' : ''}$${Math.abs(tx.amount).toFixed(2)}</td></tr>`
    }).join('')
    const html = `<html><head><style>body{font-family:sans-serif;padding:24px}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px 12px;border:1px solid #e5e7eb;text-align:left;font-size:13px}th{background:#f9fafb;font-weight:600}</style></head><body><h1>Expense Report</h1><p>Generated ${new Date().toLocaleDateString()}</p><table><thead><tr><th>Date</th><th>Description</th><th>Account</th><th>Tags</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    const w = window.open('', '_blank')
    w?.document.write(html)
    w?.document.close()
    w?.focus()
    setTimeout(() => w?.print(), 500)
  }

  const requestNotification = async () => {
    if (typeof Notification === 'undefined') return
    if (notifPerm === 'granted') {
      const upcoming = await db.recurringTransactions.toArray()
      const near = upcoming.filter(r => r.isActive).filter(r => {
        const days = (new Date(r.nextDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        return days >= 0 && days <= 3
      })
      if (near.length > 0) {
        new Notification('Upcoming Payments', { body: near.map(r => `${r.description}: ${r.type === 'expense' ? '-' : '+'}$${Math.abs(r.amount).toFixed(2)} on ${r.nextDate}`).join('\n') })
      } else {
        new Notification('No upcoming payments', { body: 'No recurring transactions due in the next 3 days.' })
      }
      return
    }
    const result = await Notification.requestPermission()
    setNotifPerm(result)
    if (result === 'granted') {
      new Notification('Notifications enabled', { body: 'You\'ll get reminders for upcoming recurring payments.' })
      haptic(20)
    }
  }

  const saveRate = async () => {
    if (!rateForm.rate) return
    await db.exchangeRates.add({
      fromCurrency: rateForm.fromCurrency,
      toCurrency: rateForm.toCurrency,
      rate: parseFloat(rateForm.rate),
      date: new Date().toISOString().slice(0, 10),
    } as ExchangeRate)
    setRateForm({ fromCurrency: 'USD', toCurrency: 'EUR', rate: '' })
    setRateModal(false)
    const r = await db.exchangeRates.toArray()
    setRates(r)
  }

  const deleteRate = async (id: number) => {
    await db.exchangeRates.delete(id)
    const r = await db.exchangeRates.toArray()
    setRates(r)
  }

  const openCsv = () => { loadAccounts(); setCsvData(''); setCsvModal(true) }
  const accountOptions = csvAccounts.map(a => ({ value: String(a.id), label: a.name }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      {message && (
        <div className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-lg text-sm">{message}</div>
      )}

      <Card className="divide-y divide-gray-100 dark:divide-gray-800">
        <div className="p-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Appearance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Toggle dark mode</p>
          <Button size="sm" variant="secondary" onClick={toggleDark}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />} {isDark ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>

        <div className="p-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1">
            <DollarSign size={16} /> Default Currency
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Used for displaying all amounts</p>
          <div className="flex gap-2 items-center">
            <Select value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} options={CURRENCIES.map(c => ({ value: c, label: c }))} />
          </div>
        </div>

        <div className="p-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Exchange Rates</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Manage currency conversion rates</p>
          {rates.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {rates.map(r => (
                <span key={r.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                  {r.fromCurrency}→{r.toCurrency}: {r.rate}
                  <button onClick={() => deleteRate(r.id!)} className="text-red-400 hover:text-red-600 ml-1">&times;</button>
                </span>
              ))}
            </div>
          )}
          <Button size="sm" variant="secondary" onClick={() => setRateModal(true)}>+ Add Rate</Button>
        </div>

        <div className="p-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1">
            <Bell size={16} /> Reminders
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Get notified before recurring payments are due</p>
          <Button size="sm" variant="secondary" onClick={requestNotification}>
            <Bell size={16} /> {notifPerm === 'granted' ? 'Test Notification' : 'Enable Notifications'}
          </Button>
          {notifPerm === 'denied' && <p className="text-xs text-red-500 mt-1">Notifications blocked. Enable in browser settings.</p>}
        </div>

        <div className="p-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Share App</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Share a link to this app</p>
          <Button size="sm" variant="secondary" onClick={() => share({ title: 'Expense Tracker', text: 'Check out my expense tracker!' })}>
            <FileText size={16} /> Share
          </Button>
        </div>

        <div className="p-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">PDF Report</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Generate a printable report of recent transactions</p>
          <Button size="sm" variant="secondary" onClick={generatePDF}>
            <FileText size={16} /> Generate PDF
          </Button>
        </div>

        <div className="p-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Export Data</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Download all data as JSON (backup)</p>
          <Button size="sm" onClick={exportData}><Download size={16} /> Export</Button>
        </div>

        <div className="p-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Import Data (JSON)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Restore from a JSON backup</p>
          <Button size="sm" variant="secondary" onClick={() => setImportModal(true)}><Upload size={16} /> Import JSON</Button>
        </div>

        <div className="p-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Import CSV</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Import transactions from a bank CSV export</p>
          <Button size="sm" variant="secondary" onClick={openCsv}><FileText size={16} /> Import CSV</Button>
        </div>

        <div className="p-4">
          <h2 className="font-semibold text-red-900 dark:text-red-400 mb-1">Danger Zone</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Permanently delete all data</p>
          <Button size="sm" variant="danger" onClick={clearAll}><Trash2 size={16} /> Clear All Data</Button>
        </div>
      </Card>

      <div className="text-center text-xs text-gray-400 dark:text-gray-600">
        <SettingsIcon size={16} className="inline mb-1" />
        <p>Expense Tracker v1.0</p>
        <p>Data is stored locally in your browser (IndexedDB)</p>
      </div>

      <Modal open={importModal} onClose={() => setImportModal(false)} title="Import Data">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Paste your JSON backup data below:</p>
          <textarea className="w-full h-48 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500" value={importData} onChange={e => setImportData(e.target.value)} placeholder='{"accounts": [...], "transactions": [...], ...}' />
          <div className="flex gap-3">
            <Button className="flex-1" onClick={doImport} disabled={!importData.trim()}>Import</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setImportModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={csvModal} onClose={() => setCsvModal(false)} title="Import CSV">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Required columns: <strong>Date</strong>, <strong>Amount</strong> (or Debit + Credit). Description auto-detected.</p>
          <Select label="Target Account" value={csvAccountId} onChange={e => setCsvAccountId(e.target.value)} options={accountOptions} />
          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600 dark:text-gray-400">Delimiter:</label>
            {[',', ';', '\t'].map(d => (
              <button key={d} type="button" onClick={() => setCsvDelimiter(d)}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${csvDelimiter === d ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'}`}
              >{d === '\t' ? 'Tab' : `"${d}"`}</button>
            ))}
          </div>
          <textarea className="w-full h-48 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500" value={csvData} onChange={e => setCsvData(e.target.value)} placeholder="Date,Description,Amount&#10;2024-01-15,Groceries,-45.50&#10;2024-01-16,Salary,3000.00" />
          <div className="flex gap-3">
            <Button className="flex-1" onClick={doCsvImport} disabled={!csvData.trim() || !csvAccountId}>Import</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setCsvModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={rateModal} onClose={() => setRateModal(false)} title="Add Exchange Rate">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="From" value={rateForm.fromCurrency} onChange={e => setRateForm({ ...rateForm, fromCurrency: e.target.value })} options={CURRENCIES.map(c => ({ value: c, label: c }))} />
            <Select label="To" value={rateForm.toCurrency} onChange={e => setRateForm({ ...rateForm, toCurrency: e.target.value })} options={CURRENCIES.map(c => ({ value: c, label: c }))} />
          </div>
          <Input label="Rate" type="number" step="0.0001" value={rateForm.rate} onChange={e => setRateForm({ ...rateForm, rate: e.target.value })} placeholder="e.g. 0.92 for USD→EUR" />
          <div className="flex gap-3">
            <Button className="flex-1" onClick={saveRate} disabled={!rateForm.rate}>Save</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setRateModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
