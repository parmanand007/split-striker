import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Settings, Plus, HandCoins, FilePen, X } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { api } from '../api/client'
import { useCurrentUser } from '../hooks/useCurrentUser'
import ExpenseForm from '../components/expenses/ExpenseForm'
import ExpenseItem from '../components/expenses/ExpenseItem'
import SettleUpModal from '../components/payments/SettleUpModal'
import ActivityFeed from '../components/activity/ActivityFeed'

const TABS = ['Expenses', 'Balances', 'Activity']

function SkeletonGroup() {
  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-pulse">
      <div className="h-8 skeleton w-48" />
      <div className="h-16 skeleton rounded-2xl" />
      <div className="h-10 skeleton rounded-xl" />
      {[1,2,3].map(i => <div key={i} className="h-28 skeleton rounded-2xl" />)}
    </div>
  )
}

function RequestEditModal({ expense, group, onClose }) {
  const { currentUser } = useCurrentUser()
  const [description, setDescription] = useState(expense.description)
  const [category, setCategory] = useState(expense.category || '')
  const [notes, setNotes] = useState(expense.notes || '')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    const changes = {}
    if (description !== expense.description) changes.description = description
    if (category !== (expense.category || '')) changes.category = category
    if (notes !== (expense.notes || '')) changes.notes = notes
    if (Object.keys(changes).length === 0) return setError('No changes made.')

    setSubmitting(true)
    try {
      await api.createEditRequest(expense.id, {
        requested_by_id: currentUser.id,
        proposed_changes: changes,
        message: message || null,
      })
      setDone(true)
      setTimeout(onClose, 1800)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-modal w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FilePen size={18} className="text-violet-600" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Request edit</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-positive-100 flex items-center justify-center mx-auto mb-3">
              <FilePen size={22} className="text-positive-600" />
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">Request sent!</p>
            <p className="text-sm text-slate-400 mt-1">The group owner will review your request.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs text-slate-500 dark:text-slate-400">
              Editing: <span className="font-semibold text-slate-700 dark:text-slate-200">"{expense.description}"</span>
              <br />Your changes will be sent to the group owner for approval.
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                <option value="">— none —</option>
                {['Food & Drink','Accommodation','Transport','Shopping','Entertainment','Utilities','Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Add context…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Message to owner <span className="font-normal text-slate-400">(optional)</span></label>
              <input value={message} onChange={e => setMessage(e.target.value)} className="input" placeholder="Why are you requesting this change?" />
            </div>
            {error && <p className="text-negative-600 text-xs bg-negative-50 px-3 py-2 rounded-lg">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {submitting ? <Spinner size="xs" /> : <FilePen size={15} />}
              {submitting ? 'Sending…' : 'Send request to owner'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function GroupPage() {
  const { id } = useParams()
  const { currentUser } = useCurrentUser()
  const [group, setGroup] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [balances, setBalances] = useState(null)
  const [activity, setActivity] = useState([])
  const [tab, setTab] = useState('Expenses')
  const [showAdd, setShowAdd] = useState(false)
  const [editExpense, setEditExpense] = useState(null)
  const [requestEditExpense, setRequestEditExpense] = useState(null)
  const [showSettle, setShowSettle] = useState(false)
  const [loading, setLoading] = useState(true)

  async function reload() {
    const [g, e, b, a] = await Promise.all([
      api.getGroup(id),
      api.getExpenses(id),
      api.getBalances(id),
      api.getGroupActivity(id),
    ])
    setGroup(g)
    setExpenses(e)
    setBalances(b)
    setActivity(a)
    setLoading(false)
    window.dispatchEvent(new Event('expense-updated'))
  }

  useEffect(() => { reload() }, [id])

  if (loading) return <SkeletonGroup />
  if (!group) return <div className="text-negative-600 text-sm p-8">Group not found.</div>

  const isOwner = group.created_by_id === currentUser.id
  const isMember = group.members.some(m => m.id === currentUser.id)
  const myBalance = balances?.balances.find(b => b.user_id === currentUser.id)
  const myBal = parseFloat(myBalance?.balance || 0)

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {group.emoji && <span className="text-2xl flex-none">{group.emoji}</span>}
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">{group.name}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>{group.currency}</span>
            <span>·</span>
            <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
            {group.archived && <span className="badge-neutral">archived</span>}
            {isOwner && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">owner</span>}
          </div>
        </div>
        <div className="flex gap-2 items-center flex-none">
          {!group.archived && isMember && (
            <>
              <button onClick={() => setShowSettle(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
                <HandCoins size={15} /> Settle up
              </button>
              <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm">
                <Plus size={15} /> Add expense
              </button>
            </>
          )}
          <Link to={`/groups/${id}/settings`} className="btn-ghost p-2">
            <Settings size={16} />
          </Link>
        </div>
      </div>

      {/* My balance banner */}
      {isMember && Math.abs(myBal) > 0.005 && (
        <div className={`rounded-2xl p-4 border ${
          myBal > 0
            ? 'bg-positive-50 border-positive-200'
            : 'bg-negative-50 border-negative-200'
        }`}>
          <p className={`text-sm font-semibold ${myBal > 0 ? 'text-positive-700' : 'text-negative-700'}`}>
            {myBal > 0
              ? `You are owed ${group.currency} ${myBal.toFixed(2)}`
              : `You owe ${group.currency} ${Math.abs(myBal).toFixed(2)}`
            }
          </p>
          {myBal < 0 && (
            <button
              onClick={() => setShowSettle(true)}
              className="mt-1.5 text-xs text-negative-600 font-medium hover:underline"
            >
              Settle up →
            </button>
          )}
        </div>
      )}
      {isMember && Math.abs(myBal) <= 0.005 && expenses.length > 0 && (
        <div className="rounded-2xl p-4 bg-positive-50 border border-positive-200">
          <p className="text-sm font-semibold text-positive-700">You're all settled up! 🎉</p>
        </div>
      )}

      {/* Members pills */}
      <div className="flex flex-wrap gap-2">
        {group.members.map(m => {
          const b = balances?.balances.find(x => x.user_id === m.id)
          const bal = parseFloat(b?.balance || 0)
          return (
            <div
              key={m.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                m.id === currentUser.id
                  ? 'bg-brand-50 border-brand-200 text-brand-700'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{m.name}</span>
              {m.id === group.created_by_id && <span className="text-[9px] font-bold text-amber-500">★</span>}
              {Math.abs(bal) > 0.005 && (
                <span className={`font-bold ${bal > 0 ? 'text-positive-600' : 'text-negative-600'}`}>
                  {bal > 0 ? `+${bal.toFixed(0)}` : bal.toFixed(0)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-600">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
            }`}
          >
            {t}
            {t === 'Expenses' && expenses.length > 0 && (
              <span className="ml-1.5 text-xs bg-slate-100 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                {expenses.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Expenses tab */}
      {tab === 'Expenses' && (
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <div className="card border-dashed border-2 border-slate-200 dark:border-slate-600 p-12 text-center">
              <div className="text-4xl mb-3">💸</div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No expenses yet</p>
              {!group.archived && isMember && (
                <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 text-sm">
                  Add the first expense
                </button>
              )}
            </div>
          ) : (
            expenses.map(e => (
              <ExpenseItem
                key={e.id}
                expense={e}
                members={group.members}
                group={group}
                onEdit={setEditExpense}
                onDeleted={expId => { setExpenses(prev => prev.filter(x => x.id !== expId)); reload() }}
                onRequestEdit={setRequestEditExpense}
              />
            ))
          )}
        </div>
      )}

      {/* Balances tab */}
      {tab === 'Balances' && (
        <div className="card p-5 space-y-2">
          {balances?.balances.length === 0 ? (
            <p className="text-sm text-slate-400">No balances to show.</p>
          ) : (
            balances?.balances.map(b => {
              const val = parseFloat(b.balance)
              return (
                <div key={b.user_id} className={`flex items-center justify-between p-3 rounded-xl ${b.user_id === currentUser.id ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {b.user_name}
                    {b.user_id === currentUser.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                  </span>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${
                      val > 0.005 ? 'text-positive-600' : val < -0.005 ? 'text-negative-600' : 'text-slate-400'
                    }`}>
                      {val > 0.005 ? `+${group.currency} ${val.toFixed(2)}`
                        : val < -0.005 ? `-${group.currency} ${Math.abs(val).toFixed(2)}`
                        : 'settled up'}
                    </span>
                    {val > 0.005 && <p className="text-xs text-slate-400">is owed</p>}
                    {val < -0.005 && <p className="text-xs text-slate-400">owes</p>}
                  </div>
                </div>
              )
            })
          )}
          {!group.archived && isMember && (
            <button
              onClick={() => setShowSettle(true)}
              className="w-full mt-2 py-2.5 border border-brand-200 text-brand-600 text-sm font-semibold rounded-xl hover:bg-brand-50 transition-colors"
            >
              See settlement plan →
            </button>
          )}
        </div>
      )}

      {/* Activity tab */}
      {tab === 'Activity' && (
        <div className="card p-5">
          <ActivityFeed logs={activity} />
        </div>
      )}

      {/* Modals */}
      {(showAdd || editExpense) && (
        <ExpenseForm
          group={group}
          expense={editExpense}
          onClose={() => { setShowAdd(false); setEditExpense(null) }}
          onSaved={() => { setShowAdd(false); setEditExpense(null); reload() }}
        />
      )}
      {showSettle && (
        <SettleUpModal group={group} onClose={() => setShowSettle(false)} onSettled={reload} />
      )}
      {requestEditExpense && (
        <RequestEditModal
          expense={requestEditExpense}
          group={group}
          onClose={() => setRequestEditExpense(null)}
        />
      )}
    </div>
  )
}
