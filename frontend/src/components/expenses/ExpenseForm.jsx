import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import Modal from '../ui/Modal'

const CATEGORIES = ['Food & Drink', 'Accommodation', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Other']
const SPLIT_TYPES = [
  { value: 'equal', label: 'Equal' },
  { value: 'exact', label: 'Exact amounts' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'shares', label: 'Shares' },
]

export default function ExpenseForm({ group, onClose, onSaved, expense }) {
  const { currentUser } = useCurrentUser()
  const members = group.members
  const isEditing = !!expense

  const [desc, setDesc] = useState(expense?.description || '')
  const [amount, setAmount] = useState(expense ? String(parseFloat(expense.original_amount)) : '')
  const [currency, setCurrency] = useState(expense?.original_currency || group.currency)
  const [fxRate, setFxRate] = useState(expense ? expense.fx_rate : '1')
  const [category, setCategory] = useState(expense?.category || '')
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0])
  const [isNegative, setIsNegative] = useState(expense?.is_negative || false)
  const [recurrenceRule, setRecurrenceRule] = useState(expense?.recurrence_rule || 'none')
  const [recurrenceEnd, setRecurrenceEnd] = useState(expense?.recurrence_end_date || '')

  // Payers
  const [paidBy, setPaidBy] = useState(() => {
    if (expense?.paid_by) {
      return Object.fromEntries(Object.entries(expense.paid_by).map(([k, v]) => [k, v]))
    }
    return { [String(currentUser.id)]: '' }
  })
  const [multiplePayers, setMultiplePayers] = useState(
    expense ? Object.keys(expense.paid_by || {}).length > 1 : false
  )

  // Split
  const [splitType, setSplitType] = useState(expense?.split_type || 'equal')
  const [splitAmong, setSplitAmong] = useState(() => {
    if (expense?.split_amounts) return Object.keys(expense.split_amounts).map(Number)
    return members.map((m) => m.id)
  })
  const [splitDetails, setSplitDetails] = useState(() => {
    if (expense?.split_raw) {
      return Object.fromEntries(Object.entries(expense.split_raw).map(([k, v]) => [k, v]))
    }
    return {}
  })

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dupWarning, setDupWarning] = useState(null)

  const needsFx = currency !== group.currency
  const totalInGroup = needsFx ? parseFloat(amount || 0) * parseFloat(fxRate || 1) : parseFloat(amount || 0)

  // Duplicate check
  useEffect(() => {
    if (!desc || !amount || isEditing) return
    const t = setTimeout(() => {
      api.checkDuplicate(group.id, {
        description: desc,
        amount: parseFloat(amount),
        payer_id: Object.keys(paidBy)[0],
      }).then((r) => setDupWarning(r.is_duplicate ? r.message : null)).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [desc, amount])

  function toggleMember(id) {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function togglePayer(id) {
    setPaidBy((prev) => {
      const next = { ...prev }
      const sid = String(id)
      if (next[sid] !== undefined) {
        delete next[sid]
      } else {
        next[sid] = ''
      }
      return next
    })
  }

  function buildPayload(force = false) {
    const parsedAmt = parseFloat(amount)
    if (!desc.trim()) throw new Error('Description is required.')
    if (isNaN(parsedAmt) || parsedAmt === 0) throw new Error('Enter a valid amount.')
    if (splitAmong.length === 0) throw new Error('Select at least one person to split with.')

    // Build paid_by
    let paidByPayload
    if (!multiplePayers) {
      const payerId = Object.keys(paidBy)[0]
      paidByPayload = { [payerId]: isNegative ? -Math.abs(parsedAmt) : parsedAmt }
    } else {
      paidByPayload = {}
      let sum = 0
      for (const [k, v] of Object.entries(paidBy)) {
        const val = parseFloat(v)
        if (isNaN(val) || val <= 0) throw new Error(`Invalid paid amount for user ${k}.`)
        paidByPayload[k] = val
        sum += val
      }
      if (Math.abs(sum - Math.abs(parsedAmt)) > 0.005) {
        throw new Error(`Paid amounts sum to ${sum.toFixed(2)}, but total is ${Math.abs(parsedAmt).toFixed(2)}.`)
      }
      if (isNegative) {
        for (const k of Object.keys(paidByPayload)) paidByPayload[k] = -paidByPayload[k]
      }
    }

    // Build split_details
    let detailsPayload = null
    if (splitType !== 'equal') {
      detailsPayload = {}
      for (const id of splitAmong) {
        const val = parseFloat(splitDetails[String(id)] || 0)
        if (isNaN(val)) throw new Error(`Invalid split value for user ${id}.`)
        detailsPayload[String(id)] = val
      }
    }

    return {
      description: desc.trim(),
      original_amount: isNegative ? -Math.abs(parsedAmt) : parsedAmt,
      original_currency: currency,
      fx_rate: parseFloat(fxRate) || 1,
      paid_by: paidByPayload,
      split_type: splitType,
      split_among: splitAmong,
      split_details: detailsPayload,
      category: category || null,
      date,
      is_negative: isNegative,
      actor_user_id: currentUser.id,
      recurrence_rule: recurrenceRule !== 'none' ? recurrenceRule : null,
      recurrence_end_date: recurrenceEnd || null,
    }
  }

  async function submit(e, force = false) {
    e?.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = buildPayload(force)
      let result
      if (isEditing) {
        result = await api.updateExpense(expense.id, payload)
      } else {
        result = await api.createExpense(group.id, payload)
      }
      onSaved(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const memberMap = Object.fromEntries(members.map((m) => [String(m.id), m.name]))

  return (
    <Modal title={isEditing ? 'Edit Expense' : 'Add Expense'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Description</label>
          <input
            autoFocus
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="input"
            placeholder="e.g. Dinner at Rustom's"
          />
          {dupWarning && (
            <p className="mt-1 text-amber-600 text-xs">⚠ {dupWarning}</p>
          )}
        </div>

        {/* Amount + currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Currency</label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
              className="input uppercase"
              maxLength={3}
            />
          </div>
        </div>

        {/* FX rate */}
        {needsFx && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <label className="block text-sm font-medium text-amber-800 mb-1">
              Exchange rate: 1 {currency} = ? {group.currency}
            </label>
            <input
              type="number"
              step="0.0001"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
              className="input"
              placeholder="e.g. 83"
            />
            <p className="mt-1 text-xs text-amber-700">
              ≈ {group.currency} {totalInGroup.toFixed(2)} will be used for balance calculations.
            </p>
          </div>
        )}

        {/* Negative/refund */}
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
          <input type="checkbox" checked={isNegative} onChange={(e) => setIsNegative(e.target.checked)} className="accent-brand-600" />
          This is a refund / adjustment (negative amount)
        </label>

        {/* Paid by */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Paid by</label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" checked={multiplePayers} onChange={(e) => setMultiplePayers(e.target.checked)} className="accent-brand-600" />
              Multiple payers
            </label>
          </div>
          {!multiplePayers ? (
            <select
              value={Object.keys(paidBy)[0] || ''}
              onChange={(e) => setPaidBy({ [e.target.value]: '' })}
              className="input"
            >
              {members.map((m) => (
                <option key={m.id} value={String(m.id)}>{m.name}{m.id === currentUser.id ? ' (you)' : ''}</option>
              ))}
            </select>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const sid = String(m.id)
                const checked = paidBy[sid] !== undefined
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <input type="checkbox" checked={checked} onChange={() => togglePayer(m.id)} className="accent-brand-600" />
                    <span className="text-sm w-28 truncate">{m.name}</span>
                    {checked && (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paidBy[sid] || ''}
                        onChange={(e) => setPaidBy((prev) => ({ ...prev, [sid]: e.target.value }))}
                        className="input flex-1"
                        placeholder="0.00"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Split type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Split type</label>
          <div className="flex gap-2 flex-wrap">
            {SPLIT_TYPES.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setSplitType(st.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  splitType === st.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Split among */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Split among</label>
          <div className="space-y-1">
            {members.map((m) => {
              const sid = String(m.id)
              const included = splitAmong.includes(m.id)
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => toggleMember(m.id)}
                    className="accent-brand-600"
                  />
                  <span className="text-sm w-28 truncate">{m.name}{m.id === currentUser.id ? ' (you)' : ''}</span>
                  {splitType !== 'equal' && included && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={splitDetails[sid] || ''}
                      onChange={(e) => setSplitDetails((prev) => ({ ...prev, [sid]: e.target.value }))}
                      className="input flex-1"
                      placeholder={
                        splitType === 'percentage' ? '%' :
                        splitType === 'shares' ? 'shares' : '0.00'
                      }
                    />
                  )}
                  {splitType !== 'equal' && included && (
                    <span className="text-xs text-slate-400 w-12">
                      {splitType === 'percentage' ? '%' : splitType === 'shares' ? 'shares' : group.currency}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {splitType === 'equal' && splitAmong.length > 0 && totalInGroup > 0 && (
            <p className="mt-2 text-xs text-slate-400">
              Each person pays {group.currency} {(totalInGroup / splitAmong.length).toFixed(2)} (approx.)
            </p>
          )}
        </div>

        {/* Category + date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">— none —</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
        </div>

        {/* Recurrence */}
        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Repeat</label>
            <div className="flex gap-2 items-center">
              <select
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value)}
                className="input flex-1"
              >
                <option value="none">One time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              {recurrenceRule !== 'none' && (
                <input
                  type="date"
                  value={recurrenceEnd}
                  onChange={(e) => setRecurrenceEnd(e.target.value)}
                  className="input flex-1"
                  placeholder="End date"
                />
              )}
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-100 text-center sm:text-left">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
