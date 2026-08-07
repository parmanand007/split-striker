import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2, User, Mail, ChevronLeft, CheckCircle2, Zap } from 'lucide-react'
import { api } from '../api/client'
import { useCurrentUser } from '../hooks/useCurrentUser'

export default function UserSelectPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('next') || searchParams.get('redirect') || '/'
  const { login, currentUser } = useCurrentUser()
  const [step, setStep] = useState('email') // 'email' | 'signup'
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [emailError, setEmailError] = useState('')
  const [nameError, setNameError] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const emailRef = useRef()
  const nameRef = useRef()

  useEffect(() => { if (currentUser) navigate(decodeURIComponent(redirectTo), { replace: true }) }, [currentUser])
  useEffect(() => { if (step === 'email') emailRef.current?.focus() }, [step])
  useEffect(() => { if (step === 'signup') setTimeout(() => nameRef.current?.focus(), 120) }, [step])

  function validateEmail(v) {
    if (!v.trim()) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email address.'
    return ''
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    const err = validateEmail(email)
    if (err) { setEmailError(err); return }
    setEmailError('')
    setBusy(true)
    try {
      const user = await api.loginByEmail(email.trim())
      setSuccess(true)
      await new Promise(r => setTimeout(r, 500))
      login(user)
      navigate(decodeURIComponent(redirectTo), { replace: true })
    } catch (err) {
      if (err.message?.includes('No account')) {
        setStep('signup')
      } else {
        setEmailError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    if (!name.trim()) { setNameError('Name is required.'); return }
    setNameError('')
    setBusy(true)
    try {
      const user = await api.createUser(name.trim(), email.trim())
      setSuccess(true)
      await new Promise(r => setTimeout(r, 500))
      login(user)
      navigate(decodeURIComponent(redirectTo), { replace: true })
    } catch (err) {
      if (err.message?.toLowerCase().includes('email')) setEmailError(err.message)
      else setNameError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative select-none transition-colors duration-300"
      style={{ background: 'var(--login-bg)' }}>

      {/* Animated background blobs — driven by theme CSS variables */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[520px] h-[520px] rounded-full blur-[110px] animate-float-slow"
          style={{ background: 'rgba(var(--blob-a),0.25)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[420px] h-[420px] rounded-full blur-[100px] animate-float-med"
          style={{ background: 'rgba(var(--blob-b),0.2)' }} />
        <div className="absolute top-[40%] left-[30%] w-[260px] h-[260px] rounded-full blur-[80px] animate-float-fast"
          style={{ background: 'rgba(var(--blob-c),0.15)', animationDelay: '1.5s' }} />
        <div className="absolute top-[10%] left-[10%] w-[180px] h-[180px] rounded-full blur-[60px] animate-float-slow"
          style={{ background: 'rgba(var(--blob-a),0.1)', animationDelay: '3s' }} />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <div className="relative w-full max-w-sm animate-pop-scale">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center shadow-2xl shadow-brand-500/40 animate-glow-pulse">
              <Zap size={22} className="text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">Split Striker</span>
          </div>
          <p className="text-slate-400 text-sm">Split expenses. Stay friends.</p>
        </div>

        <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          {/* EMAIL STEP */}
          {step === 'email' && (
            <div className="p-7 animate-slide-up">
              <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
              <p className="text-slate-400 text-sm mb-6">Enter your email to sign in or create an account.</p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError('') }}
                    placeholder="you@gmail.com"
                    autoComplete="email"
                    style={{ background: 'rgba(0,0,0,0.35)', colorScheme: 'dark' }}
                    className={`w-full border rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500
                      focus:outline-none focus:ring-2 focus:border-brand-400 transition-all duration-200
                      ${emailError ? 'border-negative-500/70 focus:ring-negative-500/25' : 'border-white/15 focus:ring-brand-500/30'}`}
                  />
                </div>

                {emailError && (
                  <p className="text-negative-400 text-xs flex items-center gap-1.5 animate-slide-down">
                    <span className="w-1 h-1 rounded-full bg-negative-400 flex-none" />
                    {emailError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || !email.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-800
                    hover:from-brand-500 hover:to-brand-700 text-white text-sm font-bold
                    shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40
                    active:scale-[0.97] transition-all duration-200
                    disabled:opacity-40 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2 group"
                >
                  {busy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : success ? (
                    <CheckCircle2 size={16} className="text-green-300" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-600 mt-6">
                No password needed — just your email.
              </p>
            </div>
          )}

          {/* SIGN UP STEP */}
          {step === 'signup' && (
            <div className="p-7 animate-slide-up">
              <button
                onClick={() => { setStep('email'); setEmailError(''); setNameError('') }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-5 transition-colors group"
              >
                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back
              </button>

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-800/30 border border-brand-500/30 flex items-center justify-center mb-4">
                <User size={22} className="text-brand-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Create your account</h2>
              <p className="text-slate-400 text-sm mb-1">
                No account for <span className="text-slate-300 font-medium">{email}</span>
              </p>
              <p className="text-slate-500 text-xs mb-6">Enter your name to get started.</p>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    style={{ background: 'rgba(0,0,0,0.25)', colorScheme: 'dark' }}
                    className="w-full border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-400 cursor-default"
                  />
                </div>

                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setNameError('') }}
                    placeholder="Your full name"
                    autoComplete="name"
                    style={{ background: 'rgba(0,0,0,0.35)', colorScheme: 'dark' }}
                    className={`w-full border rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500
                      focus:outline-none focus:ring-2 focus:border-brand-400 transition-all duration-200
                      ${nameError ? 'border-negative-500/70 focus:ring-negative-500/25' : 'border-white/15 focus:ring-brand-500/30'}`}
                  />
                </div>

                {nameError && (
                  <p className="text-negative-400 text-xs flex items-center gap-1.5 animate-slide-down">
                    <span className="w-1 h-1 rounded-full bg-negative-400 flex-none" />
                    {nameError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || !name.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-800
                    hover:from-brand-500 hover:to-brand-700 text-white text-sm font-bold
                    shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40
                    active:scale-[0.97] transition-all duration-200
                    disabled:opacity-40 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                >
                  {busy
                    ? <><Loader2 size={15} className="animate-spin" /> Creating…</>
                    : success
                    ? <><CheckCircle2 size={15} /> Done!</>
                    : 'Create account & sign in'
                  }
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
