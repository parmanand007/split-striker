import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import Modal from '../ui/Modal'

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'AED']

export default function CreateGroupModal({ onClose, onCreated }) {
  const { currentUser } = useCurrentUser()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [allUsers, setAllUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set([currentUser.id]))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getUsers().then(setAllUsers).catch(console.error)
  }, [])

  function toggle(id) {
    if (id === currentUser.id) return // can't remove self
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Group name is required.')
    setSaving(true)
    setError('')
    try {
      const group = await api.createGroup({
        name: name.trim(),
        currency,
        member_ids: [...selectedIds],
        created_by_id: currentUser.id,
        emoji: null,
      })
      onCreated(group)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Create Group" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Group name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. Goa Trip"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Default currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Members</label>
          <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
            {allUsers.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:hover:bg-slate-700/50 rounded px-2 py-1">
                <input
                  type="checkbox"
                  checked={selectedIds.has(u.id)}
                  onChange={() => toggle(u.id)}
                  disabled={u.id === currentUser.id}
                  className="accent-brand-600"
                />
                <span className={u.id === currentUser.id ? 'text-slate-400' : ''}>{u.name}{u.id === currentUser.id ? ' (you)' : ''}</span>
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
