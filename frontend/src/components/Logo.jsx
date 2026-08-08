import { Zap } from 'lucide-react'

/**
 * size: 'sm' (sidebar) | 'lg' (login page)
 * dark: true = white shimmer wordmark (dark backgrounds)
 *       false = dark wordmark (light backgrounds — not currently used)
 */
export default function Logo({ size = 'sm', showText = true, dark = true }) {
  const isLg = size === 'lg'

  return (
    <div className={`flex items-center ${isLg ? 'gap-4' : 'gap-2.5'}`}>
      {/* App icon */}
      <div
        className={`logo-icon-breathe relative flex-none flex items-center justify-center overflow-hidden
          ${isLg ? 'w-14 h-14 rounded-[20px]' : 'w-10 h-10 rounded-[14px]'}`}
        style={{
          background: 'linear-gradient(145deg, rgb(var(--brand-800)) 0%, rgb(var(--brand-600)) 55%, rgb(var(--brand-400)) 100%)',
          boxShadow: '0 4px 20px rgb(var(--brand-500) / 0.45), inset 0 1px 0 rgba(255,255,255,0.20)',
        }}
      >
        {/* Glass gloss */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 55%)' }}
        />
        <Zap
          size={isLg ? 28 : 18}
          className="logo-bolt-strike relative z-10 text-white"
          strokeWidth={2.5}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
        />
      </div>

      {/* Wordmark */}
      {showText && (
        <span
          className={`logo-wordmark select-none ${
            isLg ? 'text-[1.7rem] font-black tracking-tight' : 'text-[1.05rem] font-bold tracking-tight'
          }`}
        >
          Split Striker Wise
        </span>
      )}
    </div>
  )
}
