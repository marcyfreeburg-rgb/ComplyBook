-- Demo Data Migration Script for ComplyBook
-- Run this on your production database to create demo accounts

-- ========================================
-- 1. CREATE DEMO ORGANIZATIONS
-- ========================================

INSERT INTO organizations (name, type, ein, address, city, state, zip_code, phone, email, website, fiscal_year_start, brand_color, is_active, created_at) VALUES
('DEMO: Hope Community Foundation', 'nonprofit', '84-1234567', '1250 Community Way', 'Denver', 'CO', '80202', '303-555-0100', 'info@hopecommunity.org', 'https://hopecommunity.org', 1, '#7C3AED', 1, NOW()),
('DEMO: Atlas Defense Solutions', 'for_profit', '83-7654321', '500 Defense Plaza Suite 400', 'Arlington', 'VA', '22201', '703-555-0200', 'contracts@atlasdefense.com', 'https://atlasdefense.com', 10, '#0891B2', 1, NOW());

-- Note: After running this, check the IDs assigned to these organizations
-- and update the subsequent INSERT statements with the correct organization_id values.
-- The script below assumes the nonprofit gets ID X and for-profit gets ID Y.
-- Replace X and Y with actual IDs throughout.

-- ========================================
-- 2. GRANT ACCESS TO USER
-- ========================================
-- First, find the user_id for marcy.freeburg@gmail.com:
-- SELECT id FROM users WHERE email = 'marcy.freeburg@gmail.com';
-- Then insert with the correct IDs:
-- INSERT INTO user_organization_roles (user_id, organization_id, role) VALUES
-- (USER_ID, NONPROFIT_ORG_ID, 'owner'),
-- (USER_ID, FORPROFIT_ORG_ID, 'owner');

-- ========================================
-- INSTRUCTIONS
-- ========================================
-- 1. Run the organization inserts first
-- 2. Note the assigned organization IDs
-- 3. Find the user ID for marcy.freeburg@gmail.com
-- 4. Update and run the user_organization_roles insert
-- 5. Run the remaining category/employee/donor/etc inserts
--    (replacing X and Y with actual org IDs)

-- For the complete data including categories, employees, donors, vendors,
-- clients, transactions, invoices, bills, pledges, grants, funds, programs,
-- and budgets, contact support or export from the development database.

