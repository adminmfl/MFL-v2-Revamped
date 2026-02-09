/**
 * Color Utilities for MFL Theme System
 * Pure HEX/HSL based - no external dependencies
 */

// ============================================================================
// Preset colors for quick selection
// ============================================================================

export interface ColorPreset {
  name: string
  value: string // HEX color
}

export const colorPresets: ColorPreset[] = [
  { name: 'Green', value: '#488617' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
]

export const DEFAULT_PRIMARY_COLOR = '#488617' // MFL Green

// ============================================================================
// Color conversion utilities
// ============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s, l }
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return rgbToHsl(rgb.r, rgb.g, rgb.b)
}

// ============================================================================
// Contrast and accessibility
// ============================================================================

function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const toLinear = (val: number) => {
    const v = val / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }

  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b)
}

export function getContrastingForeground(backgroundColor: string): string {
  const luminance = getRelativeLuminance(backgroundColor)
  // WCAG AA: use white text on dark backgrounds, dark text on light
  return luminance > 0.35 ? '#0F172A' : '#FFFFFF'
}

// ============================================================================
// Theme generation from a single color
// ============================================================================

export type ThemeDepth = 'subtle' | 'soft' | 'vivid' | 'immersive'

interface GeneratedTheme {
  // Subtle: only primary, accent, ring, charts
  primary?: string
  primaryForeground?: string
  accent?: string
  accentForeground?: string
  ring?: string
  charts: string[]
  // Soft: + secondary, muted, border, input
  secondary?: string
  secondaryForeground?: string
  muted?: string
  mutedForeground?: string
  border?: string
  input?: string
  // Vivid: + card, popover
  card?: string
  cardForeground?: string
  popover?: string
  popoverForeground?: string
  // Immersive: + background, foreground, sidebar
  background?: string
  foreground?: string
  sidebar?: string
  sidebarForeground?: string
  sidebarBorder?: string
}

export function generateThemeFromColor(
  hex: string,
  depth: ThemeDepth,
  isDark: boolean
): GeneratedTheme {
  const hsl = hexToHsl(hex)
  if (!hsl) return generateThemeFromColor(DEFAULT_PRIMARY_COLOR, depth, isDark)

  const { h, s } = hsl

  if (isDark) {
    return generateDarkTheme(h, s, hex, depth)
  }
  return generateLightTheme(h, s, hex, depth)
}

function generateLightTheme(
  h: number,
  s: number,
  hex: string,
  depth: ThemeDepth
): GeneratedTheme {
  const accentHue = (h + 30) % 360

  // Subtle: only primary, accent, ring, charts
  const theme: GeneratedTheme = {
    primary: hex,
    primaryForeground: getContrastingForeground(hex),
    accent: hslToHex(accentHue, Math.min(s * 0.8, 0.7), 0.5),
    accentForeground: '#FFFFFF',
    ring: hslToHex(h, s, Math.min((hexToHsl(hex)?.l || 0.5) + 0.1, 0.6)),
    charts: generateChartColors(h, false),
  }

  // Soft: + secondary, muted, border, input
  if (depth === 'soft' || depth === 'vivid' || depth === 'immersive') {
    theme.secondary = hslToHex(h, Math.min(s * 0.4, 0.3), 0.93)
    theme.secondaryForeground = hslToHex(h, Math.min(s * 0.8, 0.5), 0.25)
    theme.muted = hslToHex(h, Math.min(s * 0.3, 0.2), 0.95)
    theme.mutedForeground = hslToHex(h, Math.min(s * 0.3, 0.15), 0.4)
    theme.border = hslToHex(h, Math.min(s * 0.3, 0.25), 0.85)
    theme.input = hslToHex(h, Math.min(s * 0.3, 0.25), 0.85)
  }

  // Vivid: + card, popover
  if (depth === 'vivid' || depth === 'immersive') {
    theme.card = hslToHex(h, Math.min(s * 0.1, 0.08), 0.99)
    theme.cardForeground = '#0F172A'
    theme.popover = hslToHex(h, Math.min(s * 0.1, 0.08), 0.99)
    theme.popoverForeground = '#0F172A'
  }

  // Immersive: + background, foreground, sidebar
  if (depth === 'immersive') {
    theme.background = hslToHex(h, Math.min(s * 0.15, 0.12), 0.96)
    theme.foreground = '#0F172A'
    theme.sidebar = hslToHex(h, Math.min(s * 0.1, 0.08), 0.98)
    theme.sidebarForeground = '#0F172A'
    theme.sidebarBorder = hslToHex(h, Math.min(s * 0.2, 0.15), 0.88)
  }

  return theme
}

function generateDarkTheme(
  h: number,
  s: number,
  hex: string,
  depth: ThemeDepth
): GeneratedTheme {
  const hsl = hexToHsl(hex)!
  const accentHue = (h + 30) % 360

  // Lighten primary for dark mode visibility
  const lightPrimary = hslToHex(h, Math.min(s, 0.7), Math.min(hsl.l + 0.25, 0.65))

  // Subtle: only primary, accent, ring, charts
  const theme: GeneratedTheme = {
    primary: lightPrimary,
    primaryForeground: '#FFFFFF',
    accent: hslToHex(accentHue, Math.min(s * 0.7, 0.6), 0.55),
    accentForeground: '#FFFFFF',
    ring: hslToHex(h, Math.min(s, 0.6), Math.min(hsl.l + 0.3, 0.7)),
    charts: generateChartColors(h, true),
  }

  // Soft: + secondary, muted, border, input
  if (depth === 'soft' || depth === 'vivid' || depth === 'immersive') {
    theme.secondary = hslToHex(h, Math.min(s * 0.4, 0.2), 0.18)
    theme.secondaryForeground = '#F1F5F9'
    theme.muted = hslToHex(h, Math.min(s * 0.3, 0.15), 0.18)
    theme.mutedForeground = hslToHex(h, Math.min(s * 0.2, 0.1), 0.6)
    theme.border = hslToHex(h, Math.min(s * 0.3, 0.2), 0.22)
    theme.input = hslToHex(h, Math.min(s * 0.3, 0.2), 0.22)
  }

  // Vivid: + card, popover
  if (depth === 'vivid' || depth === 'immersive') {
    theme.card = hslToHex(h, Math.min(s * 0.2, 0.15), 0.13)
    theme.cardForeground = '#F8FAFC'
    theme.popover = hslToHex(h, Math.min(s * 0.2, 0.15), 0.13)
    theme.popoverForeground = '#F8FAFC'
  }

  // Immersive: + background, foreground, sidebar
  if (depth === 'immersive') {
    theme.background = hslToHex(h, Math.min(s * 0.3, 0.2), 0.08)
    theme.foreground = '#F8FAFC'
    theme.sidebar = hslToHex(h, Math.min(s * 0.3, 0.2), 0.06)
    theme.sidebarForeground = '#F8FAFC'
    theme.sidebarBorder = hslToHex(h, Math.min(s * 0.25, 0.15), 0.18)
  }

  return theme
}

function generateChartColors(baseHue: number, isDark: boolean): string[] {
  const lightness = isDark ? 0.55 : 0.5
  const saturation = isDark ? 0.6 : 0.65

  return [
    hslToHex(baseHue, saturation, lightness),
    hslToHex((baseHue + 72) % 360, saturation, lightness),
    hslToHex((baseHue + 144) % 360, saturation, lightness),
    hslToHex((baseHue + 216) % 360, saturation, lightness),
    hslToHex((baseHue + 288) % 360, saturation, lightness),
  ]
}

// ============================================================================
// Apply theme to document
// ============================================================================

export function applyThemeToDocument(theme: GeneratedTheme): void {
  const root = document.documentElement

  // Map all CSS variables to their theme values
  // Undefined values get removed (reverts to globals.css defaults)
  const allProps: [string, string | undefined][] = [
    // Subtle depth (always set if present)
    ['--primary', theme.primary],
    ['--primary-foreground', theme.primaryForeground],
    ['--accent', theme.accent],
    ['--accent-foreground', theme.accentForeground],
    ['--ring', theme.ring],
    // Soft depth
    ['--secondary', theme.secondary],
    ['--secondary-foreground', theme.secondaryForeground],
    ['--muted', theme.muted],
    ['--muted-foreground', theme.mutedForeground],
    ['--border', theme.border],
    ['--input', theme.input],
    // Vivid depth
    ['--card', theme.card],
    ['--card-foreground', theme.cardForeground],
    ['--popover', theme.popover],
    ['--popover-foreground', theme.popoverForeground],
    // Immersive depth
    ['--background', theme.background],
    ['--foreground', theme.foreground],
    ['--sidebar', theme.sidebar],
    ['--sidebar-foreground', theme.sidebarForeground],
    ['--sidebar-border', theme.sidebarBorder],
  ]

  allProps.forEach(([prop, value]) => {
    if (value) {
      root.style.setProperty(prop, value)
    } else {
      root.style.removeProperty(prop)
    }
  })

  // Chart colors
  theme.charts.forEach((c, i) => {
    root.style.setProperty(`--chart-${i + 1}`, c)
  })

  // Sidebar mirrors primary when set
  if (theme.primary) {
    root.style.setProperty('--sidebar-primary', theme.primary)
    root.style.setProperty('--sidebar-primary-foreground', theme.primaryForeground || '#FFFFFF')
    root.style.setProperty('--sidebar-ring', theme.ring || theme.primary)
  }
}

export function resetAllThemeColors(): void {
  const root = document.documentElement

  const properties = [
    '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground',
    '--accent', '--accent-foreground',
    '--muted', '--muted-foreground',
    '--ring',
    '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    '--border', '--input',
    '--card', '--card-foreground',
    '--popover', '--popover-foreground',
    '--background', '--foreground',
    '--sidebar', '--sidebar-foreground', '--sidebar-border',
    '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-ring',
  ]

  properties.forEach((prop) => root.style.removeProperty(prop))
}

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}
