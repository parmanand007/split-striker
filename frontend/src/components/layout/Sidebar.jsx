import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Plus, LogOut,
  TrendingUp, TrendingDown, Minus, Beaker,
} from 'lucide-react'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useTheme, THEMES } from '../../hooks/useTheme'
import { api } from '../../api/client'
import CreateGroupModal from '../groups/CreateGroupModal'

function ThemeSwitcher({ theme, setTheme }) {
  return (
    <div className="px-3 mb-2">
      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Theme</p>
      <div className="flex items-center gap-1.5">
        {THEMES.map((t) => {
          const isActive = theme === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.label}
              className={`relative w-6 h-6 rounded-full transition-all duration-200 flex-none
                ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
              style={{
                background: `conic-gradient(${t.swatch} 0deg 180deg, ${t.swatchB} 180deg 360deg)`,
              }}
            >
              {isActive && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const GROUP_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500',
  'bg-teal-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
]

function groupColor(id) {
  return GROUP_COLORS[id % GROUP_COLORS.length]
}

export default function Sidebar() {
  const { currentUser, logout } = useCurrentUser()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [groups, setGroups] = useState([])
  const [summary, setSummary] = useState(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [pendingCounts, setPendingCounts] = useState({})

  useEffect(() => {
    if (!currentUser) return
    api.getGroups(currentUser.id).then(setGroups).catch(console.error)
    api.getUserSummary(currentUser.id).then(setSummary).catch(console.error)
  }, [currentUser, location.pathname])

  useEffect(() => {
    if (!groups.length || !currentUser) return
    const ownerGroups = groups.filter(g => g.created_by_id === currentUser.id)
    Promise.all(
      ownerGroups.map(g =>
        api.getEditRequests(g.id).then(reqs => ({ id: g.id, count: reqs.length })).catch(() => ({ id: g.id, count: 0 }))
      )
    ).then(results => {
      const counts = {}
      results.forEach(r => { counts[r.id] = r.count })
      setPendingCounts(counts)
    })
  }, [groups, currentUser])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const totalOwed = summary ? Object.entries(summary.total_owed) : []
  const totalOwing = summary ? Object.entries(summary.total_owing) : []
  const isSettled = totalOwed.length === 0 && totalOwing.length === 0

  return (
    <>
      <aside
        className="w-64 flex-none flex flex-col h-screen transition-colors duration-300 border-r border-white/5"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30 transition-all duration-300">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Split Striker</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 space-y-0.5">
          <Link
            to="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              location.pathname === '/'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={15} />
            Dashboard
          </Link>
          <Link
            to="/dev/test-suite"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              location.pathname === '/dev/test-suite'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Beaker size={15} />
            Test Suite
          </Link>
        </nav>

        <div className="mx-3 my-4 border-t border-white/10" />

        {/* Groups */}
        <div className="px-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Groups</span>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              title="New group"
            >
              <Plus size={13} />
            </button>
          </div>

          {groups.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-slate-600">No groups yet.</p>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="mt-2 text-xs text-brand-400 hover:text-brand-300"
              >
                Create your first group →
              </button>
            </div>
          )}

          <div className="space-y-0.5">
            {groups.map((g) => {
              const active = location.pathname.startsWith(`/groups/${g.id}`)
              const userBal = summary?.group_balances?.find(b => b.group_id === g.id)
              const bal = userBal ? parseFloat(userBal.balance) : 0
              const pending = pendingCounts[g.id] || 0

              return (
                <Link
                  key={g.id}
                  to={`/groups/${g.id}`}
                  className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                    active
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md ${groupColor(g.id)} flex items-center justify-center text-white font-bold text-xs flex-none`}>
                    {g.emoji || g.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{g.name}</span>
                  <div className="flex items-center gap-1.5 flex-none">
                    {pending > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {pending}
                      </span>
                    )}
                    {Math.abs(bal) > 0.005 && (
                      <span className={`text-xs font-semibold ${bal > 0 ? 'text-positive-500' : 'text-negative-500'}`}>
                        {bal > 0 ? '+' : ''}{bal.toFixed(0)}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Bottom area */}
        <div className="p-3 border-t border-white/10">
          {/* Mini balance */}
          {summary && (
            <div className="px-3 py-2 mb-1">
              {isSettled ? (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Minus size={11} /> All settled up
                </p>
              ) : (
                <div className="space-y-0.5">
                  {totalOwed.map(([c, a]) => (
                    <p key={c} className="text-xs text-positive-500 flex items-center gap-1.5 font-medium">
                      <TrendingUp size={11} /> owed {c} {parseFloat(a).toFixed(2)}
                    </p>
                  ))}
                  {totalOwing.map(([c, a]) => (
                    <p key={c} className="text-xs text-negative-500 flex items-center gap-1.5 font-medium">
                      <TrendingDown size={11} /> owe {c} {parseFloat(a).toFixed(2)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Theme swatch picker */}
          <ThemeSwitcher theme={theme} setTheme={setTheme} />

          {/* User row */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-xs flex-none shadow transition-all duration-300">
              {currentUser?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentUser?.name}</p>
              {currentUser?.email && (
                <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={(g) => {
            setGroups((prev) => [g, ...prev])
            setShowCreateGroup(false)
            navigate(`/groups/${g.id}`)
          }}
        />
      )}
    </>
  )
}
