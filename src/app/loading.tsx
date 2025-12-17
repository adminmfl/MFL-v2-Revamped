import { Loader2, Dumbbell } from 'lucide-react';

// ============================================================================
// Loading Page
// ============================================================================

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Dumbbell className="size-8 text-primary" />
        </div>
        <div className="absolute inset-0 size-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
    </div>
  );
}
