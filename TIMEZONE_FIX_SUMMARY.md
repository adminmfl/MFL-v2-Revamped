# League Status & Timezone Consistency Fix

## Problem Statement

The application had inconsistent league status determination and submission cutoff behavior due to timezone handling issues. This caused different users in different timezones to experience different behaviors, with some users seeing:

- League showing as "Active" on dashboard while submission page showed "League ended"
- Submissions being blocked even though the league end date hadn't passed in their timezone
- Different status on different pages (dashboard vs submission page)

## Root Causes Identified

### 1. Server Timezone Dependency
`deriveLeagueStatus()` in `src/lib/services/leagues.ts` was using the server's local timezone:
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0); // Uses server's local timezone
```

This meant:
- Status transitions happened at midnight in the server's timezone
- Different behavior for users in different timezones
- No deterministic global cutoff time

### 2. Mixed Timezone Sources
- **Submission cutoff** (`src/app/api/entries/upsert/route.ts`): Used user's timezone from request
- **League status** (`deriveLeagueStatus`): Used server's local timezone
- **Frontend check** (`src/app/(app)/leagues/[id]/submit/page.tsx`): Used browser's local timezone

### 3. Inconsistent Comparison Logic
Different parts of the codebase checked league completion differently:
- Some checked `status === 'completed'` only
- Some compared dates directly without deriving status
- Some used both checks but with different date parsing logic

### 4. Ambiguous End Date Semantics
The `end_date` field was interpreted inconsistently:
- Some code treated it as "league ends at start of this day"
- Others treated it as "league ends at end of this day"
- No clear specification of which timezone should be used

## Solution Implemented

### 1. UTC-Based Status Derivation
Updated `deriveLeagueStatus()` to use UTC timezone exclusively:

```typescript
// Get current UTC date at start of day (00:00:00 UTC)
const nowUtc = new Date();
const todayUtc = new Date(Date.UTC(
  nowUtc.getUTCFullYear(),
  nowUtc.getUTCMonth(),
  nowUtc.getUTCDate(),
  0, 0, 0, 0
));

// Parse dates in UTC
const parseYmdUtc = (ymd?: string | null): Date | null => {
  // ... parsing logic ...
  const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  return dt;
};

// League is completed only AFTER the end_date has fully passed
// Comparison: today > end_date (not >=)
if (todayUtc.getTime() > endDt.getTime()) {
  derivedStatus = 'completed';
}
```

### 2. Clear End Date Semantics
Defined and documented that:
- `start_date`: League becomes active at **00:00:00 UTC** on this date
- `end_date`: League remains active until **23:59:59 UTC** on this date
- Status transitions to 'completed' only **AFTER** end_date has fully passed in UTC
- Submissions are allowed throughout the entire end_date day (UTC)

### 3. Single Source of Truth
Made `deriveLeagueStatus()` the single source of truth for league status:

**Updated files:**
- ✅ `src/app/api/entries/upsert/route.ts` - Uses `deriveLeagueStatus()` for submission cutoff
- ✅ `src/app/api/leagues/[id]/report/route.ts` - Uses `deriveLeagueStatus()` for report access
- ✅ `src/app/api/leagues/join-by-code/route.ts` - Uses `deriveLeagueStatus()` for join validation
- ✅ `src/lib/services/invites.ts` - Uses `deriveLeagueStatus()` for invite validation
- ✅ `src/app/(app)/leagues/[id]/submit/page.tsx` - Frontend uses same UTC logic

### 4. Frontend Consistency
Updated frontend completion check to match backend logic:

```typescript
const isLeagueCompleted = React.useMemo(() => {
  // Parse end_date as UTC date at start of day
  const [y, mo, d] = activeLeague.end_date.split('-').map(Number);
  const endDateUtc = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  
  // Get current UTC date at start of day
  const nowUtc = new Date();
  const todayUtc = new Date(Date.UTC(
    nowUtc.getUTCFullYear(),
    nowUtc.getUTCMonth(),
    nowUtc.getUTCDate(),
    0, 0, 0, 0
  ));
  
  // League is completed only AFTER end_date has fully passed
  return todayUtc.getTime() > endDateUtc.getTime();
}, [activeLeague]);
```

## Files Modified

1. **`src/lib/services/leagues.ts`**
   - Updated `deriveLeagueStatus()` to use UTC dates
   - Added comprehensive documentation on timezone handling

2. **`src/app/api/entries/upsert/route.ts`**
   - Removed date comparison logic
   - Now uses `deriveLeagueStatus()` for consistent status checking
   - Imported `deriveLeagueStatus` from leagues service

3. **`src/app/(app)/leagues/[id]/submit/page.tsx`**
   - Updated `isLeagueCompleted` calculation to use UTC
   - Matches backend logic exactly

4. **`src/app/api/leagues/[id]/report/route.ts`**
   - Updated to use `deriveLeagueStatus()` instead of custom date comparison
   - Imported `deriveLeagueStatus` from leagues service

5. **`src/app/api/leagues/join-by-code/route.ts`**
   - Added `deriveLeagueStatus()` usage for completion check
   - Ensures consistent behavior when joining leagues

6. **`src/lib/services/invites.ts`**
   - Updated `validateInviteCode()` to use `deriveLeagueStatus()`
   - Updated `validateTeamInviteCode()` to use `deriveLeagueStatus()`
   - Returns derived status for UI consistency

## Behavior Changes

### Before Fix
- **User in IST (UTC+5:30)**: League with end_date=2026-01-08 would show as ended on Jan 9 at 4:00 AM IST
- **User in PST (UTC-8)**: Same league might still show as active on Jan 8 at 5:00 PM PST
- **Dashboard vs Submit page**: Inconsistent status display

### After Fix
- **All users**: League with end_date=2026-01-08 remains active until Jan 9 00:00:00 UTC
- **Consistent**: Dashboard, submission page, join flow all show the same status
- **Deterministic**: Status transition happens at the same moment for all users globally

## Example Timeline

For a league with `end_date = "2026-01-08"`:

| UTC Time | Status | Can Submit? | Notes |
|----------|--------|-------------|-------|
| 2026-01-08 23:59:59 | active | ✅ Yes | Last moment of end_date |
| 2026-01-09 00:00:00 | completed | ❌ No | First moment after end_date |

All users worldwide see the same status at these exact moments in UTC time.

## Testing Recommendations

1. **Unit Tests**: Test `deriveLeagueStatus()` with various date scenarios
2. **Integration Tests**: Verify submission cutoff matches status derivation
3. **Timezone Tests**: Simulate users in different timezones (IST, PST, UTC)
4. **Edge Cases**: Test transitions at exactly 00:00:00 UTC on end_date + 1

## Migration Notes

- **No database migration required**: Existing `end_date` values work as-is
- **Behavioral change**: Leagues now stay active slightly longer (until UTC midnight instead of server local midnight)
- **Users may notice**: Submissions accepted for a few more hours on end_date day
- **Backwards compatible**: Old status values ('ended', 'scheduled') are normalized to standard values

## Future Improvements

1. **League-specific timezone**: Consider allowing league hosts to set a league timezone
2. **Display timezone**: Show users when exactly the league will end in their local time
3. **Grace period**: Consider adding a configurable grace period after end_date
4. **Audit logging**: Log status transitions with precise UTC timestamps
