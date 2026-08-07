import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

/* Floating particle — a single animated emoji */
function Particle({ style, children }) {
  return (
    <span
      className="particle absolute select-none pointer-events-none text-2xl"
      style={style}
    >
      {children}
    </span>
  )
}

const PARTICLES = [
  { emoji: '💸', top: '12%', left: '8%',  delay: '0s',    dur: '7s'  },
  { emoji: '🧾', top: '20%', right: '10%', delay: '0.8s',  dur: '9s'  },
  { emoji: '💰', top: '60%', left: '5%',  delay: '1.6s',  dur: '8s'  },
  { emoji: '🪙', top: '70%', right: '8%',  delay: '0.4s',  dur: '10s' },
  { emoji: '📊', top: '35%', left: '3%',  delay: '2.2s',  dur: '7.5s'},
  { emoji: '💳', top: '80%', left: '20%', delay: '1.2s',  dur: '9.5s'},
  { emoji: '🧮', top: '15%', right: '20%',delay: '3s',    dur: '8.5s'},
  { emoji: '💵', top: '50%', right: '4%', delay: '1.8s',  dur: '6.5s'},
]

export default function NotFoundPage() {
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4"
      style={{ background: 'var(--page-bg)' }}
    >
      {/* Floating background glow blobs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none animate-float-slow"
        style={{
          top: '-10%', left: '-10%',
          background: 'rgba(var(--blob-a), 0.08)',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none animate-float-med"
        style={{
          bottom: '-15%', right: '-5%',
          background: 'rgba(var(--blob-b), 0.07)',
          animationDelay: '2s',
        }}
      />

      {/* Floating emoji particles */}
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 0; transform: translateY(30px) rotate(-8deg) scale(0.6); }
          15%  { opacity: 0.7; }
          80%  { opacity: 0.5; }
          100% { opacity: 0; transform: translateY(-80px) rotate(8deg) scale(1.1); }
        }
        .particle { animation: floatUp var(--dur) ease-in-out var(--delay) infinite; }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(40px) scale(0.8); }
          to   { opacity: 1; transform: translateY(0)   scale(1);   }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes pulseRing {
          0%, 100% { transform: scale(1);   opacity: 0.25; }
          50%       { transform: scale(1.15); opacity: 0.08; }
        }
        .four-enter  { animation: countUp     0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .sub-enter   { animation: slideUpFade 0.5s ease-out forwards; }
        .pulse-ring  { animation: pulseRing   3s ease-in-out infinite; }
      `}</style>

      {PARTICLES.map((p, i) => (
        <Particle
          key={i}
          style={{
            top: p.top, left: p.left, right: p.right, bottom: p.bottom,
            '--dur': p.dur, '--delay': p.delay,
          }}
        >
          {p.emoji}
        </Particle>
      ))}

      {/* Pulsing ring behind the 404 */}
      <div
        className="absolute w-72 h-72 rounded-full border-2 pulse-ring pointer-events-none"
        style={{ borderColor: 'rgb(var(--brand-500) / 0.3)' }}
      />
      <div
        className="absolute w-52 h-52 rounded-full border pulse-ring pointer-events-none"
        style={{ borderColor: 'rgb(var(--brand-500) / 0.2)', animationDelay: '1s' }}
      />

      {/* Main content */}
      <div className="relative z-10 text-center max-w-md w-full">

        {/* 404 number */}
        <div
          className="four-enter"
          style={{
            opacity: mounted ? undefined : 0,
            animationDelay: '0.05s',
            animationFillMode: 'forwards',
          }}
        >
          <span
            className="text-[9rem] sm:text-[11rem] font-black leading-none tracking-tighter select-none"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--brand-400)), rgb(var(--brand-600)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 4px 24px rgb(var(--brand-500) / 0.25))',
            }}
          >
            404
          </span>
        </div>

        {/* Icon + heading */}
        <div
          className="sub-enter mb-3"
          style={{ opacity: 0, animationDelay: '0.35s', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-sm"
              style={{ background: 'rgb(var(--brand-500) / 0.12)' }}
            >
              🤔
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Lost in the split
          </h1>
        </div>

        {/* Subtitle */}
        <div
          className="sub-enter mb-8"
          style={{ opacity: 0, animationDelay: '0.5s', animationFillMode: 'forwards' }}
        >
          <p className="text-slate-500 text-base leading-relaxed">
            This page doesn't exist — maybe someone forgot to<br className="hidden sm:block" />
            {' '}pay for it. Let's get you back on track.
          </p>
        </div>

        {/* Buttons */}
        <div
          className="sub-enter flex flex-col sm:flex-row items-center justify-center gap-3"
          style={{ opacity: 0, animationDelay: '0.65s', animationFillMode: 'forwards' }}
        >
          <button
            onClick={() => navigate('/')}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-base w-full sm:w-auto justify-center"
          >
            <Home size={17} />
            Go home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-2 px-6 py-3 text-base w-full sm:w-auto justify-center"
          >
            <ArrowLeft size={17} />
            Go back
          </button>
        </div>

        {/* Path hint */}
        <div
          className="sub-enter mt-8"
          style={{ opacity: 0, animationDelay: '0.8s', animationFillMode: 'forwards' }}
        >
          <p className="text-xs text-slate-400">
            Looking for a group invite?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-brand-600 hover:text-brand-500 font-medium underline underline-offset-2 transition-colors"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
