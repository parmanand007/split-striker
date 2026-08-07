import { Zap } from 'lucide-react'

/**
 * Shared app logo — iOS app-icon style with breathing glow + bolt-strike animation.
 * size: 'sm' (sidebar) | 'lg' (login page)
 */
export default function Logo({ size = 'sm', showText = true }) {
  const isLg = size === 'lg'

  return (
    <div className={`flex items-center ${isLg ? 'gap-3.5' : 'gap-2.5'}`}>
      {/* App icon */}
      <div
        className={`logo-icon-breathe relative flex-none flex items-center justify-center overflow-hidden
          ${isLg ? 'w-14 h-14 rounded-[20px]' : 'w-10 h-10 rounded-[14px]'}`}
        style={{
          background: 'linear-gradient(145deg, rgb(var(--brand-800)) 0%, rgb(var(--brand-600)) 55%, rgb(var(--brand-400)) 100%)',
          boxShadow: '0 4px 18px rgb(var(--brand-500) / 0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        {/* Inner highlight gloss */}
        <div
          className="absolute inset-0 rounded-inherit pointer-events-none"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 55%)',
          }}
        />
        <Zap
          size={isLg ? 26 : 18}
          className="logo-bolt-strike relative z-10 text-white"
          strokeWidth={2.5}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
        />
      </div>

      {/* Wordmark */}
      {showText && (
        <span
          className={`text-white tracking-tight select-none ${
            isLg ? 'text-[1.65rem] font-black' : 'text-[1.05rem] font-bold'
          }`}
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
        >
          Split Striker
        </span>
      )}
    </div>
  )
}
