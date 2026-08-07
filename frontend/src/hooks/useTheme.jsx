import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = [
  { id: 'maroon', label: 'Maroon', swatch: '#dc2638', swatchB: '#b9142a' },
  { id: 'forest', label: 'Forest', swatch: '#22c55e', swatchB: '#10b981' },
  { id: 'amber',  label: 'Amber',  swatch: '#f59e0b', swatchB: '#f97316' },
  { id: 'olive',  label: 'Olive',  swatch: '#84cc16', swatchB: '#22c55e' },
  { id: 'teal',   label: 'Teal',   swatch: '#14b8a6', swatchB: '#22c55e' },
  { id: 'rust',   label: 'Rust',   swatch: '#ea580c', swatchB: '#dc2638' },
]

const STORAGE_KEY = 'split_striker_theme'
const DEFAULT = 'maroon'

const ThemeContext = createContext(null)

function applyTheme(id) {
  const html = document.documentElement
  html.setAttribute('data-theme', id)
  html.classList.add('dark')
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return THEMES.find(t => t.id === saved) ? saved : DEFAULT
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function setTheme(id) {
    if (!THEMES.find(t => t.id === id)) return
    localStorage.setItem(STORAGE_KEY, id)
    setThemeState(id)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
