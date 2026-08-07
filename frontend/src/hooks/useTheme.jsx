import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = [
  { id: 'maroon', label: 'Maroon', swatch: '#be1240', swatchB: '#f6f1f2' },
  { id: 'forest', label: 'Forest', swatch: '#15803d', swatchB: '#f0f5f1' },
  { id: 'amber',  label: 'Amber',  swatch: '#d97706', swatchB: '#fdf8ee' },
  { id: 'olive',  label: 'Olive',  swatch: '#65a30d', swatchB: '#f4f6ee' },
  { id: 'teal',   label: 'Teal',   swatch: '#0d9488', swatchB: '#eef6f5' },
  { id: 'rust',   label: 'Rust',   swatch: '#c2410c', swatchB: '#f8f0ea' },
]

const STORAGE_KEY = 'split_striker_theme'
const DEFAULT = 'maroon'

const ThemeContext = createContext(null)

function applyTheme(id) {
  const html = document.documentElement
  html.setAttribute('data-theme', id)
  html.classList.remove('dark')
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
