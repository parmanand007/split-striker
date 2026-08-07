import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CurrentUserProvider, useCurrentUser } from './hooks/useCurrentUser'
import UserSelectPage from './pages/UserSelectPage'
import HomePage from './pages/HomePage'
import GroupPage from './pages/GroupPage'
import GroupSettingsPage from './pages/GroupSettingsPage'
import TestSuitePage from './pages/TestSuitePage'
import InvitePage from './pages/InvitePage'
import NotFoundPage from './pages/NotFoundPage'
import Layout from './components/layout/Layout'

function ProtectedRoutes() {
  const { currentUser, loading } = useCurrentUser()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!currentUser) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/groups/:id" element={<GroupPage />} />
        <Route path="/groups/:id/settings" element={<GroupSettingsPage />} />
        <Route path="/dev/test-suite" element={<TestSuitePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <CurrentUserProvider>
      <Routes>
        <Route path="/login" element={<UserSelectPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </CurrentUserProvider>
  )
}
