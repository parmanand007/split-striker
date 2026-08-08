import { useState } from 'react'
import Sidebar from './Sidebar'
import Logo from '../Logo'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-300" style={{ background: 'var(--page-bg)' }}>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — slide-over on mobile, static on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top header — hidden on md+ */}
        <header
          className="flex md:hidden items-center gap-3 px-4 border-b border-slate-200 flex-none"
          style={{
            background: 'var(--card-bg)',
            paddingTop: `calc(env(safe-area-inset-top, 0px) + 10px)`,
            paddingBottom: '10px',
          }}
        >
          {/* Hamburger — 44×44 touch target */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors flex-none"
            style={{ width: 44, height: 44 }}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="2" y1="5"  x2="18" y2="5"  />
              <line x1="2" y1="10" x2="18" y2="10" />
              <line x1="2" y1="15" x2="18" y2="15" />
            </svg>
          </button>

          {/* Logo — use the real Logo component */}
          <Logo size="sm" />
        </header>

        {/* Scrollable page content */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in"
          style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 1.5rem)` }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
