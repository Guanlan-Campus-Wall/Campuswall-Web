import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const appearanceOptions = Object.freeze([
  Object.freeze({ id: 'system', label: '跟随系统' }),
  Object.freeze({ id: 'light', label: '浅色' }),
  Object.freeze({ id: 'dark', label: '深色' })
])

export const paletteOptions = Object.freeze([
  Object.freeze({ id: 'blue', label: '海蓝', color: '#1765d1' }),
  Object.freeze({ id: 'rose', label: '樱粉', color: '#c23159' }),
  Object.freeze({ id: 'violet', label: '紫藤', color: '#6b4dcc' }),
  Object.freeze({ id: 'green', label: '青绿', color: '#087b5c' }),
  Object.freeze({ id: 'orange', label: '暖橙', color: '#ae4c0b' })
])

const appearanceIds = new Set(appearanceOptions.map((option) => option.id))
const paletteIds = new Set(paletteOptions.map((option) => option.id))
const appearanceStorageKey = 'theme-preference'
const paletteStorageKey = 'theme-palette'

const readStorage = (key, allowed, fallback) => {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(key)
    return allowed.has(stored) ? stored : fallback
  } catch {
    return fallback
  }
}

const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage may be disabled in private or sandboxed browsing contexts.
  }
}

const getSystemAppearance = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [appearance, setAppearance] = useState(() => readStorage(appearanceStorageKey, appearanceIds, 'system'))
  const [palette, setPalette] = useState(() => readStorage(paletteStorageKey, paletteIds, 'green'))
  const [systemAppearance, setSystemAppearance] = useState(getSystemAppearance)
  const resolvedAppearance = appearance === 'system' ? systemAppearance : appearance

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined
    const update = (event) => setSystemAppearance(event.matches ? 'dark' : 'light')
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener?.(update)
    return () => media.removeListener?.(update)
  }, [])

  useEffect(() => {
    const syncAcrossTabs = (event) => {
      if (event.key === appearanceStorageKey) {
        setAppearance(appearanceIds.has(event.newValue) ? event.newValue : 'system')
      }
      if (event.key === paletteStorageKey) {
        setPalette(paletteIds.has(event.newValue) ? event.newValue : 'green')
      }
    }
    window.addEventListener('storage', syncAcrossTabs)
    return () => window.removeEventListener('storage', syncAcrossTabs)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolvedAppearance
    root.dataset.palette = palette
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) themeMeta.content = resolvedAppearance === 'dark' ? '#151d19' : '#f6f7f3'
  }, [palette, resolvedAppearance])

  useEffect(() => writeStorage(appearanceStorageKey, appearance), [appearance])
  useEffect(() => writeStorage(paletteStorageKey, palette), [palette])

  const value = useMemo(() => ({
    appearance,
    setAppearance: (next) => setAppearance(appearanceIds.has(next) ? next : 'system'),
    resolvedAppearance,
    palette,
    setPalette: (next) => setPalette(paletteIds.has(next) ? next : 'green'),
    appearanceOptions,
    paletteOptions
  }), [appearance, palette, resolvedAppearance])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
