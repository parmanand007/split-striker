import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ title, onClose, children, wide }) {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={`
        relative rounded-t-3xl sm:rounded-3xl shadow-2xl
        w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}
        max-h-[90dvh] overflow-y-auto animate-slide-up
        border-0 sm:border border-white/10
      `} style={{ background: 'var(--card-bg, #fff)' }}>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10 rounded-t-3xl"
          style={{ background: 'var(--card-bg, #fff)', borderColor: 'var(--border, rgba(0,0,0,0.08))' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary, #0f172a)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400
              hover:bg-black/5 hover:text-slate-600 transition-all text-xl leading-none active:scale-90"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
