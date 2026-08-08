import { Zap } from 'lucide-react'

// size: 'xs'=12 'sm'=15 'md'=18 'lg'=22
const SIZES = { xs: 12, sm: 15, md: 18, lg: 22 }
const BOX   = { xs: 'w-5  h-5  rounded-md',   sm: 'w-6  h-6  rounded-[7px]',
                 md: 'w-7  h-7  rounded-[8px]', lg: 'w-9  h-9  rounded-[10px]' }

export default function Spinner({ size = 'sm', className = '' }) {
  const px = SIZES[size] ?? 15
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden flex-none ${BOX[size]} ${className}`}
      style={{
        background: 'linear-gradient(145deg, rgb(var(--brand-800)) 0%, rgb(var(--brand-600)) 60%, rgb(var(--brand-400)) 100%)',
        boxShadow: '0 2px 8px rgb(var(--brand-500)/0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
      }}
      aria-label="Loading"
    >
      <Zap
        size={px}
        className="btn-spinner text-white"
        strokeWidth={2.5}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      />
    </span>
  )
}
