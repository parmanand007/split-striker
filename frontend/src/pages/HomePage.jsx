import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowRight, Zap } from 'lucide-react'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { api } from '../api/client'
import ActivityFeed from '../components/activity/ActivityFeed'

const GROUP_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500',
  'bg-teal-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
]
function groupColor(id) { return GROUP_COLORS[id % GROUP_COLORS.length] }

function StatCard({ label, value, sub, positive, empty }) {
  return (
    <div className={`card p-5 ${positive === true ? 'border-positive-100' : positive === false ? 'border-negative-100' : ''}`}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{label}</p>
      {empty ? (
        <p className="text-2xl font-bold text-slate-200">—</p>
      ) : (
        <>
          <p className={`text-2xl font-bold ${positive === true ? 'text-positive-600' : positive === false ? 'text-negative-600' : 'text-slate-800 dark:text-slate-100'}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </>
      )}
    </div>
  )
}

function SkeletonHome() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 skeleton w-64" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-28 skeleton rounded-2xl" />
        <div className="h-28 skeleton rounded-2xl" />
      </div>
      <div className="h-48 skeleton rounded-2xl" />
    </div>
  )
}

export default function HomePage() {
  const { currentUser } = useCurrentUser()
  const [summary, setSummary] = useState(null)
  const [activity, setActivity] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getUserSummary(currentUser.id),
      api.getUserActivity(currentUser.id),
      api.getGroups(),
    ]).then(([s, a, g]) => {
      setSummary(s)
      setActivity(a)
      setGroups(g)
    }).catch(console.error).finally(() => setLoading(false))
  }, [currentUser.id])

  if (loading) return <SkeletonHome />

  const totalOwed = summary?.total_owed || {}
  const totalOwing = summary?.total_owing || {}

  const owedEntries = Object.entries(totalOwed)
  const owingEntries = Object.entries(totalOwing)

  // Net balance per currency
  const allCurrencies = new Set([...owedEntries.map(e => e[0]), ...owingEntries.map(e => e[0])])
  const netByCurrency = [...allCurrencies].map(c => {
    const owed = parseFloat(totalOwed[c] || 0)
    const owing = parseFloat(totalOwing[c] || 0)
    return { currency: c, net: owed - owing }
  })

  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{greet()}</p>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{currentUser.name}</h1>
        </div>
        {netByCurrency.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Net balance</p>
            {netByCurrency.map(({ currency, net }) => (
              <p key={currency} className={`text-lg font-bold ${net >= 0 ? 'text-positive-600' : 'text-negative-600'}`}>
                {net >= 0 ? '+' : ''}{currency} {Math.abs(net).toFixed(2)}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="You are owed"
          empty={owedEntries.length === 0}
          positive={true}
          value={owedEntries.map(([c, a]) => `${c} ${parseFloat(a).toFixed(2)}`).join(' · ')}
          sub={`across ${groups.filter(g => {
            const b = summary?.group_balances?.find(b => b.group_id === g.id)
            return b && parseFloat(b.balance) > 0.005
          }).length} group(s)`}
        />
        <StatCard
          label="You owe"
          empty={owingEntries.length === 0}
          positive={false}
          value={owingEntries.map(([c, a]) => `${c} ${parseFloat(a).toFixed(2)}`).join(' · ')}
          sub={`across ${groups.filter(g => {
            const b = summary?.group_balances?.find(b => b.group_id === g.id)
            return b && parseFloat(b.balance) < -0.005
          }).length} group(s)`}
        />
      </div>

      {/* Group breakdown */}
      {summary?.group_balances?.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">By group</h2>
          <div className="space-y-1">
            {summary.group_balances.map((g) => {
              const bal = parseFloat(g.balance)
              const group = groups.find(gr => gr.id === g.group_id)
              return (
                <Link
                  key={g.group_id}
                  to={`/groups/${g.group_id}`}
                  className="flex items-center gap-3 -mx-2 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg ${groupColor(g.group_id)} flex items-center justify-center text-white font-bold text-xs flex-none`}>
                    {group?.emoji || g.group_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900">{g.group_name}</span>
                  <span className={`text-sm font-semibold ${
                    bal > 0.005 ? 'text-positive-600' : bal < -0.005 ? 'text-negative-600' : 'text-slate-400'
                  }`}>
                    {bal > 0.005 ? `+${bal.toFixed(2)}` : bal < -0.005 ? bal.toFixed(2) : 'settled'}
                  </span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-400" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="card border-dashed border-2 border-slate-200 dark:border-slate-600 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <Zap size={22} className="text-brand-500" />
          </div>
          <p className="text-slate-700 dark:text-slate-200 font-semibold">No groups yet</p>
          <p className="text-slate-400 text-sm mt-1 hidden sm:block">Create a group using the sidebar to start splitting.</p>
          <p className="text-slate-400 text-sm mt-1 sm:hidden">Tap the menu icon above to create your first group.</p>
        </div>
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Recent activity</h2>
          <ActivityFeed logs={activity.slice(0, 12)} />
        </div>
      )}
    </div>
  )
}
