import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-300" style={{ background: 'var(--page-bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
        {children}
      </main>
    </div>
  )
}
