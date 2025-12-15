"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// ============================================================================
// ThemeProvider Component
// ============================================================================

/**
 * ThemeProvider - Wraps the application with next-themes provider.
 *
 * Features:
 * - Supports light, dark, and system themes
 * - Persists theme preference in localStorage
 * - Prevents flash of incorrect theme on load
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export default ThemeProvider;
