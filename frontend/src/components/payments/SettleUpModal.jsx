import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, Loader2, PartyPopper, ToggleLeft, ToggleRight, ChevronLeft } from 'lucide-react'
import { api } from '../../api/client'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import Modal from '../ui/Modal'

function BalanceBar({ label, value, isYou }) {
  const abs = Math.abs(value)
  const positive = value > 0.005
  const negative = value < -0.005
  return (
    <div className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${isYou ? 'bg-slate-50 border border-slate-200' : ''}`}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
          ${positive ? 'bg-positive-100 text-positive-700' : negative ? 'bg-negative-100 text-negative-700' : 'bg-slate-100 text-slate-500'}`}>
          {label.charAt(0).toUpperCase()}
        </div>
        <span className={`text-sm ${isYou ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
          {label}{isYou ? ' (you)' : ''}
        </span>
      </div>
      <span className={`text-sm font-bold ${positive ? 'text-positive-600' : negative ? 'text-negative-600' : 'text-slate-400'}`}>
        {positive ? `+${abs.toFixed(2)}` : negative ? `-${abs.toFixed(2)}` : 'settled'}
      </span>
    </div>
  )
}

function PaymentRow({ settlement, isMine, onPay, currency }) {
  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      isMine ? 'border-brand-200 bg-brand-50/50' : 'border-slate-100 bg-white'
    }`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={`text-sm font-semibold truncate ${isMine ? 'text-negative-600' : 'text-slate-700'}`}>
            {settlement.from_user_name}
          </span>
          <div className="flex items-center gap-1 flex-none text-slate-300">
            <div className="w-8 h-px bg-slate-300" />
            <ArrowRight size={14} className="text-slate-400" />
          </div>
          <span className={`text-sm font-semibold truncate ${!isMine && settlement.to_user_id ? 'text-slate-700' : 'text-positive-600'}`}>
            {settlement.to_user_name}
          </span>
        </div>
        <div className="text-right flex-none flex items-center gap-3">
          <div>
            <p className="text-base font-bold text-slate-800">{parseFloat(settlement.amount).toFixed(2)}</p>
            <p className="text-xs text-slate-400">{currency}</p>
          </div>
          {isMine && (
            <button
              onClick={() => onPay(settlement)}
              className="btn-primary py-1.5 text-xs"
            >
              Pay
            </button>
          )}
        </div>
      </div>
      {isMine && (
        <p className="text-xs text-brand-500 mt-2 font-medium">
          → This is your debt. Click Pay to record the payment.
        </p>
      )}
    </div>
  )
}

export default function SettleUpModal({ group, onClose, onSettled }) {
  const { currentUser } = useCurrentUser()
  const [plan, setPlan] = useState(null)
  const [balances, setBalances] = useState(null)
  const [step, setStep] = useState('overview') // 'overview' | 'pay'
  const [paying, setPaying] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payNote, setPayNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { reload() }, [])

  async function reload() {
    const [p, b] = await Promise.all([api.getSettlement(group.id), api.getBalances(group.id)])
    setPlan(p)
    setBalances(b)
  }

  async function recordPayment() {
    setSaving(true)
    setError('')
    try {
      await api.createPayment(group.id, {
        from_user_id: paying.from_user_id,
        to_user_id: paying.to_user_id,
        amount: parseFloat(payAmount),
        currency: group.currency,
        date: payDate,
        note: payNote || null,
        actor_user_id: currentUser.id,
      })
      setDone(true)
      await reload()
      onSettled?.()
      setTimeout(() => { setDone(false); setStep('overview'); setPaying(null); setPayAmount('') }, 1800)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const mySettlements = plan?.settlements?.filter(s => s.from_user_id === currentUser.id) || []
  const otherSettlements = plan?.settlements?.filter(s => s.from_user_id !== currentUser.id) || []
  const allSettled = plan?.settlements?.length === 0

  return (
    <Modal title={step === 'pay' ? 'Record payment' : 'Settle Up'} onClose={onClose} wide>
      {/* Step: overview */}
      {step === 'overview' && (
        <div className="space-y-5">
          {/* Balance summary */}
          {balances && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current balances</p>
              {balances.balances.map(b => (
                <BalanceBar
                  key={b.user_id}
                  label={b.user_name}
                  value={parseFloat(b.balance)}
                  isYou={b.user_id === currentUser.id}
                />
              ))}
            </div>
          )}

          {/* Simplify toggle */}
          <div className="flex items-center justify-between py-3 border-t border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-700">
                {plan?.simplify_debts ? 'Simplified plan' : 'Raw pairwise debts'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {plan?.simplify_debts ? 'Minimum transactions to settle' : 'Exact debt between each pair'}
              </p>
            </div>
            <button
              onClick={() => api.updateGroup(group.id, { simplify_debts: !plan?.simplify_debts }).then(reload)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
            >
              {plan?.simplify_debts
                ? <ToggleRight size={18} className="text-brand-600" />
                : <ToggleLeft size={18} className="text-slate-400" />
              }
              <span className="text-xs font-medium text-slate-600">Simplify</span>
            </button>
          </div>

          {/* Settlement plan */}
          {allSettled ? (
            <div className="text-center py-10">
              <PartyPopper size={36} className="mx-auto text-positive-500 mb-3" />
              <p className="text-base font-semibold text-slate-800">All settled up!</p>
              <p className="text-sm text-slate-400 mt-1">No outstanding debts in this group.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Settlement plan</p>

              {/* My debts first */}
              {mySettlements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-brand-600">Your payments</p>
                  {mySettlements.map((s, i) => (
                    <PaymentRow
                      key={i}
                      settlement={s}
                      isMine={true}
                      currency={group.currency}
                      onPay={(s) => { setPaying(s); setPayAmount(s.amount); setStep('pay') }}
                    />
                  ))}
                </div>
              )}

              {/* Others */}
              {otherSettlements.length > 0 && (
                <div className="space-y-2">
                  {mySettlements.length > 0 && <p className="text-xs font-semibold text-slate-400">Other payments</p>}
                  {otherSettlements.map((s, i) => (
                    <PaymentRow
                      key={i}
                      settlement={s}
                      isMine={false}
                      currency={group.currency}
                      onPay={() => {}}
                    />
                  ))}
                  {mySettlements.length === 0 && (
                    <p className="text-xs text-slate-400 px-1">You have no pending payments. You can record payments on behalf of others above if needed.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step: pay */}
      {step === 'pay' && paying && (
        <div className="space-y-5">
          <button
            onClick={() => { setStep('overview'); setPaying(null); setError('') }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft size={16} /> Back to overview
          </button>

          {/* Visual payment flow */}
          <div className="bg-gradient-to-r from-negative-50 to-positive-50 rounded-2xl p-5 flex items-center gap-4">
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-full bg-negative-100 flex items-center justify-center text-negative-700 font-bold text-lg mx-auto mb-1">
                {paying.from_user_name?.charAt(0)}
              </div>
              <p className="text-sm font-semibold text-negative-700">{paying.from_user_name}</p>
              <p className="text-xs text-slate-400">sends</p>
            </div>
            <div className="text-center flex-none">
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <div className="w-6 h-px bg-slate-300" />
                <ArrowRight size={16} />
                <div className="w-6 h-px bg-slate-300" />
              </div>
              <p className="text-lg font-black text-slate-800">{group.currency} {parseFloat(paying.amount).toFixed(2)}</p>
            </div>
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-full bg-positive-100 flex items-center justify-center text-positive-700 font-bold text-lg mx-auto mb-1">
                {paying.to_user_name?.charAt(0)}
              </div>
              <p className="text-sm font-semibold text-positive-700">{paying.to_user_name}</p>
              <p className="text-xs text-slate-400">receives</p>
            </div>
          </div>

          {done ? (
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 size={40} className="text-positive-500 mb-3" />
              <p className="text-base font-semibold text-slate-800">Payment recorded!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Amount ({group.currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paying.amount}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="input"
                  />
                  <p className="text-xs text-slate-400 mt-1">Full: {parseFloat(paying.amount).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date</label>
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Note <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  className="input"
                  placeholder="e.g. via UPI, bank transfer…"
                />
              </div>
              {error && <p className="text-negative-600 text-xs bg-negative-50 px-3 py-2 rounded-lg">{error}</p>}
              <button
                onClick={recordPayment}
                disabled={saving || !payAmount || parseFloat(payAmount) <= 0}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {saving ? 'Recording…' : `Confirm — ${group.currency} ${parseFloat(payAmount || 0).toFixed(2)}`}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
