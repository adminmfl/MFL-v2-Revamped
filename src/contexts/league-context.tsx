'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

// ============================================================================
// Types
// ============================================================================

export type LeagueRole = 'host' | 'governor' | 'captain' | 'player';
export type LeagueStatus = 'draft' | 'launched' | 'active' | 'completed';

export interface LeagueWithRoles {
  league_id: string;
  name: string;
  description: string | null;
  status: LeagueStatus;
  start_date: string | null;
  end_date: string | null;
  num_teams: number;
  team_size: number;
  is_public: boolean;
  is_exclusive: boolean;
  invite_code: string | null;
  roles: LeagueRole[];
  team_id: string | null;
  team_name: string | null;
  is_host: boolean;
}

interface LeagueContextType {
  activeLeague: LeagueWithRoles | null;
  userLeagues: LeagueWithRoles[];
  setActiveLeague: (league: LeagueWithRoles | null) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface LeagueProviderProps {
  children: ReactNode;
}

/**
 * LeagueProvider - Manages the user's leagues and active league context.
 *
 * Features:
 * - Fetches all leagues the user belongs to with their roles
 * - Persists active league selection in localStorage
 * - Provides league switching functionality
 */
export function LeagueProvider({ children }: LeagueProviderProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [activeLeague, setActiveLeagueState] = useState<LeagueWithRoles | null>(null);
  const [userLeagues, setUserLeagues] = useState<LeagueWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's leagues with roles
  const fetchUserLeagues = useCallback(async () => {
    if (!session?.user?.id) {
      setIsLoading(false);
      setUserLeagues([]);
      setActiveLeagueState(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/leagues');

      if (!response.ok) {
        // Don't throw on auth errors - user might not be fully logged in yet
        if (response.status === 401) {
          setUserLeagues([]);
          setActiveLeagueState(null);
          return;
        }
        console.error('Failed to fetch leagues:', response.status);
        return;
      }

      const data = await response.json();
      const leagues: LeagueWithRoles[] = data.leagues || [];

      setUserLeagues(leagues);

      // Restore active league from localStorage or default to first
      const savedLeagueId = localStorage.getItem('activeLeagueId');
      if (savedLeagueId) {
        const savedLeague = leagues.find(l => l.league_id === savedLeagueId);
        if (savedLeague) {
          setActiveLeagueState(savedLeague);
        } else if (leagues.length > 0) {
          // Saved league no longer exists, use first available
          setActiveLeagueState(leagues[0]);
          localStorage.setItem('activeLeagueId', leagues[0].league_id);
        }
      } else if (leagues.length > 0) {
        // No saved preference, use first league
        setActiveLeagueState(leagues[0]);
        localStorage.setItem('activeLeagueId', leagues[0].league_id);
      }
    } catch (err) {
      console.error('Failed to fetch user leagues:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leagues');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Fetch on mount and session change
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    fetchUserLeagues();
  }, [sessionStatus, fetchUserLeagues]);

  // Set active league with persistence
  const setActiveLeague = useCallback((league: LeagueWithRoles | null) => {
    setActiveLeagueState(league);
    if (league) {
      localStorage.setItem('activeLeagueId', league.league_id);
    } else {
      localStorage.removeItem('activeLeagueId');
    }
  }, []);

  return (
    <LeagueContext.Provider
      value={{
        activeLeague,
        userLeagues,
        setActiveLeague,
        isLoading,
        error,
        refetch: fetchUserLeagues
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
}

export default LeagueProvider;
