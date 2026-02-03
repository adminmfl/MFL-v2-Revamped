# MFL v2 - Copilot Instructions

## Project Overview

**My Fitness League (MFL)** is a Next.js 14+ fitness competition platform using App Router, Supabase (PostgreSQL), NextAuth.js, and Razorpay for payments. Users join leagues, form teams, submit workout entries, and compete through three distinct challenge types with complex normalization scoring.

## Architecture & Data Flow

### Authentication & Session
- **NextAuth.js** with JWT strategy (365-day sessions)
- Dual auth providers: Google OAuth + Credentials (bcryptjs)
- Session syncs with Supabase `users` table on every request via JWT callback
- Proxy ([src/proxy.ts](src/proxy.ts)) protects routes and enforces profile completion
- **Critical**: All API routes use `getServerSession(authOptions)` for auth - never expose service role client to browser

### Database Access Patterns
**Two Supabase clients** ([src/lib/supabase/client.ts](src/lib/supabase/client.ts)):
1. **`getSupabase()`**: Client-side, respects RLS policies
2. **`getSupabaseServiceRole()`**: Server-only, bypasses RLS - throws error if used in browser

**When to use service role:**
- Pre-authentication operations (login, signup)
- Admin operations where RLS would block legitimate actions
- Bulk operations requiring elevated permissions

### Role-Based Access Control (RBAC)

**Two distinct role systems:**
1. **Platform roles** (`platform_role` in users table): `admin` | `user`
2. **League roles** (`league_members` table): `host` | `governor` | `captain` | `player`

**League role hierarchy** (descending authority):
- `host`: Creates/configures/deletes league, assigns governors
- `governor`: League-wide oversight, validates any submission
- `captain`: Manages own team, validates team submissions only
- `player`: Submits workouts, views leaderboards

**Implementation files:**
- [src/lib/rbac/permissions.ts](src/lib/rbac/permissions.ts) - Permission logic
- [src/lib/rbac/route-protection.ts](src/lib/rbac/route-protection.ts) - Route access control
- [src/contexts/league-context.tsx](src/contexts/league-context.tsx) - League state + role switching

**Key pattern:** Users can have MULTIPLE roles per league (e.g., host + player). Use `LeagueContext` to:
- Get `availableRoles` and `highestRole`
- Switch active `currentRole` for different UI perspectives
- Check `isAlsoPlayer` to determine if host/governor also participates

## Development Workflows

### Local Development
```bash
pnpm dev                   # Next.js dev server (localhost:3000)
pnpm lint                  # ESLint (TypeScript errors currently ignored via next.config.mjs)
pnpm test                  # Jest unit tests (--runInBand)
```

### Database Operations
```bash
pnpm db:reset              # Wipe + reapply migrations (DESTRUCTIVE)
pnpm db:push               # Push schema changes to Supabase
pnpm db:migrate            # Run pending migrations only
pnpm db:seed               # Run seed script
pnpm db:setup              # Push + seed (fresh setup)
pnpm wipe:storage          # Clear Supabase storage buckets
```

**Schema location:** [supabase/migrations/](supabase/migrations/)
**Migrations are versioned** - apply sequentially, never edit applied migrations.

### Environment Variables
All Supabase credentials in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side safe)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, NEVER expose)
- Storage buckets: `NEXT_PUBLIC_PROOF_BUCKET`, `NEXT_PUBLIC_LEAGUE_LOGOS_BUCKET`, etc.

## Code Conventions

### Import Paths
Use `@/*` alias ([tsconfig.json](tsconfig.json)):
```typescript
import { getSupabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
```

### Component Patterns
- **UI components:** [src/components/ui/](src/components/ui/) - shadcn/ui primitives
- **Styling:** Tailwind CSS 4 + `cn()` utility ([src/lib/utils.ts](src/lib/utils.ts)) for conditional classes
- **State management:** React hooks + contexts (no global state library)
- **Data fetching:** Server Components fetch directly, Client Components use custom hooks ([src/hooks/](src/hooks/))

### API Route Structure
**Standard pattern** ([src/app/api/](src/app/api/)):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Business logic using getSupabaseServiceRole() or getSupabase()
  return NextResponse.json({ data, success: true });
}
```

**Always:**
- Validate session first
- Use Zod for request body validation
- Return consistent `{ success, data?, error? }` shape
- Use appropriate HTTP status codes

### Timezone Handling
**Critical:** League operations are timezone-aware ([src/lib/utils/timezone.ts](src/lib/utils/timezone.ts))
- Prefer IANA timezones (`America/Los_Angeles`) via `Intl.DateTimeFormat`
- Fallback to timezone offset minutes if IANA unavailable
- Format dates as `YYYY-MM-DD` using `formatYMD()` or `getUserLocalDateYMD()`
- **Never assume server/client timezones match**

## Testing
- Unit tests: [tests/unit/](tests/unit/) - Jest + ts-jest
- Current coverage: Minimal (timezone utils tested)
- **No integration/e2e tests running** - directories exist but empty

## Deployment & Infrastructure
- **Platform:** Vercel
- **Cron jobs:** [vercel.json](vercel.json) defines scheduled tasks:
  - Auto-approve submissions (hourly)
  - Auto rest-day assignments (11 AM daily)
  - Cleanup abandoned payments (every 6 hours)
- **Database:** Supabase hosted PostgreSQL with RLS
- **Storage:** Supabase Storage for proofs, logos, documents
- **Payments:** Razorpay integration ([src/lib/razorpay.ts](src/lib/razorpay.ts))

## Common Pitfalls

1. **Service role client in browser**: Always check `typeof window !== 'undefined'` before service role operations
2. **League role confusion**: A user can be `host` of League A but `player` in League B - always check role for specific league
3. **Date comparisons**: Always convert to user's timezone before comparing with league start/end dates
4. **TypeScript errors**: Build currently ignores TS errors (`ignoreBuildErrors: true`) - fix incrementally, don't rely on this
5. **RLS policies**: If query fails mysteriously, check if you need service role client instead of regular client

## Key Services

All business logic in [src/lib/services/](src/lib/services/):
- `leagues.ts` - League CRUD, member management
- `teams.ts` - Team operations, assignments
- `entries.ts` - Workout submission processing
- `challenges/` - Challenge scoring and validation
- `payments.ts` - Razorpay order creation/verification
- `leaderboard.ts` - Leaderboard calculations with normalization

**Pattern**: Services accept primitive arguments, return typed data, throw errors for exceptions.

## Additional Resources

- [docs/](docs/) - Additional documentation (if any)
- Database schema: See latest migration in [supabase/migrations/](supabase/migrations/)

---

**When in doubt:** Check existing API routes for patterns, use service role client sparingly, and always validate user permissions before mutations.
