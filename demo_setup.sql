-- ================================================================
-- ComplyBook Demo Account Setup
-- Run this ONCE in your Neon production database console
-- Creates tech@lazydogweb.com (password: CaseyLee1)
-- Access: ONLY the two DEMO organizations (246 & 247)
-- ================================================================

DO $$
DECLARE
  v_user_id        varchar := 'local_user_1753000000000_demo0001';
  v_hash           varchar := 'b0934c0ba19ff41d96637f82f5f42409b8a2a5a649f1d2ecdfc66a823f0bc5933aca069055ed0e1a43f57fb629120db79e9516be498eb297ad928805465affe8.94f2339f7e7de41845249ee5e464fe5f';

  -- Org 246 client IDs
  v_c1 int; v_c2 int; v_c3 int; v_c4 int;
  -- Org 246 invoice IDs
  v_inv1 int; v_inv2 int; v_inv3 int;
  -- Org 247 invoice IDs (existing)
  v_inv_id int;
  -- Budget / category helpers
  v_budget_id int;
  v_cat_id    int;

BEGIN

  -- ============================================================
  -- 1. CREATE USER
  -- ============================================================
  INSERT INTO users (
    id, email, first_name, last_name,
    password_hash,
    subscription_tier, subscription_status, subscription_current_period_end
  )
  SELECT
    v_user_id,
    'tech@lazydogweb.com',
    'Demo',
    'Access',
    v_hash,
    'enterprise',
    'active',
    '2035-12-31'::timestamp
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'tech@lazydogweb.com');

  -- If user already existed, refresh their password & subscription
  UPDATE users SET
    password_hash                 = v_hash,
    subscription_tier             = 'enterprise',
    subscription_status           = 'active',
    subscription_current_period_end = '2035-12-31'::timestamp
  WHERE email = 'tech@lazydogweb.com';

  -- Resolve the actual user ID (handles both new and pre-existing)
  SELECT id INTO v_user_id FROM users WHERE email = 'tech@lazydogweb.com';

  -- ============================================================
  -- 2. GRANT ACCESS TO DEMO ORGS ONLY
  --    (The user must NOT be in any other org)
  -- ============================================================
  INSERT INTO user_organization_roles (user_id, organization_id, role)
  SELECT v_user_id, 246, 'owner'
  WHERE NOT EXISTS (
    SELECT 1 FROM user_organization_roles
    WHERE user_id = v_user_id AND organization_id = 246
  );

  INSERT INTO user_organization_roles (user_id, organization_id, role)
  SELECT v_user_id, 247, 'owner'
  WHERE NOT EXISTS (
    SELECT 1 FROM user_organization_roles
    WHERE user_id = v_user_id AND organization_id = 247
  );

  -- ============================================================
  -- 3. ADD CLIENTS TO ORG 246 (Hope Community Foundation)
  --    Nonprofit needs clients for invoicing demonstrations
  -- ============================================================
  INSERT INTO clients (organization_id, name, contact_name, email, phone, address)
  SELECT 246, 'City of Denver Community Services', 'Patricia Hawkins',
         'phawkins@denver-demo.gov', '303-555-0101',
         '1437 Bannock St, Denver, CO 80202'
  WHERE NOT EXISTS (
    SELECT 1 FROM clients WHERE organization_id = 246 AND name = 'City of Denver Community Services'
  );

  INSERT INTO clients (organization_id, name, contact_name, email, phone, address)
  SELECT 246, 'Colorado Health Foundation', 'Marcus Webb',
         'mwebb@cohealthfdn-demo.org', '303-555-0102',
         '4500 Cherry Creek Dr S, Denver, CO 80246'
  WHERE NOT EXISTS (
    SELECT 1 FROM clients WHERE organization_id = 246 AND name = 'Colorado Health Foundation'
  );

  INSERT INTO clients (organization_id, name, contact_name, email, phone, address)
  SELECT 246, 'United Way of Colorado', 'Sandra Hill',
         'shill@uwco-demo.org', '303-555-0103',
         '2505 18th St, Denver, CO 80211'
  WHERE NOT EXISTS (
    SELECT 1 FROM clients WHERE organization_id = 246 AND name = 'United Way of Colorado'
  );

  INSERT INTO clients (organization_id, name, contact_name, email, phone, address)
  SELECT 246, 'Jefferson County Schools Foundation', 'Kevin Park',
         'kpark@jeffcofdn-demo.org', '303-555-0104',
         '1829 Denver West Dr, Golden, CO 80401'
  WHERE NOT EXISTS (
    SELECT 1 FROM clients WHERE organization_id = 246 AND name = 'Jefferson County Schools Foundation'
  );

  -- Look up the client IDs we just created
  SELECT id INTO v_c1 FROM clients WHERE organization_id = 246 AND name = 'City of Denver Community Services';
  SELECT id INTO v_c2 FROM clients WHERE organization_id = 246 AND name = 'Colorado Health Foundation';
  SELECT id INTO v_c3 FROM clients WHERE organization_id = 246 AND name = 'United Way of Colorado';
  SELECT id INTO v_c4 FROM clients WHERE organization_id = 246 AND name = 'Jefferson County Schools Foundation';

  -- ============================================================
  -- 4. ADD INVOICES FOR ORG 246 (with line items)
  -- ============================================================

  -- Invoice 1: Paid - City of Denver
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE organization_id = 246 AND invoice_number = 'HCF-2025-001') THEN
    INSERT INTO invoices (
      organization_id, client_id, invoice_number,
      issue_date, due_date, status,
      subtotal, tax_amount, total_amount, notes, created_by
    ) VALUES (
      246, v_c1, 'HCF-2025-001',
      '2025-01-15', '2025-02-15', 'paid',
      25000.00, 0.00, 25000.00,
      'Youth Mentoring Program Services – January 2025', v_user_id
    ) RETURNING id INTO v_inv1;

    INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount) VALUES
      (v_inv1, 'Youth Mentoring Program – Monthly Services',   1, 15000.00, 15000.00),
      (v_inv1, 'After-School Tutoring Program',               1,  7500.00,  7500.00),
      (v_inv1, 'Program Materials & Supplies',                1,  2500.00,  2500.00);
  END IF;

  -- Invoice 2: Sent - Colorado Health Foundation
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE organization_id = 246 AND invoice_number = 'HCF-2025-002') THEN
    INSERT INTO invoices (
      organization_id, client_id, invoice_number,
      issue_date, due_date, status,
      subtotal, tax_amount, total_amount, notes, created_by
    ) VALUES (
      246, v_c2, 'HCF-2025-002',
      '2025-01-20', '2025-02-20', 'sent',
      15000.00, 0.00, 15000.00,
      'Community Health Outreach Services – January 2025', v_user_id
    ) RETURNING id INTO v_inv2;

    INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount) VALUES
      (v_inv2, 'Community Health Education Workshops',  3,  3500.00, 10500.00),
      (v_inv2, 'Health Screening Events',               2,  1500.00,  3000.00),
      (v_inv2, 'Outreach Materials & Printing',         1,  1500.00,  1500.00);
  END IF;

  -- Invoice 3: Draft - United Way
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE organization_id = 246 AND invoice_number = 'HCF-2025-003') THEN
    INSERT INTO invoices (
      organization_id, client_id, invoice_number,
      issue_date, due_date, status,
      subtotal, tax_amount, total_amount, notes, created_by
    ) VALUES (
      246, v_c3, 'HCF-2025-003',
      '2025-02-01', '2025-03-01', 'draft',
      12000.00, 0.00, 12000.00,
      'Food Bank Coordination Services – February 2025', v_user_id
    ) RETURNING id INTO v_inv3;

    INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount) VALUES
      (v_inv3, 'Food Bank Operations Support',  1, 8000.00, 8000.00),
      (v_inv3, 'Volunteer Coordination',        1, 2500.00, 2500.00),
      (v_inv3, 'Distribution Logistics',        1, 1500.00, 1500.00);
  END IF;

  -- ============================================================
  -- 5. ADD LINE ITEMS TO ORG 247 EXISTING INVOICES (Atlas Defense)
  -- ============================================================
  FOR v_inv_id IN
    SELECT id FROM invoices
    WHERE organization_id = 247
      AND NOT EXISTS (SELECT 1 FROM invoice_line_items WHERE invoice_id = invoices.id)
    ORDER BY id
  LOOP
    -- Add realistic line items based on the invoice's total_amount
    INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount)
    SELECT
      v_inv_id,
      'Professional Labor – ' || to_char(issue_date, 'Mon YYYY'),
      160,
      ROUND((total_amount * 0.70) / 160, 2),
      ROUND(total_amount * 0.70, 2)
    FROM invoices WHERE id = v_inv_id;

    INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount)
    SELECT
      v_inv_id,
      'Other Direct Costs',
      1,
      ROUND(total_amount * 0.20, 2),
      ROUND(total_amount * 0.20, 2)
    FROM invoices WHERE id = v_inv_id;

    INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount)
    SELECT
      v_inv_id,
      'Overhead & Fringe (15%)',
      1,
      ROUND(total_amount * 0.10, 2),
      ROUND(total_amount * 0.10, 2)
    FROM invoices WHERE id = v_inv_id;
  END LOOP;

  -- ============================================================
  -- 6. ADD BUDGET ITEMS FOR ORG 246 (Hope Community Foundation)
  -- ============================================================

  -- --- FY 2025 Operating Budget - Jan ---
  SELECT id INTO v_budget_id FROM budgets WHERE organization_id = 246 AND name = 'FY 2025 Operating Budget - Jan';
  IF v_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_items WHERE budget_id = v_budget_id) THEN
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 45000.00 FROM categories WHERE organization_id = 246 AND name = 'Staff Salaries';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 8500.00  FROM categories WHERE organization_id = 246 AND name = 'Employee Benefits';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 6200.00  FROM categories WHERE organization_id = 246 AND name = 'Rent & Utilities';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 1200.00  FROM categories WHERE organization_id = 246 AND name = 'Office Supplies';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 3500.00  FROM categories WHERE organization_id = 246 AND name = 'Professional Services';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 1800.00  FROM categories WHERE organization_id = 246 AND name = 'Insurance';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 2500.00  FROM categories WHERE organization_id = 246 AND name = 'Technology & Software';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 1500.00  FROM categories WHERE organization_id = 246 AND name = 'Travel & Meetings';
  END IF;

  -- --- FY 2025 Operating Budget - Feb ---
  SELECT id INTO v_budget_id FROM budgets WHERE organization_id = 246 AND name = 'FY 2025 Operating Budget - Feb';
  IF v_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_items WHERE budget_id = v_budget_id) THEN
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 45000.00 FROM categories WHERE organization_id = 246 AND name = 'Staff Salaries';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 8500.00  FROM categories WHERE organization_id = 246 AND name = 'Employee Benefits';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 6200.00  FROM categories WHERE organization_id = 246 AND name = 'Rent & Utilities';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 1200.00  FROM categories WHERE organization_id = 246 AND name = 'Office Supplies';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 3500.00  FROM categories WHERE organization_id = 246 AND name = 'Professional Services';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 2800.00  FROM categories WHERE organization_id = 246 AND name = 'Marketing & Outreach';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 1500.00  FROM categories WHERE organization_id = 246 AND name = 'Fundraising Expenses';
  END IF;

  -- --- Youth Mentoring Jan 2025 ---
  SELECT id INTO v_budget_id FROM budgets WHERE organization_id = 246 AND name = 'Youth Mentoring Jan 2025';
  IF v_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_items WHERE budget_id = v_budget_id) THEN
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 18000.00 FROM categories WHERE organization_id = 246 AND name = 'Program Services - Youth';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  5000.00 FROM categories WHERE organization_id = 246 AND name = 'Staff Salaries';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  1200.00 FROM categories WHERE organization_id = 246 AND name = 'Volunteer Support';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,   800.00 FROM categories WHERE organization_id = 246 AND name = 'Travel & Meetings';
  END IF;

  -- --- Senior Companion Jan 2025 ---
  SELECT id INTO v_budget_id FROM budgets WHERE organization_id = 246 AND name = 'Senior Companion Jan 2025';
  IF v_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_items WHERE budget_id = v_budget_id) THEN
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 12000.00 FROM categories WHERE organization_id = 246 AND name = 'Program Services - Seniors';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  4500.00 FROM categories WHERE organization_id = 246 AND name = 'Staff Salaries';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  1000.00 FROM categories WHERE organization_id = 246 AND name = 'Volunteer Support';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,   600.00 FROM categories WHERE organization_id = 246 AND name = 'Travel & Meetings';
  END IF;

  -- --- Food Bank Jan 2025 ---
  SELECT id INTO v_budget_id FROM budgets WHERE organization_id = 246 AND name = 'Food Bank Jan 2025';
  IF v_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_items WHERE budget_id = v_budget_id) THEN
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 20000.00 FROM categories WHERE organization_id = 246 AND name = 'Program Services - Food Bank';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  6000.00 FROM categories WHERE organization_id = 246 AND name = 'Staff Salaries';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  2500.00 FROM categories WHERE organization_id = 246 AND name = 'Volunteer Support';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  1500.00 FROM categories WHERE organization_id = 246 AND name = 'Office Supplies';
  END IF;

  -- ============================================================
  -- 7. ADD BUDGET ITEMS FOR ORG 247 (Atlas Defense Solutions)
  -- ============================================================

  -- --- FY 2025 Company Budget - Jan ---
  SELECT id INTO v_budget_id FROM budgets WHERE organization_id = 247 AND name = 'FY 2025 Company Budget - Jan';
  IF v_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_items WHERE budget_id = v_budget_id) THEN
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 180000.00 FROM categories WHERE organization_id = 247 AND name = 'Contract Revenue - Fixed Price';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  85000.00 FROM categories WHERE organization_id = 247 AND name = 'Contract Revenue - T&M';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  95000.00 FROM categories WHERE organization_id = 247 AND name = 'Direct Labor';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  22000.00 FROM categories WHERE organization_id = 247 AND name = 'Direct Materials';
  END IF;

  -- --- FY 2025 Company Budget - Feb ---
  SELECT id INTO v_budget_id FROM budgets WHERE organization_id = 247 AND name = 'FY 2025 Company Budget - Feb';
  IF v_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_items WHERE budget_id = v_budget_id) THEN
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 190000.00 FROM categories WHERE organization_id = 247 AND name = 'Contract Revenue - Fixed Price';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  78000.00 FROM categories WHERE organization_id = 247 AND name = 'Contract Revenue - T&M';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  98000.00 FROM categories WHERE organization_id = 247 AND name = 'Direct Labor';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  19500.00 FROM categories WHERE organization_id = 247 AND name = 'Direct Materials';
  END IF;

  -- --- Direct Costs Jan 2025 ---
  SELECT id INTO v_budget_id FROM budgets WHERE organization_id = 247 AND name = 'Direct Costs Jan 2025';
  IF v_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_items WHERE budget_id = v_budget_id) THEN
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 95000.00 FROM categories WHERE organization_id = 247 AND name = 'Direct Labor';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 22000.00 FROM categories WHERE organization_id = 247 AND name = 'Direct Materials';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 12000.00 FROM categories WHERE organization_id = 247 AND name = 'Consulting Services';
  END IF;

  -- --- G&A Jan 2025 ---
  SELECT id INTO v_budget_id FROM budgets WHERE organization_id = 247 AND name = 'G&A Jan 2025';
  IF v_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_items WHERE budget_id = v_budget_id) THEN
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 18000.00 FROM categories WHERE organization_id = 247 AND name = 'Direct Labor';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  8500.00 FROM categories WHERE organization_id = 247 AND name = 'Consulting Services';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  4200.00 FROM categories WHERE organization_id = 247 AND name = 'Direct Materials';
  END IF;

  -- --- Overhead Jan 2025 ---
  SELECT id INTO v_budget_id FROM budgets WHERE organization_id = 247 AND name = 'Overhead Jan 2025';
  IF v_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_items WHERE budget_id = v_budget_id) THEN
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id, 12000.00 FROM categories WHERE organization_id = 247 AND name = 'Direct Labor';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  6000.00 FROM categories WHERE organization_id = 247 AND name = 'Consulting Services';
    INSERT INTO budget_items (budget_id, category_id, amount)
    SELECT v_budget_id, id,  3500.00 FROM categories WHERE organization_id = 247 AND name = 'Training Services';
  END IF;

  RAISE NOTICE 'Demo setup complete. tech@lazydogweb.com is ready with access to orgs 246 and 247 only.';
END $$;
