/**
 * Font configuration for MFL Theme System
 */

export type FontConfig = {
  id: string
  name: string
  category: 'sans'
  description: string
}

export const fontConfigs: FontConfig[] = [
  {
    id: 'manrope',
    name: 'Manrope',
    category: 'sans',
    description: 'Geometric, contemporary (default)',
  },
  {
    id: 'inter',
    name: 'Inter',
    category: 'sans',
    description: 'Clean, modern UI font',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    category: 'sans',
    description: 'Trendy, geometric',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    category: 'sans',
    description: 'Minimal, elegant',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    category: 'sans',
    description: 'Fresh, modern',
  },
]

export const DEFAULT_FONT_ID = 'manrope'

export const getFontById = (id: string): FontConfig | undefined =>
  fontConfigs.find((f) => f.id === id)
