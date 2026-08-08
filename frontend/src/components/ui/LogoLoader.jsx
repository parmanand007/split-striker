import { Zap } from 'lucide-react'

const VARIANTS = {
  fullscreen: { wrap: 'fixed inset-0 z-[9999] flex flex-col items-center justify-center', iconBox: 'w-20 h-20 rounded-[24px]', zap: 30, ring1: 96, ring2: 128, showWord: true, dots: 'mt-6', bg: true },
  page:       { wrap: 'flex flex-col items-center justify-center min-h-[60vh]',           iconBox: 'w-16 h-16 rounded-[20px]', zap: 24, ring1: 76, ring2: 104, showWord: true, dots: 'mt-5', bg: false },
  section:    { wrap: 'flex flex-col items-center justify-center py-14',                  iconBox: 'w-11 h-11 rounded-[14px]', zap: 18, ring1: 56, ring2: 0,   showWord: false, dots: 'mt-4', bg: false },
}

export default function LogoLoader({ variant = 'page', text }) {
  const v = VARIANTS[variant] ?? VARIANTS.page

  return (
    <div
      className={v.wrap}
      style={v.bg ? { background: 'linear-gradient(160deg, #0f172a 0%, #1a1a2e 100%)' } : undefined}
    >
      {/* Icon + rings */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <div
          className="loader-ring absolute rounded-full pointer-events-none"
          style={{ width: v.ring1, height: v.ring1, border: '2px solid rgb(var(--brand-500)/0.55)' }}
        />
        {/* Second ring, staggered */}
        {v.ring2 > 0 && (
          <div
            className="loader-ring-2 absolute rounded-full pointer-events-none"
            style={{ width: v.ring2, height: v.ring2, border: '1.5px solid rgb(var(--brand-400)/0.30)' }}
          />
        )}

        {/* Logo icon */}
        <div
          className={`loader-icon-breathe relative flex-none flex items-center justify-center overflow-hidden ${v.iconBox}`}
          style={{
            background: 'linear-gradient(145deg, rgb(var(--brand-800)) 0%, rgb(var(--brand-600)) 55%, rgb(var(--brand-400)) 100%)',
            boxShadow: '0 4px 20px rgb(var(--brand-500)/0.45), inset 0 1px 0 rgba(255,255,255,0.20)',
          }}
        >
          {/* Gloss overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 55%)' }}
          />
          <Zap
            size={v.zap}
            className="loader-bolt relative z-10 text-white"
            strokeWidth={2.5}
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
          />
        </div>
      </div>

      {/* Wordmark */}
      {v.showWord && (
        <span className="logo-wordmark select-none text-[1.15rem] font-bold tracking-tight mt-5">
          Split Striker Wise
        </span>
      )}

      {/* Bouncing dots */}
      <div className={`flex gap-2 ${v.dots}`}>
        {['loader-dot loader-dot-1', 'loader-dot loader-dot-2', 'loader-dot loader-dot-3'].map((cls, i) => (
          <div
            key={i}
            className={`${cls} w-1.5 h-1.5 rounded-full`}
            style={{ background: 'rgb(var(--brand-500))' }}
          />
        ))}
      </div>

      {text && (
        <p className="mt-3 text-sm text-slate-400 font-medium">{text}</p>
      )}
    </div>
  )
}
