import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ThemeProvider, THEMES, useTheme } from '../hooks/useTheme'

function wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.classList.remove('dark')
})

describe('useTheme', () => {
  it('defaults to maroon theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('maroon')
  })

  it('returns all 6 themes', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.themes).toHaveLength(6)
  })

  it('switches theme and persists to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setTheme('forest'))
    expect(result.current.theme).toBe('forest')
    expect(localStorage.getItem('split_striker_theme')).toBe('forest')
  })

  it('ignores invalid theme id', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setTheme('invalid'))
    expect(result.current.theme).toBe('maroon')
  })

  it('restores saved theme from localStorage', () => {
    localStorage.setItem('split_striker_theme', 'teal')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('teal')
  })

  it('does NOT add dark class to html element', () => {
    renderHook(() => useTheme(), { wrapper })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('sets data-theme attribute on html', () => {
    renderHook(() => useTheme(), { wrapper })
    expect(document.documentElement.getAttribute('data-theme')).toBe('maroon')
  })

  it('all THEMES have correct shape', () => {
    THEMES.forEach(t => {
      expect(t).toHaveProperty('id')
      expect(t).toHaveProperty('label')
      expect(t).toHaveProperty('swatch')
    })
  })
})
