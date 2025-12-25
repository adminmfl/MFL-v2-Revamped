/**
 * useLeagueNormalization Hook
 * Fetches league data including normalization settings and team size variance
 */

import { useEffect, useState } from 'react';
import { getTeamSizeStats } from '@/lib/utils/normalization';

export interface TeamSizeVariance {
  hasVariance: boolean;
  minSize: number;
  maxSize: number;
  avgSize: number;
}

export interface LeagueNormalizationData {
  normalize_points_by_team_size: boolean;
  teamSizeVariance: TeamSizeVariance;
  isLoading: boolean;
  error: string | null;
}

export function useLeagueNormalization(leagueId: string): LeagueNormalizationData {
  const [data, setData] = useState<LeagueNormalizationData>({
    normalize_points_by_team_size: false,
    teamSizeVariance: {
      hasVariance: false,
      minSize: 0,
      maxSize: 0,
      avgSize: 0,
    },
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchLeagueData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));

        const response = await fetch(`/api/leagues/${leagueId}/teams`);
        if (!response.ok) {
          throw new Error('Failed to fetch league data');
        }

        const result = await response.json();
        const leagueData = result.data?.league;
        const variance = result.data?.teamSizeVariance;

        if (!leagueData || !variance) {
          throw new Error('Invalid league data');
        }

        setData({
          normalize_points_by_team_size: leagueData.normalize_points_by_team_size || false,
          teamSizeVariance: variance,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        console.error('Error fetching league normalization data:', err);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    };

    if (leagueId) {
      fetchLeagueData();
    }
  }, [leagueId]);

  return data;
}
