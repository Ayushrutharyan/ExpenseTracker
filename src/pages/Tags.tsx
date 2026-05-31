import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Tags as TagsIcon, ChevronRight, ChevronDown } from 'lucide-react'
import { db } from '../db/db'
import type { Tag } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { ColorPicker } from '../components/ui/ColorPicker'
import { EmptyState } from '../components/ui/EmptyState'

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [form, setForm] = useState({ name: '', color: '#3b82f6', icon: '', parentId: '' })

  const load = async () => {
    const data = await db.tags.orderBy('name').toArray()
    setTags(data)
  }

  useEffect(() => { load() }, [])

  const parents = tags.filter(t => !t.parentId)
  const getChildren = (id: number) => tags.filter(t => t.parentId === id)

  const openNew = () => {
    setEditing(null)
    setMessage('')
    setForm({ name: '', color: '#3b82f6', icon: '', parentId: '' })
    setModalOpen(true)
  }

  const openEdit = (tag: Tag) => {
    setEditing(tag)
    setMessage('')
    setForm({ name: tag.name, color: tag.color, icon: tag.icon, parentId: String(tag.parentId || '') })
    setModalOpen(true)
  }

  const [message, setMessage] = useState('')

  const save = async () => {
    if (!form.name.trim()) return
    const dup = await db.tags.where('name').equalsIgnoreCase(form.name.trim()).first()
    if (dup && (!editing || dup.id !== editing.id)) {
      setMessage(`Tag "${form.name}" already exists`)
      setTimeout(() => setMessage(''), 3000)
      return
    }
    const data: Partial<Tag> = { name: form.name, color: form.color, icon: form.icon }
    if (form.parentId) data.parentId = Number(form.parentId)
    else data.parentId = undefined
    if (editing) {
      await db.tags.update(editing.id!, data)
    } else {
      await db.tags.add({ ...data, createdAt: new Date() } as Tag)
    }
    setMessage('')
    setModalOpen(false)
    await load()
  }

  const remove = async (id: number) => {
    if (!confirm(`Delete tag "${tags.find(t => t.id === id)?.name}"? Children will become top-level.`)) return
    const children = getChildren(id)
    for (const child of children) {
      await db.tags.update(child.id!, { parentId: undefined })
    }
    await db.tags.delete(id)
    await load()
  }

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const parentOptions = [
    { value: '', label: 'None (top-level)' },
    ...parents.filter(p => p.id !== editing?.id).map(p => ({ value: String(p.id), label: p.name })),
  ]

  const renderTag = (tag: Tag, depth: number = 0) => {
    const children = getChildren(tag.id!)
    const isExpanded = expanded.has(tag.id!)
    return (
      <div key={tag.id}>
        <Card className={`px-3 py-2 flex items-center gap-2 ${depth > 0 ? 'ml-6' : ''}`}>
          {children.length > 0 ? (
            <button onClick={() => toggleExpand(tag.id!)} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
          <span className="font-medium text-gray-900 dark:text-gray-100">{tag.name}</span>
          {depth === 0 && children.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">({children.length})</span>
          )}
          <div className="ml-auto flex gap-1">
            <button onClick={() => openEdit(tag)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500">
              <Pencil size={14} />
            </button>
            <button onClick={() => remove(tag.id!)} className="p-0.5 rounded hover:bg-red-50 text-gray-400 dark:text-gray-500 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        </Card>
        {isExpanded && children.map(child => renderTag(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tags</h1>
        <Button size="sm" onClick={openNew}><Plus size={16} /> New Tag</Button>
      </div>

      {tags.length === 0 ? (
        <EmptyState
          icon={<TagsIcon size={48} />}
          title="No tags yet"
          description="Create tags to categorize your transactions"
          action={<Button size="sm" onClick={openNew}><Plus size={16} /> Create Tag</Button>}
        />
      ) : (
        <div className="space-y-1">
          {parents.map(p => renderTag(p))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Tag' : 'New Tag'}>
        <div className="space-y-4">
          {message && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm">{message}</div>}
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Groceries" />
          <Select label="Parent Tag" value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })} options={parentOptions} />
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
