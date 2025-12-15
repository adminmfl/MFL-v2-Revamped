-- =====================================================================================
-- Migration: Seed Admin User and Default Pricing
-- Description: Creates super admin user and default pricing configuration
-- Author: MFL Engineering Team
-- Created: 2024-12-14
-- =====================================================================================
-- IMPORTANT: Update the email and password_hash below before running this migration
-- To generate password hash: https://bcrypt-generator.com/ (use rounds: 10)
-- =====================================================================================

-- =====================================================================================
-- CREATE ADMIN USER
-- =====================================================================================

/**
 * Insert super admin user
 * INSTRUCTIONS:
 * 1. Replace 'admin@myfitleague.com' with your admin email
 * 2. Replace the password_hash with a bcrypt hash of your password
 *    - Generate hash at: https://bcrypt-generator.com/
 *    - Use 10 rounds
 *    - Example password "Admin@123" generates:
 *      $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
 */

INSERT INTO public.users (
  username,
  email,
  password_hash,
  platform_role,
  is_active,
  created_date
)
VALUES (
  'admin',
  'admin@myfitnessleague.com', -- CHANGE THIS to your admin email
  '$2b$10$hdCr.XL7NgL/umLa1SfEiuIet1RcHi/XGqUkQ9ERwMJTTNPPf8Cxu', -- CHANGE THIS to your password hash (default password: Admin@123)
  'admin',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING; -- Skip if admin already exists

-- =====================================================================================
-- CREATE DEFAULT PRICING
-- =====================================================================================

/**
 * Insert default pricing configuration
 * League Creation Fee: ₹499
 * Platform Fee: ₹99
 * GST: 18%
 * Total: ₹705.64
 */

INSERT INTO public.pricing (
  base_price,
  platform_fee,
  gst_percentage,
  is_active,
  created_at,
  updated_at
)
VALUES (
  499.00,  -- League creation base fee
  99.00,   -- Platform service fee
  18.00,   -- GST percentage
  true,    -- Active pricing
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Ensure only one pricing is active (deactivate any old pricing)
UPDATE public.pricing
SET is_active = false
WHERE id NOT IN (
  SELECT id FROM public.pricing
  ORDER BY created_at DESC
  LIMIT 1
);

-- =====================================================================================
-- VERIFICATION QUERIES (Optional - Run after migration to verify)
-- =====================================================================================

-- Verify admin user created
-- SELECT user_id, username, email, platform_role, is_active FROM public.users WHERE platform_role = 'admin';

-- Verify pricing created
-- SELECT id, base_price, platform_fee, gst_percentage, is_active FROM public.pricing WHERE is_active = true;

-- Calculate total price
-- SELECT
--   base_price,
--   platform_fee,
--   gst_percentage,
--   (base_price + platform_fee) as subtotal,
--   ((base_price + platform_fee) * gst_percentage / 100) as gst,
--   ((base_price + platform_fee) * (1 + gst_percentage / 100)) as total
-- FROM public.pricing
-- WHERE is_active = true;

-- =====================================================================================
-- END OF MIGRATION
-- =====================================================================================
