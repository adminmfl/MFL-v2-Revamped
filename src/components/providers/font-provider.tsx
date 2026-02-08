'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { fontConfigs, DEFAULT_FONT_ID, getFontById } from '@/config/fonts'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const FONT_COOKIE_NAME = 'mfl-font'
const FONT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type FontContextType = {
  fontId: string
  setFont: (fontId: string) => void
  resetFont: () => void
  isDefault: boolean
}

const FontContext = createContext<FontContextType | null>(null)

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [fontId, setFontId] = useState<string>(DEFAULT_FONT_ID)

  // Load from cookie on mount
  useEffect(() => {
    const savedFont = getCookie(FONT_COOKIE_NAME)
    if (savedFont && getFontById(savedFont)) {
      setFontId(savedFont)
    }
    setMounted(true)
  }, [])

  // Apply font class to document
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement

    // Remove all font classes
    fontConfigs.forEach((f) => {
      root.classList.remove(`font-${f.id}`)
    })

    // Add current font class
    root.classList.add(`font-${fontId}`)
  }, [fontId, mounted])

  const setFont = (newFontId: string) => {
    if (!getFontById(newFontId)) return
    setCookie(FONT_COOKIE_NAME, newFontId, FONT_COOKIE_MAX_AGE)
    setFontId(newFontId)
  }

  const resetFont = () => {
    removeCookie(FONT_COOKIE_NAME)
    setFontId(DEFAULT_FONT_ID)
  }

  const isDefault = fontId === DEFAULT_FONT_ID

  return (
    <FontContext.Provider value={{ fontId, setFont, resetFont, isDefault }}>
      {children}
    </FontContext.Provider>
  )
}

export const useFont = () => {
  const context = useContext(FontContext)
  if (!context) {
    throw new Error('useFont must be used within a FontProvider')
  }
  return context
}
