'use client'

import { useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Type,
  Layers,
  RotateCcw,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  useColorTheme,
  themeDepthOptions,
} from '@/components/providers/color-theme-provider'
import { useFont } from '@/components/providers/font-provider'
import { colorPresets } from '@/lib/color-utils'
import type { ThemeDepth } from '@/lib/color-utils'
import { fontConfigs, type FontConfig } from '@/config/fonts'

interface ThemeDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ThemeDrawer({ open, onOpenChange }: ThemeDrawerProps) {
  const { theme, setTheme } = useTheme()
  const { color, depth, setColor, setDepth, resetToDefault, isDefault } =
    useColorTheme()
  const { fontId, setFont, resetFont, isDefault: isFontDefault } = useFont()
  const [activeTab, setActiveTab] = useState<'color' | 'depth' | 'font'>('color')

  const handleReset = () => {
    resetToDefault()
    resetFont()
  }

  const tabs = [
    { id: 'color' as const, label: 'Color', icon: Palette },
    { id: 'depth' as const, label: 'Depth', icon: Layers },
    { id: 'font' as const, label: 'Font', icon: Type },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-lg">Customize Theme</SheetTitle>
          <SheetDescription>Personalize your MFL experience</SheetDescription>
        </SheetHeader>

        {/* Appearance Toggle */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Appearance</span>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'Auto' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                    theme === value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          {activeTab === 'color' && (
            <ColorSelector selectedColor={color} onSelect={setColor} />
          )}
          {activeTab === 'depth' && (
            <DepthSelector selectedDepth={depth} onSelect={setDepth} />
          )}
          {activeTab === 'font' && (
            <FontSelector selectedId={fontId} onSelect={setFont} />
          )}
        </div>

        {/* Footer */}
        <SheetFooter className="border-t border-border px-6 py-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isDefault && isFontDefault}
            className="w-full gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Color Selector - Color picker + preset swatches
// ============================================================================

function ColorSelector({
  selectedColor,
  onSelect,
}: {
  selectedColor: string
  onSelect: (hex: string) => void
}) {
  const [inputValue, setInputValue] = useState(selectedColor)

  const handleColorPickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value
      setInputValue(hex)
      onSelect(hex)
    },
    [onSelect]
  )

  const handleHexInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value
      if (!val.startsWith('#')) val = '#' + val
      setInputValue(val)
      if (/^#([A-Fa-f0-9]{6})$/.test(val)) {
        onSelect(val)
      }
    },
    [onSelect]
  )

  const handlePresetClick = useCallback(
    (hex: string) => {
      setInputValue(hex)
      onSelect(hex)
    },
    [onSelect]
  )

  return (
    <div className="space-y-6">
      {/* Color Picker */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pick a Color
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="color"
              value={selectedColor}
              onChange={handleColorPickerChange}
              className="h-14 w-14 cursor-pointer rounded-xl border-2 border-border bg-transparent p-1 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-none"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              HEX Value
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={handleHexInputChange}
              maxLength={7}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="#488617"
            />
          </div>
        </div>
      </div>

      {/* Color Preview */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preview
        </h3>
        <div className="flex gap-2 rounded-xl border border-border p-3">
          <div
            className="h-10 flex-1 rounded-lg"
            style={{ backgroundColor: selectedColor }}
          />
          <div
            className="h-10 flex-1 rounded-lg opacity-60"
            style={{ backgroundColor: selectedColor }}
          />
          <div
            className="h-10 flex-1 rounded-lg opacity-30"
            style={{ backgroundColor: selectedColor }}
          />
        </div>
      </div>

      {/* Preset Swatches */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Presets
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {colorPresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePresetClick(preset.value)}
              className={cn(
                'group relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all',
                selectedColor.toLowerCase() === preset.value.toLowerCase()
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
              title={preset.name}
            >
              <div
                className="h-8 w-8 rounded-full shadow-sm"
                style={{ backgroundColor: preset.value }}
              />
              {selectedColor.toLowerCase() === preset.value.toLowerCase() && (
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-2.5 w-2.5" />
                </div>
              )}
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Depth Selector
// ============================================================================

function DepthSelector({
  selectedDepth,
  onSelect,
}: {
  selectedDepth: ThemeDepth
  onSelect: (depth: ThemeDepth) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Control how much of the interface is affected by your color theme.
      </p>
      <div className="space-y-3">
        {themeDepthOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={cn(
              'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all',
              selectedDepth === option.value
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <div className="flex-1">
              <div className="font-medium text-foreground">{option.label}</div>
              <div className="text-sm text-muted-foreground">
                {option.description}
              </div>
            </div>
            {selectedDepth === option.value && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Font Selector
// ============================================================================

function FontSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose a font that fits your style.
      </p>
      <div className="space-y-2">
        {fontConfigs.map((font) => (
          <FontCard
            key={font.id}
            font={font}
            selected={selectedId === font.id}
            onSelect={() => onSelect(font.id)}
          />
        ))}
      </div>
    </div>
  )
}

function FontCard({
  font,
  selected,
  onSelect,
}: {
  font: FontConfig
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg font-bold text-foreground"
        style={{ fontFamily: font.name }}
      >
        Aa
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{font.name}</div>
        <div className="text-sm text-muted-foreground">{font.description}</div>
      </div>
      {selected && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </div>
      )}
    </button>
  )
}
