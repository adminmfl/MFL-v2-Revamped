import { Suspense } from "react";

// ============================================================================
// Loading Fallback
// ============================================================================

function AuthLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

// ============================================================================
// AuthLayout Component
// ============================================================================

/**
 * AuthLayout - Layout wrapper for authentication pages.
 *
 * Features:
 * - Suspense boundary for client components using useSearchParams
 * - Consistent styling across auth pages
 * - Minimal wrapper to allow page-level customization
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      {children}
    </Suspense>
  );
}
