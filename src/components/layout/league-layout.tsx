'use client';

import { RoleProvider } from '@/contexts/role-context';
import { ReactNode } from 'react';

interface LeagueLayoutProps {
  children: ReactNode;
  leagueId?: string;
}

/**
 * Wrapper component for pages within a league context
 * Provides role-based access control
 */
export function LeagueLayout({ children, leagueId }: LeagueLayoutProps) {
  return (
    <RoleProvider leagueId={leagueId}>
      {children}
    </RoleProvider>
  );
}
