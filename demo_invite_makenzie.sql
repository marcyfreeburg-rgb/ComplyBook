-- ================================================================
-- ComplyBook: Invite Makenzie Ford (makenzie@emergentcampus.com)
-- Run this in your Neon PRODUCTION database console
-- Temp password:  ComplyBook2026!
-- (She should change it after first login via Settings)
-- ================================================================

INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  password_hash,
  mfa_enabled,
  mfa_required,
  created_at,
  updated_at
)
VALUES (
  'makenzie_emergent_' || to_char(NOW(), 'YYYYMMDDHH24MISS'),
  'makenzie@emergentcampus.com',
  'Makenzie',
  'Ford',
  '7b18a122ed5d040f49fc7b3ab3e7ba6ea890cbf517195422b758373985be8e86dd69b6d3a3f7291db3800f4ac321c6e7bb1fde2cb5d5335c6299e456a67f717b.2cd29641c26dd219102b91ad842a1684',
  false,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Verify the insert
SELECT id, email, first_name, last_name, created_at
FROM users
WHERE email = 'makenzie@emergentcampus.com';
