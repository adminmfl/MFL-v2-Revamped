'use client';

/**
 * Layout for public team invite pages
 * Does not require authentication - allows anyone to view invite details
 */
import { SessionProvider } from 'next-auth/react';

export default function TeamInviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
