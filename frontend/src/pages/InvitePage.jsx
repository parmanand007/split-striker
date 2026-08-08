import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Clock, CheckCircle2, ArrowRight, LogIn, UserPlus } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import LogoLoader from '../components/ui/LogoLoader'
import { api } from '../api/client'
import { useCurrentUser } from '../hooks/useCurrentUser'
import Logo from '../components/Logo'

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
    setJoining(true)
    try {
      const result = await api.acceptInvite(token, currentUser.id)
      setJoined(true)
      setTimeout(() => navigate(`/groups/${result.group_id}`), 1500)
    } catch (err) {
      setError(err.message)
      setJoining(false)
    }
  }

  const next = encodeURIComponent(`/invite/${token}`)
  const expiresIn = invite
    ? Math.max(0, Math.floor((new Date(invite.expires_at) - Date.now()) / 86400000))
    : 0

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: 'linear-gradient(145deg, #080d14 0%, #0e1825 55%, #080d14 100%)' }}
    >
      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'rgba(var(--blob-a), 0.15)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'rgba(var(--blob-b), 0.12)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="sm" />
        </div>

        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          {/* Loading */}
          {loading && <LogoLoader variant="section" text="Loading invite…" />}

          {/* Error — expired / invalid */}
          {!loading && error && (
            <div className="text-center py-10 px-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-red-400" />
              </div>
              <p className="text-white font-semibold mb-1">Invite not available</p>
              <p className="text-slate-400 text-sm mb-6">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
              >
                Go to homepage
              </button>
            </div>
          )}

          {/* Valid invite */}
          {!loading && !error && invite && !joined && (
            <div className="p-6">
              {/* Group info */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(var(--blob-a), 0.2)' }}>
                  <Users size={26} className="text-brand-400" />
                </div>
                <p className="text-slate-400 text-xs mb-1">
                  Invited by <span className="text-white font-medium">{invite.invited_by}</span>
                </p>
                <h1 className="text-2xl font-bold text-white mb-2">{invite.group_name}</h1>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {invite.group_currency}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {invite.member_count} member{invite.member_count !== 1 ? 's' : ''}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    Expires in {expiresIn}d
                  </span>
                </div>
              </div>

              {/* CTA based on auth state */}
              {currentUser ? (
                /* Logged in — join directly */
                <>
                  <div className="flex items-center gap-3 p-3 rounded-2xl mb-4"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm flex-none">
                      {currentUser.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{currentUser.name}</p>
                      <p className="text-slate-500 text-xs truncate">{currentUser.email}</p>
                    </div>
                  </div>
                  {error && (
                    <p className="text-red-400 text-xs mb-3 text-center">{error}</p>
                  )}
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2
                      bg-gradient-to-r from-brand-600 to-brand-800 hover:from-brand-500 hover:to-brand-700
                      shadow-lg shadow-brand-600/30 active:scale-[0.97] transition-all disabled:opacity-50"
                  >
                    {joining ? <Spinner size="sm" /> : <ArrowRight size={16} />}
                    {joining ? 'Joining…' : 'Join group'}
                  </button>
                </>
              ) : (
                /* Not logged in — sign up or sign in */
                <div className="space-y-3">
                  <p className="text-center text-slate-400 text-xs mb-4">
                    Create a free account or sign in to join this group.
                  </p>
                  <button
                    onClick={() => navigate(`/login?next=${next}&mode=signup`)}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2
                      bg-gradient-to-r from-brand-600 to-brand-800 hover:from-brand-500 hover:to-brand-700
                      shadow-lg shadow-brand-600/30 active:scale-[0.97] transition-all"
                  >
                    <UserPlus size={16} />
                    Create free account
                  </button>
                  <button
                    onClick={() => navigate(`/login?next=${next}`)}
                    className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2
                      active:scale-[0.97] transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#e2e8f0',
                    }}
                  >
                    <LogIn size={16} />
                    Already have an account? Sign in
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Joined success */}
          {joined && (
            <div className="text-center py-10 px-6">
              <CheckCircle2 size={44} className="text-positive-500 mx-auto mb-3" />
              <p className="text-white font-semibold text-lg">You're in!</p>
              <p className="text-slate-400 text-sm mt-1">Redirecting to the group…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
