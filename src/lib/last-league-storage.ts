/**
 * Utility functions to manage the user's last visited league
 */

const LAST_LEAGUE_KEY = 'mfl_last_league_id';

/**
 * Save the last visited league ID to localStorage
 */
export function saveLastLeagueId(leagueId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_LEAGUE_KEY, leagueId);
  } catch (err) {
    console.error('Failed to save last league ID:', err);
  }
}

/**
 * Get the last visited league ID from localStorage
 */
export function getLastLeagueId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(LAST_LEAGUE_KEY);
  } catch (err) {
    console.error('Failed to get last league ID:', err);
    return null;
  }
}

/**
 * Clear the last visited league ID from localStorage
 */
export function clearLastLeagueId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LAST_LEAGUE_KEY);
  } catch (err) {
    console.error('Failed to clear last league ID:', err);
  }
}
