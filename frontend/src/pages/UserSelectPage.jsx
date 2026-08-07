import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '../api/client'
import { useCurrentUser } from '../hooks/useCurrentUser'

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500',
  'bg-teal-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
]

function avatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

export default function UserSelectPage() {
  const navigate = useNavigate()
  const { login, currentUser } = useCurrentUser()
  const [users, setUsers] = useState([])
  const [mode, setMode] = useState('select') // 'select' | 'create'
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (currentUser) navigate('/')
  }, [currentUser])

  useEffect(() => {
    api.getUsers().then(setUsers).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSelect(u) {
    setSelected(u.id)
    await new Promise(r => setTimeout(r, 200))
    login(u)
    navigate('/')
  }

  async function createAndLogin(e) {
    e.preventDefault()
    if (!newName.trim()) return setError('Name is required.')
    setError('')
    setSubmitting(true)
    try {
      const user = await api.createUser(newName.trim(), newEmail.trim() || null)
      setUsers(prev => [...prev, user])
      login(user)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">SplitEase</span>
          </div>
          <p className="text-slate-400 text-sm">Split expenses. Stay friends.</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-modal">
          {mode === 'select' ? (
            <>
              <h2 className="text-base font-semibold text-white mb-4">
                {loading ? 'Loading…' : users.length > 0 ? 'Who are you?' : 'Get started'}
              </h2>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 skeleton rounded-xl opacity-20" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto -mx-1 px-1">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelect(u)}
                      disabled={selected === u.id}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                        selected === u.id
                          ? 'border-brand-400 bg-brand-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full ${avatarColor(u.id)} flex items-center justify-center text-white font-bold text-sm flex-none`}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm truncate">{u.name}</div>
                        {u.email && <div className="text-xs text-slate-400 truncate">{u.email}</div>}
                      </div>
                      {selected === u.id
                        ? <Loader2 size={16} className="text-brand-400 animate-spin flex-none" />
                        : <ArrowRight size={14} className="text-slate-500 flex-none" />
                      }
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => setMode('create')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-white/20 rounded-xl text-sm text-slate-400 hover:text-white hover:border-white/40 transition-colors"
                >
                  <Plus size={15} />
                  Create new account
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setMode('select'); setError('') }}
                className="text-xs text-slate-400 hover:text-white mb-4 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-base font-semibold text-white mb-4">Create your profile</h2>
              <form onSubmit={createAndLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Your name</label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Deepak Sharma"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Email <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="deepak@gmail.com"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-400 transition-all"
                  />
                </div>
                {error && <p className="text-negative-500 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting || !newName.trim()}
                  className="w-full py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                  {submitting ? 'Creating…' : 'Create account & sign in'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          No password needed. Just pick your name.
        </p>
      </div>
    </div>
  )
}
