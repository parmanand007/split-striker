import { useState } from 'react'
import { api } from '../../api/client'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import Modal from '../ui/Modal'

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'AED']

const EMOJIS = ['🏠', '✈️', '🍕', '🎉', '💼', '🎮', '🏋️', '🚗', '🛒', '⛺', '🎵', '📚']

export default function CreateGroupModal({ onClose, onCreated }) {
  const { currentUser } = useCurrentUser()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [emoji, setEmoji] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Group name is required.')
    setSaving(true)
    setError('')
    try {
      const group = await api.createGroup({
        name: name.trim(),
        currency,
        member_ids: [currentUser.id],
        created_by_id: currentUser.id,
        emoji: emoji || null,
      })
      onCreated(group)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const labelCls = 'block text-xs font-semibold uppercase tracking-wider mb-1.5'
  const inputCls = 'w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all'
  const inputStyle = {
    background: 'var(--input-bg, rgba(0,0,0,0.06))',
    border: '1px solid var(--border, rgba(0,0,0,0.1))',
    color: 'var(--text-primary, #0f172a)',
    fontSize: '16px',  // prevents iOS zoom
  }

  return (
    <Modal title="New Group" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">

        {/* Emoji picker */}
        <div>
          <label className={labelCls} style={{ color: 'var(--text-muted, #64748b)' }}>Icon</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(emoji === e ? '' : e)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all active:scale-90 ${
                  emoji === e
                    ? 'ring-2 ring-brand-500 scale-110'
                    : 'hover:scale-110 opacity-70 hover:opacity-100'
                }`}
                style={{ background: 'var(--input-bg, rgba(0,0,0,0.06))' }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Group name */}
        <div>
          <label className={labelCls} style={{ color: 'var(--text-muted, #64748b)' }}>Group name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            className={inputCls}
            style={inputStyle}
            placeholder="e.g. Goa Trip"
          />
        </div>

        {/* Currency */}
        <div>
          <label className={labelCls} style={{ color: 'var(--text-muted, #64748b)' }}>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputCls}
            style={inputStyle}
          >
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Invite note */}
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted, #64748b)' }}>
          You&apos;ll be added automatically. After creating the group, share an invite link to add
          others — members can only join by invitation.
        </p>

        {error && (
          <p className="text-red-500 text-sm flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-red-500 flex-none" />
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{
              background: 'var(--input-bg, rgba(0,0,0,0.06))',
              color: 'var(--text-muted, #64748b)',
              border: '1px solid var(--border, rgba(0,0,0,0.1))',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-700 text-white
              shadow-lg shadow-brand-600/25 active:scale-95 transition-all disabled:opacity-40"
          >
            {saving ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
