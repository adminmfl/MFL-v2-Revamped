# Challenge Scoring System - Complete Guide

## Overview
Three challenge types with different scoring behaviors. All must be fair across teams of different sizes.

---

## Design Rule: Proportional Scaling for Team Challenges

To keep team fairness without confusing players, team challenges use proportional scaling:

- **Internal cap (hidden)**: `I = total_team_points / actual_team_size` — backend-only validation limit ensuring fair team pool division
- **Visible cap (shown everywhere)**: `V = total_team_points / max_team_size` — uniform max all players see
- **Visible points formula**: `(awarded_points / I) × V`, capped at V

Result: Players earn proportionally to effort with a shared visible max. No wasted effort, no team-size inflation.

**Example:**
- Total: 300, Max team: 10 → V = 30
- Team A (5 members) → I = 60
- Member earns 50 internally:
  - Visible: (50/60) × 30 = 25
  - Team gets: 50 toward pool
  - Player sees smooth progression, not a cliff

---

## 1. INDIVIDUAL CHALLENGES

### What Host/Governor Sees When Creating/Awarding

```
Challenge Type: Individual
Maximum Points: 100
```

✅ Host sets ONE number: total max points per submission
- No per-member calculation shown
- No team size considerations shown
- Simple: "This challenge is worth up to 100 points"

### How Points Are Awarded

**When player submits:**
- Player receives: 100 points (full amount)
- Team receives: `100 × (max_league_team_size / player's_team_size)` normalized points

**Example:**
- League max team size: 10
- Player's team: 7 members
- Player scores: 100 points on individual challenge

Points awarded:
- Player individual score: +100
- Team score: +100 × (10/7) = +142.86

**Another example:**
- Player's team: 10 members  
- Player scores: 100 points

Points awarded:
- Player individual score: +100
- Team score: +100 × (10/10) = +100

### Why This Works (Fairness)

If all players in a 7-member team score 100 on individual challenges:
- Total raw points: 7 × 100 = 700
- Team normalized points: 700 × (10/7) = 1000

If all players in a 10-member team score 100:
- Total raw points: 10 × 100 = 1000
- Team normalized points: 1000 × (10/10) = 1000

**Result:** Same effort = same team score ✓

### What Player Sees

**In "Challenge Details" / "My Submissions":**
- Challenge name and description
- Max points: 100
- Their submission status and score earned (if approved)

**In "My Summary" / "Team Leaderboard":**
- Individual points: 100 (what they earned)
- (Team leaderboard shows team total which includes normalized individual points, but player doesn't see the normalization math)

❌ Player does NOT see: "Your team will get 142.86 points from this"
❌ Player does NOT see: Normalization formula
✅ Player sees: Clear max points available to earn

---

## 2. TEAM CHALLENGES

### What Host/Governor Sees When Creating/Awarding

```
Challenge Type: Team
Total Points for Team: 300
Max Team Size (league): 10
```

✅ Host sets ONE number: total pool for entire team
✅ Host sees helpful info: "Will be divided fairly among X team members" (internal)
  - Internal helper for host: `I = 300 / team_size` → e.g., 30 (10 members), ~42.86 (7 members)
  - Player-visible cap is uniform across league: `V = 300 / 10 = 30`

### How Points Are Awarded

### How Points Are Awarded

**When member submits:**
- Player-visible points: `(awarded_points / I) × V`, capped at V (proportional scaling)
- Internal contribution to team: awarded_points (up to internal cap I)
- Team receives: Sum of internal contributions (bounded by pool total)

**Caps (enforced server-side):**
- Internal per-member cap (hidden): `I = total_points / team_size`
- Player-visible per-member max (shown): `V = total_points / max_team_size`
  - Example (10 max, total 300): `V = 30` for everyone; for a 7-member team `I ≈ 42.86`

**Backend validation & storage:**
- Validate `requested_points ≤ I` (internal fairness)
- Store `awarded_points = requested_points` (internal value)
- Compute visible points: `(awarded_points / I) × V` (proportional scaling)
- Aggregate team totals using internal contributions (reach team pool fairly)

**Example Scenario:**
- Team challenge total: 300 points, league max size = 10 → `V = 30`
- 7-member team → `I ≈ 42.86`
- Member submits, host awards 50 points
  - Validation: 50 ≤ I (42.86)? ❌ Rejected (over internal cap)
  
- Member submits, host awards 40 points
  - Validation: 40 ≤ I (42.86)? ✅ Approved
  - Player-visible: (40 / 42.86) × 30 ≈ 28 points earned
  - Team pool: 40 (internal contribution)
  - Result: Player sees 28 (proportional); team gets 40 toward 300

### What Player Sees

**In "Challenge Details" / "Submit":**
- Challenge name and clearly labeled per-person max: `Max you can earn: V` (e.g., 30)
- Their submission status and score earned (uses V)

**In "My Summary" / "Team Leaderboard":**
- Their personal points earned: 25
- Team total: Shows all members' contributions combined

❌ Player does NOT see: Internal cap `I`
❌ Player does NOT see: Team-size-based variation
✅ Player sees: A uniform per-person max (V) across the league

---

## 3. SUB-TEAM CHALLENGES

### What Host/Governor Sees When Creating/Awarding

```
Challenge Type: Sub-Team
Maximum Points: 150
```

✅ Host sets ONE number: max points
- Same as individual challenges
- Shows sub-team size reference

### How Points Are Awarded

**When sub-team member submits:**
- Member receives: Points earned (full amount)
- Sub-team receives: Full points
- Parent team receives: Full points (no normalization)

**Example:**
- Sub-team challenge: 150 points
- Member scores: 150

Points awarded:
- Member: +150
- Sub-team: +150
- Parent team: +150

### What Player Sees

**In "Challenge Details":**
- Challenge name and max points: 150
- Appears as sub-team challenge (context indicator)

**In "My Summary":**
- Points earned: 150
- Visible in sub-team leaderboard AND parent team leaderboard

---

## Summary Table

| Aspect | Individual | Team | Sub-Team |
|--------|-----------|------|----------|
| **Host Sets** | Total max points (e.g., 100) | Total pool points (e.g., 300) | Total max points (e.g., 150) |
| **Host Sees** | Clean number | Internal helper: `I = total / team_size` | Clean number |
| **Player Sees in Submit** | Max points available | Uniform per-person max `V = total / max_size` | Max points available |
| **Backend Cap** | None | Internal `I = total / team_size`; Visible `V = total / max_size` | None |
| **Points to Player** | Full earned | `(earned / I) × V` (proportional) | Full earned |
| **Points to Individual/Sub-team** | Full earned | N/A | Full earned |
| **Points to Team** | Normalized (× `max_size / team_size`) | Sum of internal contributions (bounded by pool) | Full earned |
| **Normalization Formula** | `points × (max_size / team_size)` | Proportional scaling: `(earned / I) × V` | None |
| **Fairness Goal** | Equal effort = equal team score | Individual clarity + team fairness | Full pool to team |

---

## Scoring Formula (What Gets Calculated)

### Team Final Score Calculation

```
Team Final Score = Activity Points (normalized) + Challenge Points

Challenge Points = 
    ∑(individual_challenge_points × (max_team_size / team_size))      [normalized]
  + ∑(team_proportional_points)                                       [proportional scaling]
  + ∑(sub_team_challenge_points)                                      [full]
```

### Example: 7-Member Team

**Activity Points:**
- Raw activity: 500 points
- Normalized: 500 × (10/7) = 714.29

**Challenge Points:**
- Individual challenge A: 100 × (10/7) = 142.86
- Individual challenge B: 50 × (10/7) = 71.43
- Team challenge: 3 members submitted 20, 25, 30 = 75 total
- Sub-team challenge: 100

**Total Challenge Points:** 142.86 + 71.43 + 75 + 100 = 389.29

**Team Final Score:** 714.29 + 389.29 = 1103.58

---

## Player Experience Timeline

### When Challenge is Created

Player sees:
- Challenge name, description, type
- **Maximum points: X** (just one number)
- Deadline

### When Player Submits

Player enters:
- Challenge response/proof
- Proposed points (up to maximum)

Backend validates:
- For team challenges:
  - Internal fairness: `proposed_points ≤ I = total_pool / team_size`
  - Player-visible computation: `visible = (proposed / I) × V`
  - Team aggregation uses internal contribution (proposed, up to I)

### When Submission is Reviewed

Player sees:
- Submission status: Pending / Approved / Rejected
- Points awarded (if approved)
- Reviewer feedback

Player does NOT see:
- Normalization formulas
- Per-member calculations
- How their points contribute to team total (that's in team leaderboard)

### When Viewing Leaderboard

Player sees:
- Their personal score (all challenges combined)
- Team leaderboard showing teams' total scores
- Normalized points already baked into totals

Player understands:
- "I earned X points on this challenge"
- "My team is ranked Y with Z total points"
- Never sees the math behind it ✓

---

## Key Principles

1. **Simplicity for Players:** One number shown (max points), no calculations exposed
2. **Fairness Hidden:** Normalization/division logic in backend, not visible to players
3. **Consistency:** Team members can't see unfair looking caps
4. **Backend Strict:** Fair division enforced server-side even if players don't see it; dual caps for team challenges (I vs V)
5. **Transparent for Hosts:** Helpers and context shown so hosts understand what they're setting

