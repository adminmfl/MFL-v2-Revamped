-- =====================================================================================
-- Migration: Add Profile Picture URL to Users Table
-- Description: Adds profile_picture_url column and creates profile-pictures bucket
-- Created: 2026-01-29
-- =====================================================================================

-- Add profile_picture_url column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS profile_picture_url text;

COMMENT ON COLUMN public.users.profile_picture_url IS 'URL to user profile picture stored in Supabase Storage';

-- Create profile-pictures bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Profile picture storage policies
-- Public read access
CREATE POLICY "profile-pictures_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Users can upload to their own folder
CREATE POLICY "profile-pictures_user_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Users can update their own files
CREATE POLICY "profile-pictures_user_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Users can delete their own files
CREATE POLICY "profile-pictures_user_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = split_part(name, '/', 1)
);
