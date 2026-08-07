import { Receipt, CreditCard, Users, UserPlus, UserMinus, Edit3, Trash2, RefreshCw, FilePen } from 'lucide-react'

const ACTION_META = {
  create:         { label: 'added',               icon: Receipt,    color: 'bg-positive-100 text-positive-600' },
  edit:           { label: 'edited',               icon: Edit3,      color: 'bg-brand-100 text-brand-600' },
  delete:         { label: 'deleted',              icon: Trash2,     color: 'bg-negative-100 text-negative-600' },
  payment:        { label: 'recorded a payment',   icon: CreditCard, color: 'bg-amber-100 text-amber-600' },
  member_add:     { label: 'joined the group',     icon: UserPlus,   color: 'bg-teal-100 text-teal-600' },
  member_remove:  { label: 'left the group',       icon: UserMinus,  color: 'bg-slate-100 text-slate-500 dark:text-slate-400' },
  edit_request:   { label: 'requested an edit',    icon: FilePen,    color: 'bg-violet-100 text-violet-600' },
  invite:         { label: 'created an invite',    icon: Users,      color: 'bg-sky-100 text-sky-600' },
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function activityText(log) {
  const meta = ACTION_META[log.action_type] || { label: log.action_type }
  const actor = log.actor_name || 'Someone'
  const details = log.details || {}

  let subject = ''
  if (log.action_type === 'create' && details.description) subject = `"${details.description}"`
  else if (log.action_type === 'edit' && details.description) subject = `"${details.description}"`
  else if (log.action_type === 'delete' && details.description) subject = `"${details.description}"`
  else if (log.action_type === 'payment' && details.amount) subject = `${details.amount} ${details.currency || ''} → ${details.to_user || ''}`
  else if (log.action_type === 'edit_request' && details.expense) subject = `for "${details.expense}"`

  return { actor, verb: meta.label, subject }
}

export default function ActivityFeed({ logs }) {
  if (!logs?.length) {
    return (
      <div className="flex flex-col items-center py-10 text-slate-400">
        <RefreshCw size={28} className="mb-3 opacity-30" />
        <p className="text-sm">No activity yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        const meta = ACTION_META[log.action_type] || { icon: Receipt, color: 'bg-slate-100 text-slate-500 dark:text-slate-400' }
        const Icon = meta.icon
        const { actor, verb, subject } = activityText(log)
        const details = log.details || {}

        return (
          <div key={log.id} className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-xl ${meta.color} flex items-center justify-center flex-none mt-0.5`}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{actor}</span>
                {' '}<span className="text-slate-500 dark:text-slate-400">{verb}</span>
                {subject && <> <span className="font-medium text-slate-700 dark:text-slate-200">{subject}</span></>}
              </p>
              {details.amount && log.action_type !== 'payment' && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {details.currency} {parseFloat(details.amount || 0).toFixed(2)}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">{timeAgo(log.created_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
