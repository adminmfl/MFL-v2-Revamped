'use client';

import { Dumbbell } from 'lucide-react';

export function DumbbellLoading({ label }: { label: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 lg:px-6">
      <div className="relative">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Dumbbell className="size-8 text-primary" />
        </div>
        <div className="absolute inset-0 size-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
    </div>
  );
}

export default DumbbellLoading;
