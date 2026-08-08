import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { api } from '../api/client'
import { useCurrentUser } from '../hooks/useCurrentUser'
import Logo from '../components/Logo'

export default function UserSelectPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('next') || searchParams.get('redirect') || '/groups'
  const { login, currentUser } = useCurrentUser()

  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const emailRef = useRef()
  const nameRef = useRef()
  const passwordRef = useRef()

  useEffect(() => {
    if (currentUser) navigate(decodeURIComponent(redirectTo), { replace: true })
  }, [currentUser])

  useEffect(() => {
    setError('')
    if (mode === 'signup') setTimeout(() => nameRef.current?.focus(), 80)
    else setTimeout(() => emailRef.current?.focus(), 80)
  }, [mode])

  function switchMode(m) {
    setMode(m)
    setError('')
    setPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Fall back to DOM value — browser autofill fills the input visually
    // but doesn't trigger onChange, leaving React state empty
    const emailVal = (email || emailRef.current?.value || '').trim()
    const passwordVal = password || passwordRef.current?.value || ''
    const nameVal = (name || nameRef.current?.value || '').trim()

    if (!emailVal) return setError('Email is required.')
    if (!passwordVal) return setError('Password is required.')
    if (mode === 'signup' && !nameVal) return setError('Name is required.')

    setBusy(true)
    try {
      let result
      if (mode === 'login') {
        result = await api.authLogin(emailVal, passwordVal)
      } else {
        result = await api.authSignup(nameVal, emailVal, passwordVal)
      }
      login(result.user, result.token)
      navigate(decodeURIComponent(redirectTo), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const inputCls = (hasErr) =>
    `w-full border rounded-2xl pl-10 pr-4 py-3.5 text-white placeholder:text-slate-500
     focus:outline-none focus:ring-2 focus:border-brand-400 transition-all duration-200
     ${hasErr ? 'border-negative-500/70 focus:ring-negative-500/25' : 'border-white/15 focus:ring-brand-500/30'}`

  // font-size 16px prevents iOS zoom-on-focus (browser zooms when < 16px)
  const inputStyle = { background: 'rgba(0,0,0,0.35)', colorScheme: 'dark', fontSize: '16px' }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative select-none"
      style={{ background: 'linear-gradient(145deg, #080d14 0%, #0e1825 55%, #080d14 100%)' }}
    >
      {/* Themed colour blobs — give each theme its identity even on the dark base */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[520px] h-[520px] rounded-full blur-[120px] animate-float-slow"
          style={{ background: 'rgba(var(--blob-a),0.30)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[420px] h-[420px] rounded-full blur-[110px] animate-float-med"
          style={{ background: 'rgba(var(--blob-b),0.22)' }} />
        <div className="absolute top-[40%] left-[30%] w-[260px] h-[260px] rounded-full blur-[80px] animate-float-fast"
          style={{ background: 'rgba(var(--blob-c),0.15)', animationDelay: '1.5s' }} />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <div className="relative w-full max-w-sm animate-pop-scale">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" />
          <p className="text-slate-400 text-sm mt-3">Split expenses. Stay friends.</p>
        </div>

        <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Mode tabs */}
          <div className="flex border-b border-white/10">
            {['login', 'signup'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'text-white border-b-2 border-brand-400 -mb-px'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <div className="p-7 animate-slide-up" key={mode}>
            {mode === 'login' ? (
              <>
                <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
                <p className="text-slate-400 text-sm mb-6">Sign in to your account.</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-1">Create account</h2>
                <p className="text-slate-400 text-sm mb-6">Join Split Striker free.</p>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 dark-form">
              {/* Name — signup only */}
              {mode === 'signup' && (
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setError('') }}
                    placeholder="Full name"
                    autoComplete="name"
                    style={inputStyle}
                    className={inputCls(error && !name.trim())}
                  />
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  onFocus={e => { if (!email && e.target.value) setEmail(e.target.value) }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={inputStyle}
                  className={inputCls(false)}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  ref={passwordRef}
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onFocus={e => { if (!password && e.target.value) setPassword(e.target.value) }}
                  placeholder="Password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={inputStyle}
                  className={`${inputCls(false)} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {error && (
                <p className="text-negative-400 text-xs flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-negative-400 flex-none" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-800
                  hover:from-brand-500 hover:to-brand-700 text-white text-sm font-bold
                  shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40
                  active:scale-[0.97] transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 group mt-1"
              >
                {busy
                  ? <Loader2 size={16} className="animate-spin" />
                  : mode === 'login'
                  ? <><span>Sign in</span><ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></>
                  : <span>Create account</span>
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
