import { useState } from 'react'
import {
  UtensilsCrossed, Hotel, Car, ShoppingBag, Film, Zap, Package,
  Edit3, Trash2, FilePen, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react'
import { api } from '../../api/client'
import { useCurrentUser } from '../../hooks/useCurrentUser'

const CATEGORY_META = {
  'Food & Drink':    { icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-600' },
  'Accommodation':   { icon: Hotel,           color: 'bg-sky-100 text-sky-600' },
  'Transport':       { icon: Car,             color: 'bg-violet-100 text-violet-600' },
  'Shopping':        { icon: ShoppingBag,     color: 'bg-rose-100 text-rose-600' },
  'Entertainment':   { icon: Film,            color: 'bg-pink-100 text-pink-600' },
  'Utilities':       { icon: Zap,             color: 'bg-yellow-100 text-yellow-600' },
  'Other':           { icon: Package,         color: 'bg-slate-100 text-slate-500 dark:text-slate-400' },
}

function DEFAULT_ICON() { return { icon: Package, color: 'bg-slate-100 text-slate-500 dark:text-slate-400' } }

export default function ExpenseItem({ expense, members, group, onEdit, onDeleted, onRequestEdit }) {
  const { currentUser } = useCurrentUser()
  const [deleting, setDeleting] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const isOwner = group?.created_by_id === currentUser?.id
  const memberMap = Object.fromEntries(members.map(m => [String(m.id), m.name]))
  const myShare = parseFloat(expense.split_amounts[String(currentUser.id)] || 0)
  const myPaid = parseFloat(expense.paid_by[String(currentUser.id)] || 0)
  const myNet = myPaid - myShare

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.deleteExpense(expense.id, currentUser.id)
      onDeleted(expense.id)
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const catMeta = CATEGORY_META[expense.category] || DEFAULT_ICON()
  const Icon = catMeta.icon
  const payers = Object.entries(expense.paid_by)
  const isMultiPayer = payers.length > 1

  return (
    <div className={`card transition-all duration-150 ${expense.deleted ? 'opacity-40' : 'hover:shadow-card-hover'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Category icon */}
          <div className={`w-10 h-10 rounded-xl ${catMeta.color} flex items-center justify-center flex-none`}>
            <Icon size={18} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">{expense.description}</h3>
                  {expense.is_negative && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">REFUND</span>
                  )}
                  {expense.recurrence_rule && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded-md flex items-center gap-0.5">
                      <RefreshCw size={9} /> RECURRING
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {expense.date}
                  {expense.category ? ` · ${expense.category}` : ''}
                </p>
              </div>
              <div className="text-right flex-none">
                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {expense.original_currency} {parseFloat(expense.original_amount).toFixed(2)}
                </div>
                {expense.original_currency !== (group?.currency || 'INR') && expense.fx_rate !== '1' && (
                  <div className="text-xs text-slate-400">≈ {parseFloat(expense.total_amount).toFixed(2)}</div>
                )}
              </div>
            </div>

            {/* Who paid */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {isMultiPayer
                ? `${payers.map(([uid, amt]) => `${memberMap[uid] || uid} (${parseFloat(amt).toFixed(2)})`).join(', ')}`
                : `Paid by ${memberMap[payers[0]?.[0]] || '?'}`
              }
            </p>
          </div>
        </div>

        {/* My share strip */}
        {Math.abs(myShare) > 0.005 && (
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-50">
            <span className="text-xs text-slate-400">Your share: {myShare.toFixed(2)}</span>
            {Math.abs(myNet) > 0.005 ? (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                myNet > 0 ? 'badge-positive' : 'badge-negative'
              }`}>
                {myNet > 0
                  ? `you're owed ${myNet.toFixed(2)}`
                  : `you owe ${Math.abs(myNet).toFixed(2)}`
                }
              </span>
            ) : (
              <span className="badge-neutral">your share paid</span>
            )}
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
          <p className="mt-2 text-xs text-slate-400 italic border-t border-slate-50 pt-2">
            {expense.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {!expense.deleted && (
        <div className="px-4 py-2.5 border-t border-slate-50 flex items-center gap-1">
          {isOwner ? (
            <>
              <button
                onClick={() => onEdit(expense)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
              >
                <Edit3 size={12} /> Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-negative-600 px-2 py-1 rounded-lg hover:bg-negative-50 transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} /> {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </>
          ) : (
            <button
              onClick={() => onRequestEdit && onRequestEdit(expense)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-violet-600 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors"
            >
              <FilePen size={12} /> Request edit
            </button>
          )}
          <button
            onClick={() => setShowDetail(v => !v)}
            className="ml-auto flex items-center gap-1 text-xs text-slate-300 hover:text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg transition-colors"
          >
            {showDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showDetail ? 'Less' : 'Details'}
          </button>
        </div>
      )}

      {/* Expanded detail */}
      {showDetail && (
        <div className="px-4 pb-4 border-t border-slate-50 pt-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Split breakdown</p>
            {Object.entries(expense.split_amounts).map(([uid, amt]) => {
              const paid = parseFloat(expense.paid_by[uid] || 0)
              const owed = parseFloat(amt)
              const net = paid - owed
              return (
                <div key={uid} className="flex items-center justify-between">
                  <span className={uid === String(currentUser.id) ? 'font-semibold text-slate-700 dark:text-slate-200' : ''}>
                    {memberMap[uid] || `User ${uid}`}{uid === String(currentUser.id) ? ' (you)' : ''}
                  </span>
                  <span className={`font-medium ${
                    net > 0.005 ? 'text-positive-600' : net < -0.005 ? 'text-negative-600' : 'text-slate-400'
                  }`}>
                    {net > 0.005 ? `+${net.toFixed(2)}` : net < -0.005 ? net.toFixed(2) : 'even'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
