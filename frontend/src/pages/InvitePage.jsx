import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Clock, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { api } from '../api/client'
import { useCurrentUser } from '../hooks/useCurrentUser'

export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useCurrentUser()
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    api.getInvite(token)
      .then(setInvite)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  async function handleJoin() {
    if (!currentUser) {
      navigate(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)
      return
    }
    setJoining(true)
    try {
      const result = await api.acceptInvite(token, currentUser.id)
      setJoined(true)
      setTimeout(() => navigate(`/groups/${result.group_id}`), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  const expiresIn = invite ? Math.max(0, Math.floor((new Date(invite.expires_at) - Date.now()) / 86400000)) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-xl font-bold text-white">Split Striker</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-modal">
          {loading && (
            <div className="flex flex-col items-center py-10">
              <Loader2 size={28} className="text-brand-400 animate-spin mb-3" />
              <p className="text-slate-400 text-sm">Loading invite…</p>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-negative-100/10 flex items-center justify-center mx-auto mb-4">
                <Clock size={22} className="text-negative-400" />
              </div>
              <p className="text-white font-semibold mb-1">Invite not available</p>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && invite && !joined && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-brand-400" />
                </div>
                <p className="text-slate-400 text-xs mb-1">You've been invited by <span className="text-white font-medium">{invite.invited_by}</span></p>
                <h1 className="text-2xl font-bold text-white mb-1">{invite.group_name}</h1>
                <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                  <span>{invite.group_currency} group</span>
                  <span>·</span>
                  <span>{invite.member_count} member{invite.member_count !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>Expires in {expiresIn}d</span>
                </div>
              </div>

              {currentUser ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {joining ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {joining ? 'Joining…' : `Join as ${currentUser.name}`}
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-500 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <ArrowRight size={16} />
                  Sign in to join
                </button>
              )}
            </>
          )}

          {joined && (
            <div className="text-center py-8">
              <CheckCircle2 size={40} className="text-positive-500 mx-auto mb-3" />
              <p className="text-white font-semibold">You've joined!</p>
              <p className="text-slate-400 text-sm mt-1">Redirecting to group…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
