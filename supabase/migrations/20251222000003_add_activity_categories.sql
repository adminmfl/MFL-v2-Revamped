-- Add activity categories table for dynamic category management
-- Migration: Add activity categories system

-- Ensure required columns exist on existing activity_categories table
ALTER TABLE activity_categories
  ADD COLUMN IF NOT EXISTS category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS category_name TEXT NOT NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable RLS on activity_categories
ALTER TABLE activity_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_categories

-- Allow everyone to read categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to activity categories'
  ) THEN
    CREATE POLICY "Allow read access to activity categories"
      ON activity_categories
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Only admins can insert categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can insert activity categories'
  ) THEN
    CREATE POLICY "Only admins can insert activity categories"
      ON activity_categories
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.user_id = auth.uid()
          AND users.platform_role = 'admin'
        )
      );
  END IF;
END $$;

-- Only admins can update categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can update activity categories'
  ) THEN
    CREATE POLICY "Only admins can update activity categories"
      ON activity_categories
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.user_id = auth.uid()
          AND users.platform_role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.user_id = auth.uid()
          AND users.platform_role = 'admin'
        )
      );
  END IF;
END $$;

-- Only admins can delete categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can delete activity categories'
  ) THEN
    CREATE POLICY "Only admins can delete activity categories"
      ON activity_categories
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.user_id = auth.uid()
          AND users.platform_role = 'admin'
        )
      );
  END IF;
END $$;


