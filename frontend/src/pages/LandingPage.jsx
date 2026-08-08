import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useCurrentUser'
import Logo from '../components/Logo'
import {
  ArrowRight, Users, Shield, Globe, Bell, BarChart3, Link2,
  CheckCircle2, Zap, ChevronRight,
} from 'lucide-react'

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true) },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = '', prefix = '', inView }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    let start = null
    const duration = 1400
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setN(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, target])
  return <>{prefix}{n.toLocaleString()}{suffix}</>
}

// ─── App preview mockup ───────────────────────────────────────────────────────
function AppPreview() {
  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0 select-none">
      {/* Main card */}
      <div
        className="relative z-10 rounded-3xl p-5 shadow-2xl border border-white/10"
        style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-lg flex-none">
            🏖️
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Goa Trip 2026</p>
            <p className="text-slate-400 text-xs">4 members · 6 expenses</p>
          </div>
        </div>

        <div className="space-y-1 mb-4">
          {[
            { icon: '🍽️', name: 'Beach dinner', who: 'You paid', amount: '₹2,800' },
            { icon: '🏄', name: 'Surfing lesson', who: 'Alex paid', amount: '₹1,500' },
            { icon: '🚕', name: 'Airport cab', who: 'Maya paid', amount: '₹650' },
          ].map((e) => (
            <div key={e.name} className="flex items-center gap-3 py-2 border-b border-white/[0.06] last:border-0">
              <span className="text-base flex-none">{e.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{e.name}</p>
                <p className="text-slate-500 text-[10px]">{e.who}</p>
              </div>
              <span className="text-slate-300 text-xs font-semibold flex-none">{e.amount}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Your balances</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Alex owes you</span>
              <span className="text-xs font-bold text-emerald-400">+₹933</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Maya owes you</span>
              <span className="text-xs font-bold text-emerald-400">+₹717</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating settle badge */}
      <div
        className="landing-float-slow absolute -bottom-5 -right-3 z-20 rounded-2xl px-4 py-2.5 flex items-center gap-2 border border-emerald-500/30"
        style={{ background: 'rgba(16,185,129,0.15)', backdropFilter: 'blur(12px)' }}
      >
        <CheckCircle2 size={16} className="text-emerald-400 flex-none" />
        <p className="text-emerald-400 text-xs font-semibold">Alex settled ₹933</p>
      </div>

      {/* Floating notification */}
      <div
        className="landing-float-med absolute -top-5 -left-3 z-20 rounded-xl px-3 py-2.5 flex items-center gap-2.5 border border-white/10"
        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
      >
        <span className="text-base">💳</span>
        <div>
          <p className="text-white text-xs font-semibold">New expense</p>
          <p className="text-slate-400 text-[10px]">Maya added ₹650</p>
        </div>
      </div>
    </div>
  )
}

// ─── Section reveal wrapper ────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(28px)',
      }}
    >
      {children}
    </div>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, gradient, delay }) {
  return (
    <Reveal delay={delay}>
      <div
        className="group relative rounded-2xl p-6 border border-white/[0.08] overflow-hidden cursor-default
          hover:border-white/20 transition-all duration-300 hover:-translate-y-1 h-full"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(circle at 30% 30%, rgba(190,18,64,0.06) 0%, transparent 70%)' }}
        />
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 relative z-10"
          style={{ background: gradient }}
        >
          <Icon size={20} className="text-white" />
        </div>
        <h3 className="text-white font-semibold mb-2 relative z-10">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed relative z-10">{desc}</p>
      </div>
    </Reveal>
  )
}

// ─── Step card ────────────────────────────────────────────────────────────────
function StepCard({ n, icon: Icon, title, desc, delay }) {
  return (
    <Reveal delay={delay}>
      <div className="flex flex-col items-center text-center px-6">
        <div className="relative mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #7f0e26 0%, #be1240 100%)' }}
          >
            <Icon size={26} className="text-white" />
          </div>
          <div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-[#080d14] flex items-center justify-center text-xs font-black text-white"
            style={{ background: '#be1240' }}
          >
            {n}
          </div>
        </div>
        <h3 className="text-white font-bold mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </Reveal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { currentUser } = useCurrentUser()
  const navigate = useNavigate()
  const [statsRef, statsInView] = useInView(0.3)

  useEffect(() => {
    if (currentUser) navigate('/groups', { replace: true })
  }, [currentUser])

  const DARK_BG = '#080d14'

  return (
    <div style={{ background: DARK_BG, color: 'white', minHeight: '100vh' }}>

      {/* ── Sticky Navbar ──────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 border-b border-white/[0.06]"
        style={{ background: 'rgba(8,13,20,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <Logo size="sm" />
        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-5 py-2.5 rounded-full transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7f0e26 0%, #be1240 100%)' }}
          >
            Get started <ChevronRight size={14} />
          </Link>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 md:px-12 pt-24 pb-32">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(190,18,64,0.20) 0%, transparent 70%)',
              filter: 'blur(1px)',
            }}
          />
          <div
            className="absolute bottom-[-10%] left-[-15%] w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,106,191,0.14) 0%, transparent 70%)' }}
          />
          {/* Grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.032) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-12">
          {/* Left: text */}
          <div className="flex-1 text-center lg:text-left max-w-xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border border-white/10 text-sm"
              style={{ background: 'rgba(190,18,64,0.12)' }}
            >
              <Zap size={13} className="text-red-400" />
              <span className="text-red-300 font-medium">100% free — no credit card</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black leading-[1.08] tracking-tight mb-6">
              Split bills,<br />
              <span
                style={{
                  background: 'linear-gradient(90deg, #e63358 0%, #ff7a6e 50%, #e63358 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'hero-shimmer 4s linear infinite',
                }}
              >
                not friendships.
              </span>
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
              The fastest way to split expenses with friends, roommates, and travel groups.
              Track who owes what. Settle up in seconds.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
                style={{
                  background: 'linear-gradient(135deg, #7f0e26 0%, #be1240 60%, #e63358 100%)',
                  boxShadow: '0 8px 32px rgba(190,18,64,0.40), 0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                Start splitting free
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-slate-300 border border-white/15 hover:border-white/30 hover:text-white transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                Sign in
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start">
              {['No credit card', 'Free forever', 'Instant setup'].map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-none" />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Right: app preview */}
          <div className="flex-1 flex justify-center lg:justify-end w-full max-w-sm lg:max-w-none">
            <AppPreview />
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-widest text-red-400 mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl font-black">Three steps to stress-free splitting</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6 relative">
            {/* Connector lines (desktop only) */}
            <div className="hidden md:block absolute top-8 left-[33%] right-[33%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(190,18,64,0.4), transparent)' }} />

            <StepCard n={1} icon={Users} title="Create a group" desc="Set up a group for your trip, apartment, or any shared expense. Invite friends with a link." delay={0} />
            <StepCard n={2} icon={Zap} title="Add expenses" desc="Log expenses as you go. Split equally or custom amounts per person." delay={120} />
            <StepCard n={3} icon={CheckCircle2} title="Settle up" desc="Split Striker Wise calculates the simplest way to settle — fewer transactions, less hassle." delay={240} />
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-widest text-red-400 mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl font-black">Everything you need, nothing you don't</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Users}
              title="Group expenses"
              desc="Create groups for any occasion — trips, apartments, dinners. All expenses in one place."
              gradient="linear-gradient(135deg, #7c3aed, #5b21b6)"
              delay={0}
            />
            <FeatureCard
              icon={Zap}
              title="Smart splitting"
              desc="Split equally, by percentage, or custom amounts. Split Striker Wise handles the math."
              gradient="linear-gradient(135deg, #dc2626, #991b1b)"
              delay={80}
            />
            <FeatureCard
              icon={BarChart3}
              title="Real-time balances"
              desc="See who owes what at a glance. Balances update the moment an expense is added."
              gradient="linear-gradient(135deg, #0891b2, #0e7490)"
              delay={160}
            />
            <FeatureCard
              icon={Globe}
              title="Multi-currency"
              desc="Traveling internationally? Add expenses in any currency with custom exchange rates."
              gradient="linear-gradient(135deg, #059669, #047857)"
              delay={80}
            />
            <FeatureCard
              icon={Link2}
              title="Invite via link"
              desc="Share a link and friends join instantly — no account setup required to accept."
              gradient="linear-gradient(135deg, #d97706, #b45309)"
              delay={160}
            />
            <FeatureCard
              icon={Shield}
              title="Private & secure"
              desc="Your groups are private. Only invited members can see the expenses inside."
              gradient="linear-gradient(135deg, #be185d, #9d174d)"
              delay={240}
            />
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <section
        className="px-6 md:px-12 py-20 border-t border-b border-white/[0.06]"
        style={{ background: 'rgba(190,18,64,0.06)' }}
      >
        <div ref={statsRef} className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 100, suffix: '%', label: 'Free forever', prefix: '' },
            { value: 0, suffix: '', label: 'Ads or tracking', prefix: 'Zero' },
            { value: 7, suffix: ' themes', label: 'To personalise', prefix: '' },
            { value: 30, suffix: ' sec', label: 'To get started', prefix: '<' },
          ].map(({ value, suffix, label, prefix }, i) => (
            <Reveal key={label} delay={i * 80}>
              <div className="text-center">
                <p className="text-4xl font-black mb-1" style={{ color: '#e63358' }}>
                  {prefix ? (
                    <span>{prefix} <Counter target={value} suffix={suffix} inView={statsInView} /></span>
                  ) : (
                    <Counter target={value} suffix={suffix} inView={statsInView} />
                  )}
                </p>
                <p className="text-slate-400 text-sm">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-28">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl"
              style={{
                background: 'linear-gradient(145deg, #7f0e26 0%, #be1240 55%, #e63358 100%)',
                boxShadow: '0 8px 40px rgba(190,18,64,0.50)',
              }}
            >
              <Zap size={30} className="text-white" strokeWidth={2.5} />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="text-4xl md:text-5xl font-black mb-5">
              Ready to stop arguing about money?
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="text-slate-400 text-lg mb-10">
              Join Split Striker Wise today — it's free, it's fast, and your friends will thank you.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <Link
              to="/login"
              className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl text-lg font-bold text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] group"
              style={{
                background: 'linear-gradient(135deg, #7f0e26 0%, #be1240 60%, #e63358 100%)',
                boxShadow: '0 12px 48px rgba(190,18,64,0.50), 0 4px 12px rgba(0,0,0,0.4)',
              }}
            >
              Create your free account
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="px-6 md:px-12 py-10 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-slate-600 text-sm">
            Split expenses. Stay friends. © {new Date().getFullYear()} Split Striker Wise
          </p>
          <Link to="/login" className="text-sm text-slate-500 hover:text-white transition-colors">
            Sign in →
          </Link>
        </div>
      </footer>

      {/* Hero shimmer keyframe — injected once */}
      <style>{`
        @keyframes hero-shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        .landing-float-slow {
          animation: landing-float 6s ease-in-out infinite;
        }
        .landing-float-med {
          animation: landing-float 4.5s ease-in-out infinite;
          animation-delay: 1.2s;
        }
        @keyframes landing-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
