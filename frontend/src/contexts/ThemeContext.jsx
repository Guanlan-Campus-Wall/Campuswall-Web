import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const appearanceOptions = Object.freeze([
  Object.freeze({ id: 'system', label: '跟随系统' }),
  Object.freeze({ id: 'light', label: '浅色' }),
  Object.freeze({ id: 'dark', label: '深色' })
])

// 默认「赤陶」取自 Anthropic 风格的暖橙色；其余是同一套调色板里的辅助色。
export const paletteOptions = Object.freeze([
  Object.freeze({ id: 'clay', label: '赤陶', color: '#b85636' }),
  Object.freeze({ id: 'sky', label: '天青', color: '#2f6a99' }),
  Object.freeze({ id: 'olive', label: '橄榄', color: '#566a3c' }),
  Object.freeze({ id: 'fig', label: '无花果', color: '#a8476b' }),
  Object.freeze({ id: 'slate', label: '石墨', color: '#2b2b28' })
])

const defaultPalette = 'clay'
const themeColors = Object.freeze({ light: '#faf9f5', dark: '#262624' })

const appearanceIds = new Set(appearanceOptions.map((option) => option.id))
const paletteIds = new Set(paletteOptions.map((option) => option.id))
const appearanceStorageKey = 'theme-preference'
// 视觉改版后换用新的存储键，让所有设备都先看到新的默认主题色。
const paletteStorageKey = 'theme-palette-v3'

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
  const [palette, setPalette] = useState(() => readStorage(paletteStorageKey, paletteIds, defaultPalette))
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
        setPalette(paletteIds.has(event.newValue) ? event.newValue : defaultPalette)
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
    if (themeMeta) themeMeta.content = themeColors[resolvedAppearance]
  }, [palette, resolvedAppearance])

  useEffect(() => writeStorage(appearanceStorageKey, appearance), [appearance])
  useEffect(() => writeStorage(paletteStorageKey, palette), [palette])

  const value = useMemo(() => ({
    appearance,
    setAppearance: (next) => setAppearance(appearanceIds.has(next) ? next : 'system'),
    resolvedAppearance,
    palette,
    setPalette: (next) => setPalette(paletteIds.has(next) ? next : defaultPalette),
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
