/**
 * Users Service - Centralized user data operations
 * Handles all user queries, profile updates, and user lookups
 */
import { getSupabase, getSupabaseServiceRole } from '@/lib/supabase/client';

export interface User {
  user_id: string;
  email: string;
  username?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  password_hash?: string;
  is_active?: boolean;
  needsProfileCompletion?: boolean;
  profile_picture_url?: string;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data as User;
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    return null;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error || !data) return null;
    return data as User;
  } catch (err) {
    console.error('Error fetching user by email:', err);
    return null;
  }
}

/**
 * Get multiple users by IDs (batch query)
 */
export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  try {
    if (userIds.length === 0) return [];

    const { data, error } = await getSupabase()
      .from('users')
      .select('user_id, username, email, first_name, last_name')
      .in('user_id', userIds);

    if (error || !data) return [];
    return data as User[];
  } catch (err) {
    console.error('Error fetching users by IDs:', err);
    return [];
  }
}

/**
 * Check if user needs profile completion
 */
export async function needsProfileCompletion(userId: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabase()
      .from('users')
      .select('password_hash, date_of_birth, gender')
      .eq('user_id', userId)
      .single();

    if (error || !data) return true;

    const hasPassword = !!(data as any).password_hash;
    const hasDOB = !!(data as any).date_of_birth;
    const hasGender = !!(data as any).gender;

    return !(hasPassword && hasDOB && hasGender);
  } catch (err) {
    console.error('Error checking profile completion:', err);
    return true;
  }
}

/**
 * Update user profile
 * @param userId - User ID to update
 * @param updates - Fields to update
 * @param useServiceRole - Use service role to bypass RLS (for admin/onboarding)
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>,
  useServiceRole: boolean = false
): Promise<User | null> {
  try {
    const client = useServiceRole ? getSupabaseServiceRole() : getSupabase();
    const { data, error } = await client
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating user profile:', error);
      return null;
    }
    return data as User;
  } catch (err) {
    console.error('Error updating user profile:', err);
    return null;
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  passwordHash: string
): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('user_id', userId);

    return !error;
  } catch (err) {
    console.error('Error updating password:', err);
    return false;
  }
}

/**
 * Create new user
 */
export async function createUser(userData: {
  user_id: string;
  email: string;
  username: string;
  password_hash?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
}): Promise<User> {
  const { data, error } = await getSupabaseServiceRole()
    .from('users')
    .insert([userData])
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    // Check for duplicate username constraint violation
    if (error.code === '23505' && error.message.includes('users_username_key')) {
      throw new Error('USERNAME_EXISTS');
    }
    // Check for duplicate email constraint violation
    if (error.code === '23505' && error.message.includes('users_email_key')) {
      throw new Error('EMAIL_EXISTS');
    }
    throw new Error('DATABASE_ERROR');
  }
  
  return data as User;
}

/**
 * Delete user (hard delete for admin)
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .from('users')
      .delete()
      .eq('user_id', userId);

    return !error;
  } catch (err) {
    console.error('Error deleting user:', err);
    return false;
  }
}
