'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'
import type { Session } from 'next-auth'

export default function AuthProvider({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  }, []);
  return (
    // Disable client-side session polling to avoid repeated /api/auth/session calls
    <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  )
}


