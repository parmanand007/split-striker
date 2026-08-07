import { useState, useEffect, createContext, useContext } from 'react'
import { api } from '../api/client'

const CurrentUserContext = createContext(null)

export function CurrentUserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('splitease_user')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Re-fetch to ensure user still exists
        api.getUser(parsed.id)
          .then((u) => {
            setCurrentUser(u)
          })
          .catch(() => {
            localStorage.removeItem('splitease_user')
          })
          .finally(() => setLoading(false))
      } catch {
        localStorage.removeItem('splitease_user')
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  function login(user) {
    setCurrentUser(user)
    localStorage.setItem('splitease_user', JSON.stringify(user))
  }

  function logout() {
    setCurrentUser(null)
    localStorage.removeItem('splitease_user')
  }

  return (
    <CurrentUserContext.Provider value={{ currentUser, loading, login, logout }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  return useContext(CurrentUserContext)
}
