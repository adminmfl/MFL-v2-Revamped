/**
 * =====================================================================================
 * Database Seed Script
 * =====================================================================================
 * Seeds the database with essential initial data:
 * - Default roles (Host, Governor, Captain, Player)
 * - Default activities (Running, Cycling, Gym, etc.)
 *
 * This script is idempotent - safe to run multiple times without creating duplicates.
 *
 * Usage:
 *   npx tsx supabase/seed/seed.ts
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * @author MFL Engineering Team
 * @created 2024-12-14
 * =====================================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// =====================================================================================
// ENVIRONMENT CONFIGURATION
// =====================================================================================

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Initialize Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// =====================================================================================
// SEED DATA DEFINITIONS
// =====================================================================================

/**
 * Default roles for RBAC system
 * Role hierarchy: Player < Captain < Governor < Host
 */
const DEFAULT_ROLES = [
  {
    role_name: 'Player',
    description: 'Default participant role - submits workouts and views team data',
  },
  {
    role_name: 'Captain',
    description: 'Team leader - validates team submissions and manages team members',
  },
  {
    role_name: 'Governor',
    description: 'Oversight role - monitors all teams and can override captain decisions',
  },
  {
    role_name: 'Host',
    description: 'League creator - full control over league configuration and operations',
  },
] as const;

/**
 * Default activity types available for workouts
 * These can be customized per league via leagueactivities table
 */
const DEFAULT_ACTIVITIES = [
  {
    activity_name: 'Running',
    description: 'Outdoor or treadmill running - distance and duration tracked',
  },
  {
    activity_name: 'Cycling',
    description: 'Outdoor or stationary cycling - distance and duration tracked',
  },
  {
    activity_name: 'Walking',
    description: 'Walking for fitness - steps and duration tracked',
  },
  {
    activity_name: 'Gym Workout',
    description: 'Strength training, cardio, or mixed gym session',
  },
  {
    activity_name: 'Yoga',
    description: 'Yoga practice - duration tracked',
  },
  {
    activity_name: 'Swimming',
    description: 'Swimming workout - distance and duration tracked',
  },
  {
    activity_name: 'HIIT',
    description: 'High-Intensity Interval Training - duration tracked',
  },
  {
    activity_name: 'Sports',
    description: 'Team sports, tennis, badminton, etc. - duration tracked',
  },
  {
    activity_name: 'Dance',
    description: 'Dance fitness classes or practice - duration tracked',
  },
  {
    activity_name: 'Hiking',
    description: 'Outdoor hiking - distance and duration tracked',
  },
  {
    activity_name: 'CrossFit',
    description: 'CrossFit WOD - duration tracked',
  },
  {
    activity_name: 'Pilates',
    description: 'Pilates workout - duration tracked',
  },
  {
    activity_name: 'Golf',
    description: 'Golf round - holes played tracked',
  },
  {
    activity_name: 'Other',
    description: 'Any other fitness activity not listed',
  },
] as const;

// =====================================================================================
// SEED FUNCTIONS
// =====================================================================================

/**
 * Seeds default roles into the database
 * Idempotent - checks for existing roles before inserting
 *
 * @returns Promise<void>
 */
async function seedRoles(): Promise<void> {
  console.log('📝 Seeding roles...');

  for (const role of DEFAULT_ROLES) {
    // Check if role already exists
    const { data: existingRole, error: checkError } = await supabase
      .from('roles')
      .select('role_id, role_name')
      .eq('role_name', role.role_name)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = not found (expected for new roles)
      console.error(`   ❌ Error checking role "${role.role_name}":`, checkError.message);
      continue;
    }

    if (existingRole) {
      console.log(`   ✓ Role "${role.role_name}" already exists (${existingRole.role_id})`);
      continue;
    }

    // Insert new role
    const { data, error } = await supabase
      .from('roles')
      .insert({
        role_name: role.role_name,
        created_by: null, // System-created roles have no creator
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Error inserting role "${role.role_name}":`, error.message);
    } else {
      console.log(`   ✓ Created role "${role.role_name}" (${data.role_id})`);
    }
  }

  console.log('✅ Roles seeded successfully\n');
}

/**
 * Seeds default activities into the database
 * Idempotent - checks for existing activities before inserting
 *
 * @returns Promise<void>
 */
async function seedActivities(): Promise<void> {
  console.log('🏃 Seeding activities...');

  for (const activity of DEFAULT_ACTIVITIES) {
    // Check if activity already exists
    const { data: existingActivity, error: checkError } = await supabase
      .from('activities')
      .select('activity_id, activity_name')
      .eq('activity_name', activity.activity_name)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`   ❌ Error checking activity "${activity.activity_name}":`, checkError.message);
      continue;
    }

    if (existingActivity) {
      console.log(`   ✓ Activity "${activity.activity_name}" already exists (${existingActivity.activity_id})`);
      continue;
    }

    // Insert new activity
    const { data, error } = await supabase
      .from('activities')
      .insert({
        activity_name: activity.activity_name,
        description: activity.description,
        created_by: null, // System-created activities have no creator
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Error inserting activity "${activity.activity_name}":`, error.message);
    } else {
      console.log(`   ✓ Created activity "${activity.activity_name}" (${data.activity_id})`);
    }
  }

  console.log('✅ Activities seeded successfully\n');
}

/**
 * Validates database connection and schema readiness
 *
 * @returns Promise<boolean> - true if validation passes
 */
async function validateDatabase(): Promise<boolean> {
  console.log('🔍 Validating database connection...');

  try {
    // Test roles table exists
    const { error: rolesError } = await supabase
      .from('roles')
      .select('role_id')
      .limit(1);

    if (rolesError) {
      console.error('   ❌ Roles table not accessible:', rolesError.message);
      console.error('   💡 Have you run migrations? Try: npm run db:push');
      return false;
    }

    // Test activities table exists
    const { error: activitiesError } = await supabase
      .from('activities')
      .select('activity_id')
      .limit(1);

    if (activitiesError) {
      console.error('   ❌ Activities table not accessible:', activitiesError.message);
      console.error('   💡 Have you run migrations? Try: npm run db:push');
      return false;
    }

    console.log('   ✓ Database connection valid');
    console.log('   ✓ Required tables exist\n');
    return true;
  } catch (error) {
    console.error('   ❌ Database validation failed:', error);
    return false;
  }
}

/**
 * Displays seed summary statistics
 */
async function displaySummary(): Promise<void> {
  console.log('📊 Seed Summary');
  console.log('═'.repeat(50));

  // Count roles
  const { count: rolesCount, error: rolesError } = await supabase
    .from('roles')
    .select('*', { count: 'exact', head: true });

  if (!rolesError) {
    console.log(`   Roles:      ${rolesCount} total`);
  }

  // Count activities
  const { count: activitiesCount, error: activitiesError } = await supabase
    .from('activities')
    .select('*', { count: 'exact', head: true });

  if (!activitiesError) {
    console.log(`   Activities: ${activitiesCount} total`);
  }

  console.log('═'.repeat(50));
}

// =====================================================================================
// MAIN EXECUTION
// =====================================================================================

/**
 * Main seed orchestration function
 * Executes all seed operations in sequence
 */
async function main(): Promise<void> {
  console.log('\n');
  console.log('═'.repeat(50));
  console.log('🌱 MyFitnessLeague Database Seeder');
  console.log('═'.repeat(50));
  console.log('\n');

  try {
    // Step 1: Validate database connection
    const isValid = await validateDatabase();
    if (!isValid) {
      console.error('❌ Database validation failed. Exiting.\n');
      process.exit(1);
    }

    // Step 2: Seed roles
    await seedRoles();

    // Step 3: Seed activities
    await seedActivities();

    // Step 4: Display summary
    await displaySummary();

    console.log('\n✅ Seeding completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Execute main function
main();
