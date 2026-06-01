import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Tags, Filter } from 'lucide-react'
import { api } from '../utils/api'
import type { Account, Tag, Rule } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { useRules } from '../hooks/useRules'

export function RulesPage() {
  const { items, loading, create, update, remove } = useRules()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [form, setForm] = useState({
    pattern: '', description: '', accountId: '', tagIds: [] as number[], isActive: true,
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
    setForm({ pattern: '', description: '', accountId: '', tagIds: [], isActive: true })
    setModalOpen(true)
  }

  const openEdit = (r: Rule) => {
    setEditing(r)
    setForm({
      pattern: r.pattern,
      description: r.description ?? '',
      accountId: r.accountId ? String(r.accountId) : '',
      tagIds: r.tagIds,
      isActive: r.isActive,
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.pattern.trim()) return
    const data: Record<string, unknown> = {
      pattern: form.pattern,
      tagIds: form.tagIds,
      isActive: form.isActive,
    }
    if (form.description) data.description = form.description
    if (form.accountId) data.accountId = Number(form.accountId)
    if (editing) {
      await update(editing.id!, data)
    } else {
      await create(data)
    }
    setModalOpen(false)
  }

  const removeRule = async (r: Rule) => {
    if (!confirm(`Delete rule "${r.pattern}"?`)) return
    await remove(r.id!)
  }

  const accountOptions = [
    { value: '', label: 'None (all accounts)' },
    ...accounts.map(a => ({ value: String(a.id), label: a.name })),
  ]

  const toggleTag = (id: number) => {
    setForm(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(id) ? prev.tagIds.filter(t => t !== id) : [...prev.tagIds, id],
    }))
  }

  const getTagBadges = (tagIds: number[]) =>
    tagIds.map(id => tags.find(t => t.id === id)).filter((t): t is Tag => t !== undefined).map(t => (
      <Badge key={t.id} label={t.name} color={t.color} />
    ))

  const getAccountName = (accountId?: number) =>
    accountId ? accounts.find(a => a.id === accountId)?.name : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rules</h1>
        <Button size="sm" onClick={openNew}><Plus size={16} /> New Rule</Button>
      </div>

      {loading ? null : items.length === 0 ? (
        <EmptyState
          icon={<Filter size={48} />}
          title="No rules yet"
          description="Create rules to auto-tag transactions based on their description"
          action={<Button size="sm" onClick={openNew}><Plus size={16} /> Create Rule</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {items.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{r.pattern}</span>
                    {!r.isActive && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{r.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tags size={14} className="text-gray-400 shrink-0" />
                    {r.tagIds.length > 0 ? getTagBadges(r.tagIds) : (
                      <span className="text-xs text-gray-400">No tags</span>
                    )}
                  </div>
                  {getAccountName(r.accountId) && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Filter size={12} />
                      <span>{getAccountName(r.accountId)}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 ml-3">
                  <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => removeRule(r)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Rule' : 'New Rule'}>
        <div className="space-y-4">
          <Input label="Pattern" value={form.pattern} onChange={e => setForm({ ...form, pattern: e.target.value })} placeholder="e.g. amazon" />
          <Input label="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Rule name or note" />
          <Select label="Account filter (optional)" value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} options={accountOptions} />
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-purple-600 focus:ring-purple-500"
            />
            Active
          </label>

          {tags.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags to apply</label>
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
