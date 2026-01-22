/**
 * Challenge Point Distribution Utilities
 * Handles fair point distribution for team challenges based on team size
 */

export interface ChallengePointDistribution {
  totalTeamPoints: number;
  teamSize: number;
  maxPointsPerMember: number;
  description: string;
}

/**
 * Calculate max points per team member for a team challenge
 * 
 * For team challenges with point normalization:
 * - Total team points are divided equally among team members
 * - This ensures fairness: a 5-person team and 10-person team 
 *   with equal effort get equal total scores
 * 
 * @param totalTeamPoints - Total points available for the team in this challenge
 * @param teamSize - Number of members in the team
 * @returns Max points each member can earn from this submission
 */
export function calculateMaxPointsPerMember(
  totalTeamPoints: number,
  teamSize: number
): number {
  if (teamSize <= 0 || totalTeamPoints <= 0) return 0;
  return Math.round(totalTeamPoints / teamSize * 100) / 100; // Round to 2 decimals
}

/**
 * Get distribution info for display to host
 * Shows how points will be divided among team members (host context only)
 * Note: Host sees internal cap for fairness context, players only see visible cap
 */
export function getPointDistributionInfo(
  totalTeamPoints: number,
  teamSize: number,
  challengeType: 'individual' | 'team' | 'sub_team'
): ChallengePointDistribution {
  if (challengeType !== 'team') {
    // For non-team challenges, no distribution needed
    return {
      totalTeamPoints,
      teamSize,
      maxPointsPerMember: totalTeamPoints,
      description: `Each member can earn up to ${totalTeamPoints} points.`,
    };
  }

  const maxPerMember = calculateMaxPointsPerMember(totalTeamPoints, teamSize);

  return {
    totalTeamPoints,
    teamSize,
    maxPointsPerMember: maxPerMember,
    description: `Points will be fairly distributed among ${teamSize} members. Each can contribute up to ${maxPerMember} points.`,
  };
}

/**
 * Validate awarded points don't exceed the per-member limit for team challenges
 * Note: Backend enforces internal cap (I = total/teamSize)
 */
export function validateTeamChallengePoints(
  awardedPoints: number,
  totalTeamPoints: number,
  teamSize: number,
  challengeType: 'individual' | 'team' | 'sub_team'
): { valid: boolean; maxAllowed: number; reason?: string } {
  if (challengeType !== 'team') {
    // For non-team challenges, points can't exceed total
    return {
      valid: awardedPoints <= totalTeamPoints,
      maxAllowed: totalTeamPoints,
      reason: awardedPoints > totalTeamPoints ? `Points cannot exceed challenge total of ${totalTeamPoints}` : undefined,
    };
  }

  const maxPerMember = calculateMaxPointsPerMember(totalTeamPoints, teamSize);

  return {
    valid: awardedPoints <= maxPerMember,
    maxAllowed: maxPerMember,
    reason: awardedPoints > maxPerMember 
      ? `Points exceed the internal per-member limit`
      : undefined,
  };
}
