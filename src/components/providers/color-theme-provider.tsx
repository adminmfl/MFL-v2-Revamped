'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useTheme } from 'next-themes'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import {
  generateThemeFromColor,
  applyThemeToDocument,
  resetAllThemeColors,
  isValidHexColor,
  DEFAULT_PRIMARY_COLOR,
  type ThemeDepth,
} from '@/lib/color-utils'

// Cookie keys
const COLOR_COOKIE = 'mfl-theme-color'
const DEPTH_COOKIE = 'mfl-theme-depth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export const themeDepthOptions: {
  value: ThemeDepth
  label: string
  description: string
}[] = [
  { value: 'subtle', label: 'Subtle', description: 'Buttons & accents only' },
  { value: 'soft', label: 'Soft', description: 'Tinted borders & cards' },
  { value: 'vivid', label: 'Vivid', description: 'Rich colors throughout' },
  { value: 'immersive', label: 'Immersive', description: 'Complete transformation' },
]

const DEFAULT_DEPTH: ThemeDepth = 'subtle'

type ColorThemeProviderState = {
  color: string
  depth: ThemeDepth
  setColor: (hex: string) => void
  setDepth: (depth: ThemeDepth) => void
  resetToDefault: () => void
  isDefault: boolean
}

const ColorThemeContext = createContext<ColorThemeProviderState>({
  color: DEFAULT_PRIMARY_COLOR,
  depth: DEFAULT_DEPTH,
  setColor: () => null,
  setDepth: () => null,
  resetToDefault: () => null,
  isDefault: true,
})

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [color, setColorState] = useState<string>(DEFAULT_PRIMARY_COLOR)
  const [depth, setDepthState] = useState<ThemeDepth>(DEFAULT_DEPTH)

  // Load from cookies on mount
  useEffect(() => {
    const savedColor = getCookie(COLOR_COOKIE)
    const savedDepth = getCookie(DEPTH_COOKIE) as ThemeDepth | null

    if (savedColor && isValidHexColor(savedColor)) setColorState(savedColor)

    const validDepths: ThemeDepth[] = ['subtle', 'soft', 'vivid', 'immersive']
    if (savedDepth && validDepths.includes(savedDepth)) setDepthState(savedDepth)

    setMounted(true)
  }, [])

  // Apply theme whenever color, depth, or light/dark mode changes
  useEffect(() => {
    if (!mounted) return
    const isDark = resolvedTheme === 'dark'

    const theme = generateThemeFromColor(color, depth, isDark)
    applyThemeToDocument(theme)
  }, [color, depth, resolvedTheme, mounted])

  const setColor = (hex: string) => {
    if (!isValidHexColor(hex)) return
    setColorState(hex)
    setCookie(COLOR_COOKIE, hex, COOKIE_MAX_AGE)
  }

  const setDepth = (newDepth: ThemeDepth) => {
    setDepthState(newDepth)
    setCookie(DEPTH_COOKIE, newDepth, COOKIE_MAX_AGE)
  }

  const resetToDefault = () => {
    setColorState(DEFAULT_PRIMARY_COLOR)
    setDepthState(DEFAULT_DEPTH)

    removeCookie(COLOR_COOKIE)
    removeCookie(DEPTH_COOKIE)

    resetAllThemeColors()
  }

  const isDefault = color === DEFAULT_PRIMARY_COLOR && depth === DEFAULT_DEPTH

  return (
    <ColorThemeContext.Provider
      value={{ color, depth, setColor, setDepth, resetToDefault, isDefault }}
    >
      {children}
    </ColorThemeContext.Provider>
  )
}

export const useColorTheme = () => {
  const context = useContext(ColorThemeContext)
  if (!context) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider')
  }
  return context
}
