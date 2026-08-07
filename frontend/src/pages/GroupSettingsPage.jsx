import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Link2, Copy, Check, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { useCurrentUser } from '../hooks/useCurrentUser'

export default function GroupSettingsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useCurrentUser()
  const [group, setGroup] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [name, setName] = useState('')
  const [archived, setArchived] = useState(false)
  const [simplify, setSimplify] = useState(true)
  const [emoji, setEmoji] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [removingId, setRemovingId] = useState(null)
  const [addUserId, setAddUserId] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editRequests, setEditRequests] = useState([])
  const [reviewingId, setReviewingId] = useState(null)

  const isOwner = group?.created_by_id === currentUser?.id

  useEffect(() => {
    api.getGroup(id).then(g => {
      setGroup(g)
      setName(g.name)
      setArchived(g.archived)
      setSimplify(g.simplify_debts)
      setEmoji(g.emoji || '')
    }).catch(() => navigate('/'))
    api.getUsers().then(setAllUsers).catch(console.error)
  }, [id])

  useEffect(() => {
    if (isOwner) {
      api.getEditRequests(id).then(setEditRequests).catch(console.error)
    }
  }, [id, isOwner])

  async function saveSettings(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const g = await api.updateGroup(id, { name, archived, simplify_debts: simplify, emoji: emoji || null })
      setGroup(g)
      setSuccess('Settings saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeMember(uid) {
    setRemovingId(uid)
    setError('')
    try {
      const g = await api.removeMember(id, uid)
      setGroup(g)
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  async function addMember(e) {
    e.preventDefault()
    if (!addUserId) return
    setError('')
    try {
      const g = await api.addMember(id, parseInt(addUserId))
      setGroup(g)
      setAddUserId('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function generateInvite() {
    setInviteLoading(true)
    try {
      const result = await api.createInvite(id, currentUser.id)
      const link = `${window.location.origin}/invite/${result.token}`
      setInviteLink(link)
    } catch (err) {
      setError(err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function reviewRequest(reqId, status) {
    setReviewingId(reqId)
    try {
      const updated = await api.reviewEditRequest(reqId, { status, actor_user_id: currentUser.id })
      setEditRequests(prev => prev.map(r => r.id === reqId ? updated : r))
    } catch (err) {
      setError(err.message)
    } finally {
      setReviewingId(null)
    }
  }

  if (!group) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const memberIds = new Set(group.members.map(m => m.id))
  const nonMembers = allUsers.filter(u => !memberIds.has(u.id))
  const pendingRequests = editRequests.filter(r => r.status === 'pending')

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <Link to={`/groups/${id}`} className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Group settings</h1>
          <p className="text-xs text-slate-400">{group.name}</p>
        </div>
      </div>

      {/* Edit requests inbox (owner only) */}
      {isOwner && pendingRequests.length > 0 && (
        <div className="card p-5 border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">{pendingRequests.length} pending edit request{pendingRequests.length !== 1 ? 's' : ''}</h2>
          </div>
          <div className="space-y-3">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white rounded-xl border border-amber-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">"{req.expense_description}"</p>
                    <p className="text-xs text-slate-400 mt-0.5">Requested by <span className="font-medium text-slate-600">{req.requested_by_name}</span></p>
                    {req.message && <p className="text-xs text-slate-500 mt-1 italic">"{req.message}"</p>}
                  </div>
                </div>
                {/* Proposed changes */}
                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Proposed changes</p>
                  {Object.entries(req.proposed_changes).map(([k, v]) => (
                    <p key={k} className="text-xs text-slate-700"><span className="font-medium capitalize">{k}:</span> {String(v)}</p>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewRequest(req.id, 'approved')}
                    disabled={reviewingId === req.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-positive-600 text-white text-xs font-semibold rounded-lg hover:bg-positive-700 disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} /> Approve
                  </button>
                  <button
                    onClick={() => reviewRequest(req.id, 'rejected')}
                    disabled={reviewingId === req.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-negative-200 text-negative-600 text-xs font-semibold rounded-lg hover:bg-negative-50 disabled:opacity-50"
                  >
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings form */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">General</h2>
        <form onSubmit={saveSettings} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Group name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input" />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Emoji</label>
              <input value={emoji} onChange={e => setEmoji(e.target.value)} className="input text-center text-lg" placeholder="✈️" maxLength={2} />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} className="accent-brand-600 w-4 h-4 rounded" />
            <div>
              <span className="text-sm font-medium text-slate-700">Archive group</span>
              <p className="text-xs text-slate-400">No new expenses or payments.</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={simplify} onChange={e => setSimplify(e.target.checked)} className="accent-brand-600 w-4 h-4 rounded" />
            <div>
              <span className="text-sm font-medium text-slate-700">Simplify debts</span>
              <p className="text-xs text-slate-400">Show fewest possible transactions to settle up.</p>
            </div>
          </label>
          {error && <p className="text-negative-600 text-xs bg-negative-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-positive-600 text-xs bg-positive-50 px-3 py-2 rounded-lg">{success}</p>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </div>

      {/* Invite link */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={15} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Invite link</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">Share this link. Anyone with it can join the group. Expires in 7 days.</p>
        {inviteLink ? (
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="input text-xs font-mono flex-1"
            />
            <button
              onClick={copyInvite}
              className="btn-secondary flex items-center gap-1.5 text-xs px-3 flex-none"
            >
              {copied ? <Check size={13} className="text-positive-600" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <button
            onClick={generateInvite}
            disabled={inviteLoading}
            className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
          >
            <Link2 size={14} />
            {inviteLoading ? 'Generating…' : 'Generate invite link'}
          </button>
        )}
      </div>

      {/* Members */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Members ({group.members.length})</h2>
        <div className="space-y-2 mb-4">
          {group.members.map(m => (
            <div key={m.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {m.name}
                    {m.id === currentUser.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                    {m.id === group.created_by_id && <span className="ml-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md font-semibold">owner</span>}
                  </p>
                  {m.email && <p className="text-xs text-slate-400">{m.email}</p>}
                </div>
              </div>
              {isOwner && m.id !== currentUser.id && (
                <button
                  onClick={() => removeMember(m.id)}
                  disabled={removingId === m.id}
                  className="text-xs text-slate-300 hover:text-negative-500 disabled:opacity-50 transition-colors p-1.5 rounded-lg hover:bg-negative-50"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        {nonMembers.length > 0 && isOwner && (
          <form onSubmit={addMember} className="flex gap-2 pt-3 border-t border-slate-100">
            <select value={addUserId} onChange={e => setAddUserId(e.target.value)} className="input flex-1 text-sm">
              <option value="">Add a member…</option>
              {nonMembers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <button type="submit" disabled={!addUserId} className="btn-primary px-4 flex-none">
              Add
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
