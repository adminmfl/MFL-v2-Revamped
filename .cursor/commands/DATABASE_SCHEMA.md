# Database Schema Documentation

**Last Updated:** December 11, 2025

This document provides a comprehensive overview of all database tables in the MFL V2 application. Use this as a reference when creating new features to avoid duplicate tables and understand existing relationships.

---

## Core Tables

### users
**Purpose:** Stores all user accounts in the system

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | PRIMARY KEY | Unique identifier |
| username | VARCHAR | NOT NULL, UNIQUE | User's display name |
| email | VARCHAR | NOT NULL, UNIQUE | User's email address |
| password_hash | VARCHAR | NOT NULL | Hashed password |
| phone | VARCHAR | | User's phone number |
| date_of_birth | DATE | | User's date of birth |
| gender | VARCHAR | | User's gender |
| is_active | BOOLEAN | DEFAULT true | Account active status |
| created_by | UUID | FK → users(user_id) | User who created this record |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | User who last modified |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Note:** In NextAuth context, this table is referenced as `profiles` in some API endpoints.

---

## League Management

### leagues
**Purpose:** Stores all leagues in the system

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| league_id | UUID | PRIMARY KEY | Unique identifier |
| league_name | VARCHAR | NOT NULL, UNIQUE | League display name |
| start_date | DATE | NOT NULL | League start date |
| end_date | DATE | NOT NULL | League end date |
| is_active | BOOLEAN | DEFAULT true | League active status |
| created_by | UUID | FK → users(user_id) | League creator (Host) |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | Last modifier |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Note:** This table does NOT have the following fields (which are referenced in code but don't exist):
- `host_id`
- `status`
- `is_exclusive`
- `is_public`
- `num_teams`
- `team_size`
- `rest_days`
- `stripe_product_id`
- `league_code`

### leaguemembers
**Purpose:** Links users to leagues and their teams within those leagues

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| league_member_id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | NOT NULL, FK → users(user_id) | User in the league |
| team_id | UUID | FK → teams(team_id) | User's team (nullable) |
| league_id | UUID | NOT NULL, FK → leagues(league_id) | League reference |
| created_by | UUID | FK → users(user_id) | Who added this member |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | Last modifier |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Note:** Also has FK constraints to teamleagues for team/league combinations

### leagueinvites
**Purpose:** Tracks pending invitations to join leagues

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| league_id | UUID | NOT NULL, FK → leagues(league_id) | Target league |
| user_id | UUID | NOT NULL, FK → users(user_id) | Invited user |
| invited_at | TIMESTAMPTZ | DEFAULT NOW() | Invitation timestamp |
| created_by | UUID | FK → users(user_id) | Who sent the invite |

---

## Team Management

### teams
**Purpose:** Stores all teams across all leagues

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| team_id | UUID | PRIMARY KEY | Unique identifier |
| team_name | VARCHAR | NOT NULL, UNIQUE | Team display name |
| created_by | UUID | FK → users(user_id) | Team creator |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | Last modifier |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

### teamleagues
**Purpose:** Links teams to leagues (many-to-many relationship)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| team_id | UUID | NOT NULL, FK → teams(team_id) | Team reference |
| league_id | UUID | NOT NULL, FK → leagues(league_id) | League reference |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| created_by | UUID | FK → users(user_id) | Who created this link |

### teammembers
**Purpose:** Links users to teams with their team-level roles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| team_member_id | UUID | PRIMARY KEY | Unique identifier |
| team_id | UUID | NOT NULL, FK → teams(team_id) | Team reference |
| user_id | UUID | NOT NULL, FK → users(user_id) | User reference |
| role_id | UUID | NOT NULL, FK → roles(role_id) | Team role (Captain, Player) |
| created_by | UUID | FK → users(user_id) | Who added this member |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | Last modifier |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

---

## Roles & Permissions

### roles
**Purpose:** Defines available roles in the system (Admin, Host, Governor, Captain, Player)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| role_id | UUID | PRIMARY KEY | Unique identifier |
| role_name | VARCHAR | NOT NULL, UNIQUE | Role display name |
| created_by | UUID | FK → users(user_id) | Role creator |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | Last modifier |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Standard Roles:**
- **Admin** - Platform-level administrator
- **Host** - League owner/creator
- **Governor** - League administrator
- **Captain** - Team leader
- **Player** - Team member

### assignedrolesforleague
**Purpose:** Assigns league-level roles to users (Host, Governor)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| league_id | UUID | NOT NULL, FK → leagues(league_id) | League reference |
| user_id | UUID | NOT NULL, FK → users(user_id) | User reference |
| role_id | UUID | NOT NULL, FK → roles(role_id) | Assigned role |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | Assignment timestamp |
| created_by | UUID | FK → users(user_id) | Who assigned the role |

---

## Activities & Workouts

### activities
**Purpose:** Defines available workout activities for leagues

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| activity_id | UUID | PRIMARY KEY | Unique identifier |
| activity_name | VARCHAR | NOT NULL, UNIQUE | Activity name (e.g., Running, Cycling) |
| description | TEXT | | Activity description |
| created_by | UUID | FK → users(user_id) | Activity creator |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | Last modifier |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

### leagueactivities
**Purpose:** Links activities to leagues (leagues can enable specific activities)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| league_id | UUID | NOT NULL, FK → leagues(league_id) | League reference |
| activity_id | UUID | NOT NULL, FK → activities(activity_id) | Activity reference |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| created_by | UUID | FK → users(user_id) | Who enabled this activity |

### effortentry
**Purpose:** Stores all workout/effort submissions from users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| league_member_id | UUID | NOT NULL, FK → leaguemembers(league_member_id) | Member who submitted |
| date | DATE | NOT NULL | Workout date |
| type | VARCHAR | NOT NULL | Entry type (workout/rest) |
| workout_type | VARCHAR | | Activity type |
| duration | INTEGER | | Duration in minutes |
| distance | NUMERIC | | Distance covered |
| steps | INTEGER | | Step count |
| holes | INTEGER | | Golf holes played |
| rr_value | NUMERIC | | RR (Recovery/Rest) value |
| status | ENUM | DEFAULT 'pending' | Approval status (pending/approved/rejected) |
| proof_url | VARCHAR | | URL to proof image |
| created_by | UUID | FK → users(user_id) | Entry creator |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | Last modifier |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Note:** In admin API, this table is referenced as `effort_entries`

---

## Challenges

### specialchallenges
**Purpose:** Stores challenge instances created within leagues

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| challenge_id | UUID | PRIMARY KEY | Unique identifier |
| league_id | UUID | NOT NULL, FK → leagues(league_id) | League this challenge belongs to |
| name | VARCHAR | NOT NULL | Challenge name |
| start_date | DATE | NOT NULL | Challenge start date |
| end_date | DATE | NOT NULL | Challenge end date |
| doc_url | VARCHAR | | URL to challenge rules document |
| created_by | UUID | FK → users(user_id) | Challenge creator |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | Last modifier |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

### leagueschallenges
**Purpose:** Links challenges to leagues (many-to-many)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| league_id | UUID | NOT NULL, FK → leagues(league_id) | League reference |
| challenge_id | UUID | NOT NULL, FK → specialchallenges(challenge_id) | Challenge reference |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| created_by | UUID | FK → users(user_id) | Who linked the challenge |

### specialchallengeindividualuserscore
**Purpose:** Tracks individual user scores in challenges

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| challenge_id | UUID | NOT NULL, FK → specialchallenges(challenge_id) | Challenge reference |
| league_member_id | UUID | NOT NULL, FK → leaguemembers(league_member_id) | Member reference |
| league_id | UUID | FK → leagues(league_id) | League reference |
| score | NUMERIC | DEFAULT 0 | User's score |
| created_by | UUID | FK → users(user_id) | Score creator |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | Last modifier |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

### specialchallengeteamscore
**Purpose:** Tracks team scores in challenges

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| challenge_id | UUID | NOT NULL, FK → specialchallenges(challenge_id) | Challenge reference |
| team_id | UUID | NOT NULL, FK → teams(team_id) | Team reference |
| league_id | UUID | NOT NULL, FK → leagues(league_id) | League reference |
| score | NUMERIC | DEFAULT 0 | Team's score |
| created_by | UUID | FK → users(user_id) | Score creator |
| created_date | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| modified_by | UUID | FK → users(user_id) | Last modifier |
| modified_date | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

---

## Admin Panel Tables (NEW)

### activity_types
**Purpose:** Admin-configurable activity templates that hosts can use

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | TEXT | NOT NULL | Activity name |
| category | TEXT | NOT NULL | Category: cardio, strength, sport, other |
| min_duration | INTEGER | | Minimum duration in minutes |
| requires_distance | BOOLEAN | DEFAULT false | Whether distance is required |
| requires_steps | BOOLEAN | DEFAULT false | Whether steps are required |
| requires_holes | BOOLEAN | DEFAULT false | Whether holes are required (golf) |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Default Data:** Running, Cycling, Weight Training, Golf, Swimming, Yoga, Walking

**RLS Policies:**
- Anyone can read active activities
- Only admins can create/update/delete

### challenge_templates
**Purpose:** Admin-configurable challenge templates that hosts can use

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | TEXT | NOT NULL | Template name |
| description | TEXT | | Template description |
| category | TEXT | NOT NULL | Category: team, individual, mixed |
| scoring_type | TEXT | NOT NULL | Scoring: points, time, distance, count |
| default_duration | INTEGER | | Default duration in days |
| rules_pdf_url | TEXT | | URL to rules PDF |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Default Data:** Step Challenge, Distance Marathon, Individual Sprint, Team Workout Challenge

**RLS Policies:**
- Anyone can read active challenges
- Only admins can create/update/delete

### payments
**Purpose:** Payment records (existing table - structure to be documented)
- Used for payment processing
- Structure depends on existing implementation

### financial_transactions
**Purpose:** Financial transaction records for admin tracking (broader scope than payments)
- Tracks payments, refunds, payouts, and subscriptions
- Used by admin panel for financial reporting

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FK → users.user_id | User reference |
| amount | DECIMAL(10,2) | NOT NULL | Transaction amount |
| type | TEXT | NOT NULL | Type: payment, refund, payout, subscription |
| status | TEXT | NOT NULL | Status: pending, completed, failed, cancelled |
| payment_method | TEXT | | Payment method used |
| description | TEXT | | Transaction description |
| metadata | JSONB | | Additional metadata |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**RLS Policies:**
- Users can read their own financial_transactions
- Admins can read all financial_transactions
- Only admins can create/update/delete

### subscriptions
**Purpose:** Tracks user subscription plans

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FK → auth.users(id) | User reference |
| plan_id | TEXT | NOT NULL | Subscription plan identifier |
| status | TEXT | NOT NULL | Status: active, cancelled, expired, trial |
| start_date | TIMESTAMPTZ | NOT NULL | Subscription start date |
| end_date | TIMESTAMPTZ | | Subscription end date |
| auto_renew | BOOLEAN | DEFAULT true | Auto-renewal enabled |
| amount | DECIMAL(10,2) | | Subscription amount |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**RLS Policies:**
- Users can read their own subscriptions
- Admins can read all subscriptions
- Only admins can create/update/delete

---

## Authentication

### email_otps
**Purpose:** Stores email OTP codes for authentication

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PRIMARY KEY | Unique identifier |
| email | TEXT | NOT NULL | User's email |
| otp | TEXT | NOT NULL | One-time password |
| expires_at | TIMESTAMPTZ | NOT NULL | Expiration timestamp |
| used | BOOLEAN | NOT NULL, DEFAULT false | Whether OTP has been used |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

## Database Functions

### get_admin_stats()
Returns platform-wide statistics for admin dashboard
- Total users, active users
- Total leagues, active leagues
- Total teams
- Pending submissions
- Total revenue, monthly revenue

### get_financial_stats()
Returns detailed financial analytics
- Revenue breakdown (total, monthly, weekly, daily)
- Percentage changes vs previous periods
- Transaction count, active subscriptions
- Pending payouts, refund rate

### get_user_stats_admin(search_query TEXT, status_filter TEXT)
Returns user list with statistics for admin panel
- Supports search by email/username
- Filter by active/inactive status
- Returns leagues joined count and last active date

### get_league_stats_admin(search_query TEXT)
Returns league list with statistics
- Supports search by league name
- Returns member count and team count
- Includes host information

---

## Important Notes

### Naming Conventions
- Some tables use different naming in code vs database:
  - `users` table → Referenced as `profiles` in some contexts
  - `effortentry` table → Referenced as `effort_entries` in admin API

### Foreign Key References
- Most tables have audit fields: `created_by`, `created_date`, `modified_by`, `modified_date`
- All UUIDs use `gen_random_uuid()` for generation
- Most timestamps use `timestamp with time zone` (TIMESTAMPTZ)

### Row Level Security (RLS)
- All admin panel tables have RLS enabled
- Admin role is checked via assignedrolesforleague join with roles table
- Users can only access their own data unless they're admins

### Indexes
Key indexes exist on:
- `financial_transactions.user_id`, `financial_transactions.created_at`
- `subscriptions.user_id`, `subscriptions.status`

---

## Migration History

1. **Initial Schema** - Core tables (users, leagues, teams, activities, challenges)
2. **20241211000001_admin_panel_schema.sql** - Added financial_transactions, subscriptions (Note: activities and specialchallenges already exist, payments table also exists separately)
3. **20241211000002_admin_functions.sql** - Added admin analytics functions

---

## Schema Validation

Before creating new tables, check:
1. Does a similar table already exist?
2. Can existing tables be extended instead of creating new ones?
3. Do foreign key relationships make sense?
4. Are RLS policies needed?
5. Should audit fields (created_by, modified_by) be included?

---

**For Questions or Updates:**
Contact the development team or update this document when schema changes are made.
