-- ============================================================
-- ComplyBook Demo Data Migration Script for Production
-- Run this on your Render/production PostgreSQL database
-- ============================================================
-- 
-- INSTRUCTIONS:
-- 1. Connect to your Render PostgreSQL database
-- 2. Run STEP 1 to find the user ID
-- 3. Run STEP 2 to create the organizations (note the returned IDs)
-- 4. Run STEP 3 with the correct IDs to grant access
-- 5. Run STEP 4+ sections, replacing ORG_ID placeholders with actual IDs
--
-- ============================================================

-- ============================================================
-- STEP 1: Find the user ID for the demo account owner
-- ============================================================
SELECT id, email FROM users WHERE email = 'marcy.freeburg@gmail.com';
-- Note the ID returned (e.g., 43852944)

-- ============================================================
-- STEP 2: Create Demo Organizations
-- ============================================================

-- Nonprofit Demo Organization
INSERT INTO organizations (name, type, fiscal_year_start_month, tax_id, company_name, company_address, company_phone, company_email, company_website)
VALUES ('DEMO: Hope Community Foundation', 'nonprofit', 1, '84-1234567', 'Hope Community Foundation', '1234 Charity Lane, Denver, CO 80202', '(303) 555-0100', 'info@hopefoundation-demo.org', 'https://hopefoundation-demo.org')
RETURNING id;
-- Save this ID as NONPROFIT_ID

-- For-Profit Demo Organization  
INSERT INTO organizations (name, type, fiscal_year_start_month, tax_id, company_name, company_address, company_phone, company_email, company_website)
VALUES ('DEMO: Atlas Defense Solutions', 'forprofit', 10, '52-9876543', 'Atlas Defense Solutions LLC', '5678 Contract Drive, Arlington, VA 22201', '(571) 555-0200', 'contracts@atlasdefense-demo.com', 'https://atlasdefense-demo.com')
RETURNING id;
-- Save this ID as FORPROFIT_ID

-- ============================================================
-- STEP 3: Grant Owner Access (REPLACE IDs)
-- Replace USER_ID with actual user ID from Step 1
-- Replace NONPROFIT_ID and FORPROFIT_ID with IDs from Step 2
-- ============================================================

-- INSERT INTO user_organization_roles (user_id, organization_id, role)
-- VALUES (USER_ID, NONPROFIT_ID, 'owner');

-- INSERT INTO user_organization_roles (user_id, organization_id, role)
-- VALUES (USER_ID, FORPROFIT_ID, 'owner');

-- ============================================================
-- STEP 4: Create Categories for Nonprofit (REPLACE NONPROFIT_ID)
-- ============================================================

-- Income Categories for Nonprofit
INSERT INTO categories (organization_id, name, type, description, is_tax_deductible, functional_category) VALUES
(NONPROFIT_ID, 'Individual Donations', 'income', 'Donations from individual donors', 1, 'fundraising'),
(NONPROFIT_ID, 'Foundation Grants', 'income', 'Grants from private foundations', 1, 'fundraising'),
(NONPROFIT_ID, 'Government Grants', 'income', 'Federal, state, and local government grants', 1, 'program'),
(NONPROFIT_ID, 'Corporate Sponsorships', 'income', 'Sponsorships from businesses', 1, 'fundraising'),
(NONPROFIT_ID, 'Program Fees', 'income', 'Fees for program services', 0, 'program'),
(NONPROFIT_ID, 'Special Events', 'income', 'Fundraising event revenue', 1, 'fundraising'),
(NONPROFIT_ID, 'In-Kind Donations', 'income', 'Non-cash donations of goods and services', 1, 'fundraising'),
(NONPROFIT_ID, 'Investment Income', 'income', 'Interest and dividend income', 0, 'administrative'),
(NONPROFIT_ID, 'Membership Dues', 'income', 'Annual membership contributions', 1, 'fundraising'),
(NONPROFIT_ID, 'Bequests', 'income', 'Planned giving and estate gifts', 1, 'fundraising');

-- Expense Categories for Nonprofit
INSERT INTO categories (organization_id, name, type, description, is_tax_deductible, functional_category) VALUES
(NONPROFIT_ID, 'Program Supplies', 'expense', 'Supplies for program delivery', 0, 'program'),
(NONPROFIT_ID, 'Program Staff Salaries', 'expense', 'Compensation for program staff', 0, 'program'),
(NONPROFIT_ID, 'Administrative Salaries', 'expense', 'Compensation for admin staff', 0, 'administrative'),
(NONPROFIT_ID, 'Rent & Utilities', 'expense', 'Facility costs', 0, 'administrative'),
(NONPROFIT_ID, 'Insurance', 'expense', 'Liability and property insurance', 0, 'administrative'),
(NONPROFIT_ID, 'Professional Services', 'expense', 'Accounting, legal, consulting', 0, 'administrative'),
(NONPROFIT_ID, 'Fundraising Expenses', 'expense', 'Costs related to fundraising activities', 0, 'fundraising'),
(NONPROFIT_ID, 'Marketing & Communications', 'expense', 'Outreach and promotional costs', 0, 'fundraising'),
(NONPROFIT_ID, 'Travel & Meals', 'expense', 'Staff travel for programs', 0, 'program'),
(NONPROFIT_ID, 'Equipment & Technology', 'expense', 'Computers and office equipment', 0, 'administrative'),
(NONPROFIT_ID, 'Client Assistance', 'expense', 'Direct assistance to clients', 0, 'program'),
(NONPROFIT_ID, 'Training & Development', 'expense', 'Staff training costs', 0, 'administrative');

-- ============================================================
-- STEP 5: Create Categories for For-Profit (REPLACE FORPROFIT_ID)
-- ============================================================

-- Income Categories for For-Profit
INSERT INTO categories (organization_id, name, type, description, is_tax_deductible) VALUES
(FORPROFIT_ID, 'Fixed Price Contract Revenue', 'income', 'Revenue from fixed-price contracts', 0),
(FORPROFIT_ID, 'Time & Materials Revenue', 'income', 'Revenue from T&M contracts', 0),
(FORPROFIT_ID, 'Cost Plus Fixed Fee Revenue', 'income', 'Revenue from CPFF contracts', 0),
(FORPROFIT_ID, 'Consulting Revenue', 'income', 'Professional consulting services', 0),
(FORPROFIT_ID, 'Product Sales', 'income', 'Hardware and software product sales', 0),
(FORPROFIT_ID, 'GSA Schedule Revenue', 'income', 'Revenue from GSA schedule contracts', 0);

-- Expense Categories for For-Profit (DCAA Aligned)
INSERT INTO categories (organization_id, name, type, description, is_tax_deductible) VALUES
(FORPROFIT_ID, 'Direct Labor', 'expense', 'Labor directly charged to contracts', 0),
(FORPROFIT_ID, 'Direct Materials', 'expense', 'Materials directly charged to contracts', 0),
(FORPROFIT_ID, 'Subcontractor Costs', 'expense', 'Subcontractor labor and services', 0),
(FORPROFIT_ID, 'Travel - Direct', 'expense', 'Travel directly charged to contracts', 0),
(FORPROFIT_ID, 'Other Direct Costs', 'expense', 'ODCs charged to contracts', 0),
(FORPROFIT_ID, 'Facilities - Overhead', 'expense', 'Office space and utilities', 0),
(FORPROFIT_ID, 'Equipment - Overhead', 'expense', 'Office equipment and computers', 0),
(FORPROFIT_ID, 'G&A Salaries', 'expense', 'Executive and admin salaries', 0),
(FORPROFIT_ID, 'Legal & Accounting', 'expense', 'Professional services', 0),
(FORPROFIT_ID, 'Insurance - G&A', 'expense', 'Business insurance premiums', 0),
(FORPROFIT_ID, 'Taxes & Licenses', 'expense', 'Business taxes and licenses', 0),
(FORPROFIT_ID, 'Fringe Benefits', 'expense', 'Employee benefits and taxes', 0),
(FORPROFIT_ID, 'B&P Costs', 'expense', 'Bid and proposal development', 0),
(FORPROFIT_ID, 'IR&D', 'expense', 'Independent R&D', 0),
(FORPROFIT_ID, 'Marketing & BD', 'expense', 'Marketing and business development', 0),
(FORPROFIT_ID, 'IT Infrastructure', 'expense', 'Cloud services, software licenses', 0);

-- ============================================================
-- STEP 6: Create Employees (REPLACE ORG IDs)
-- Note: Replace USER_ID with the created_by user ID
-- ============================================================

-- Nonprofit Employees
INSERT INTO employees (organization_id, first_name, last_name, email, phone, hire_date, job_title, department, employment_type, pay_type, pay_rate, pay_schedule, is_active, created_by) VALUES
(NONPROFIT_ID, 'Maria', 'Rodriguez', 'maria.r@hopefoundation-demo.org', '(303) 555-0101', '2020-03-15', 'Executive Director', 'Administration', 'full_time', 'salary', 85000.00, 'biweekly', 1, 'USER_ID'),
(NONPROFIT_ID, 'James', 'Thompson', 'james.t@hopefoundation-demo.org', '(303) 555-0102', '2021-06-01', 'Program Director', 'Programs', 'full_time', 'salary', 62000.00, 'biweekly', 1, 'USER_ID'),
(NONPROFIT_ID, 'Sarah', 'Chen', 'sarah.c@hopefoundation-demo.org', '(303) 555-0103', '2022-01-10', 'Development Manager', 'Fundraising', 'full_time', 'salary', 55000.00, 'biweekly', 1, 'USER_ID'),
(NONPROFIT_ID, 'Michael', 'Johnson', 'michael.j@hopefoundation-demo.org', '(303) 555-0104', '2022-09-01', 'Finance Coordinator', 'Finance', 'full_time', 'salary', 48000.00, 'biweekly', 1, 'USER_ID'),
(NONPROFIT_ID, 'Emily', 'Davis', 'emily.d@hopefoundation-demo.org', '(303) 555-0105', '2023-03-15', 'Program Coordinator', 'Programs', 'full_time', 'hourly', 22.00, 'biweekly', 1, 'USER_ID'),
(NONPROFIT_ID, 'David', 'Martinez', 'david.m@hopefoundation-demo.org', '(303) 555-0106', '2024-01-08', 'Volunteer Coordinator', 'Programs', 'part_time', 'hourly', 18.50, 'biweekly', 1, 'USER_ID');

-- For-Profit Employees
INSERT INTO employees (organization_id, first_name, last_name, email, phone, hire_date, job_title, department, employment_type, pay_type, pay_rate, pay_schedule, is_active, created_by) VALUES
(FORPROFIT_ID, 'Robert', 'Anderson', 'randerson@atlasdefense-demo.com', '(571) 555-0201', '2018-05-01', 'President & CEO', 'Executive', 'full_time', 'salary', 185000.00, 'biweekly', 1, 'USER_ID'),
(FORPROFIT_ID, 'Jennifer', 'Williams', 'jwilliams@atlasdefense-demo.com', '(571) 555-0202', '2019-08-15', 'VP of Operations', 'Operations', 'full_time', 'salary', 145000.00, 'biweekly', 1, 'USER_ID'),
(FORPROFIT_ID, 'Christopher', 'Brown', 'cbrown@atlasdefense-demo.com', '(571) 555-0203', '2020-02-01', 'Senior Program Manager', 'Programs', 'full_time', 'salary', 125000.00, 'biweekly', 1, 'USER_ID'),
(FORPROFIT_ID, 'Amanda', 'Taylor', 'ataylor@atlasdefense-demo.com', '(571) 555-0204', '2020-11-01', 'Contracts Manager', 'Contracts', 'full_time', 'salary', 95000.00, 'biweekly', 1, 'USER_ID'),
(FORPROFIT_ID, 'Daniel', 'Garcia', 'dgarcia@atlasdefense-demo.com', '(571) 555-0205', '2021-04-15', 'Senior Systems Engineer', 'Engineering', 'full_time', 'salary', 135000.00, 'biweekly', 1, 'USER_ID'),
(FORPROFIT_ID, 'Michelle', 'Lee', 'mlee@atlasdefense-demo.com', '(571) 555-0206', '2022-01-03', 'Cybersecurity Analyst', 'Engineering', 'full_time', 'salary', 110000.00, 'biweekly', 1, 'USER_ID'),
(FORPROFIT_ID, 'Kevin', 'Wilson', 'kwilson@atlasdefense-demo.com', '(571) 555-0207', '2023-06-01', 'Project Manager', 'Programs', 'full_time', 'salary', 95000.00, 'biweekly', 1, 'USER_ID'),
(FORPROFIT_ID, 'Lisa', 'Martinez', 'lmartinez@atlasdefense-demo.com', '(571) 555-0208', '2024-02-15', 'Finance Manager', 'Finance', 'full_time', 'salary', 88000.00, 'biweekly', 1, 'USER_ID');

-- ============================================================
-- STEP 7: Create Donors for Nonprofit (REPLACE NONPROFIT_ID)
-- ============================================================

INSERT INTO donors (organization_id, first_name, last_name, email, phone, address, city, state, zip, donor_type, total_lifetime_giving, notes, is_active) VALUES
(NONPROFIT_ID, 'William', 'Henderson', 'whenderson@email.com', '(303) 555-1001', '456 Oak Street', 'Denver', 'CO', '80203', 'individual', 25000.00, 'Board member, annual gala sponsor', 1),
(NONPROFIT_ID, NULL, NULL, 'grants@communityfoundation.org', '(303) 555-1002', '789 Foundation Blvd', 'Denver', 'CO', '80204', 'foundation', 150000.00, 'Multi-year youth program funder', 1),
(NONPROFIT_ID, 'Patricia', 'Moore', 'pmoore@email.com', '(303) 555-1003', '321 Pine Ave', 'Boulder', 'CO', '80301', 'individual', 12000.00, 'Monthly recurring donor since 2022', 1),
(NONPROFIT_ID, NULL, NULL, 'giving@techcorp.com', '(303) 555-1004', '100 Tech Plaza', 'Denver', 'CO', '80202', 'corporate', 50000.00, 'Corporate partner - employee matching', 1),
(NONPROFIT_ID, 'Robert', 'Smith', 'rsmith@email.com', '(303) 555-1005', '555 Legacy Lane', 'Littleton', 'CO', '80120', 'individual', 250000.00, 'Planned giving - bequest commitment', 1),
(NONPROFIT_ID, 'Susan', 'Johnson', 'sjohnson@email.com', '(303) 555-1006', '888 Donor Drive', 'Aurora', 'CO', '80012', 'individual', 8500.00, 'Food bank volunteer and donor', 1),
(NONPROFIT_ID, NULL, NULL, 'community@localbank.com', '(303) 555-1007', '200 Banking Center', 'Denver', 'CO', '80202', 'corporate', 25000.00, 'Annual scholarship sponsor', 1),
(NONPROFIT_ID, 'Thomas', 'Wright', 'twright@email.com', '(303) 555-1008', '333 Mountain View', 'Golden', 'CO', '80401', 'individual', 15000.00, 'Senior program advocate', 1),
(NONPROFIT_ID, NULL, NULL, 'grants@unitedwaymilehi.org', '(303) 555-1009', '711 17th Street', 'Denver', 'CO', '80202', 'foundation', 75000.00, 'Emergency assistance funding partner', 1),
(NONPROFIT_ID, NULL, NULL, 'foundation@techinnovations.com', '(303) 555-1010', '999 Innovation Way', 'Boulder', 'CO', '80302', 'corporate', 35000.00, 'STEM education initiative funder', 1);

-- ============================================================
-- STEP 8: Create Vendors (REPLACE ORG IDs)
-- ============================================================

-- Nonprofit Vendors
INSERT INTO vendors (organization_id, name, contact_name, email, phone, address, city, state, zip, tax_id, payment_terms, notes, is_active, is_1099_eligible) VALUES
(NONPROFIT_ID, 'Denver Food Distributors', 'Mark Stevens', 'mstevens@denverfood.com', '(303) 555-2001', '500 Warehouse Way', 'Denver', 'CO', '80216', '84-5551234', 'Net 30', 'Primary food bank supplier', 1, 1),
(NONPROFIT_ID, 'Office Solutions Plus', 'Nancy Wilson', 'nwilson@officesolutions.com', '(303) 555-2002', '123 Supply Street', 'Denver', 'CO', '80203', '84-5552345', 'Net 15', 'Office supplies and equipment', 1, 0),
(NONPROFIT_ID, 'Rocky Mountain Utilities', NULL, 'billing@rmutilities.com', '(303) 555-2003', 'PO Box 1234', 'Denver', 'CO', '80201', NULL, 'Due on receipt', 'Electric and gas service', 1, 0),
(NONPROFIT_ID, 'Nonprofit Insurance Group', 'Sandra Lee', 'slee@npinsurance.com', '(303) 555-2004', '789 Insurance Plaza', 'Denver', 'CO', '80202', '84-5553456', 'Annual', 'Liability and property insurance', 1, 0),
(NONPROFIT_ID, 'Smith & Associates CPAs', 'John Smith', 'jsmith@smithcpa.com', '(303) 555-2005', '456 Accountant Ave', 'Denver', 'CO', '80202', '84-5554567', 'Net 30', 'Annual audit and tax services', 1, 1),
(NONPROFIT_ID, 'Community Print Shop', 'Tom Garcia', 'tom@communityprint.com', '(303) 555-2006', '321 Print Lane', 'Denver', 'CO', '80205', '84-5555678', 'Net 15', 'Event materials and newsletters', 1, 1),
(NONPROFIT_ID, 'Volunteer Management Systems', NULL, 'sales@volmgmt.com', '(800) 555-2007', '100 Software Drive', 'Austin', 'TX', '78701', '74-5556789', 'Annual', 'Volunteer tracking software', 1, 0);

-- For-Profit Vendors
INSERT INTO vendors (organization_id, name, contact_name, email, phone, address, city, state, zip, tax_id, payment_terms, notes, is_active, is_1099_eligible) VALUES
(FORPROFIT_ID, 'CloudServe Technologies', 'Mike Johnson', 'mjohnson@cloudserve.com', '(571) 555-3001', '100 Cloud Way', 'Reston', 'VA', '20190', '54-6661234', 'Net 30', 'AWS and cloud infrastructure', 1, 0),
(FORPROFIT_ID, 'SecureNet Solutions', 'Lisa Chen', 'lchen@securenet.com', '(571) 555-3002', '200 Security Blvd', 'Tysons', 'VA', '22102', '54-6662345', 'Net 30', 'Cybersecurity tools and licenses', 1, 0),
(FORPROFIT_ID, 'Executive Office Suites', 'Robert Taylor', 'rtaylor@execoffice.com', '(703) 555-3003', '500 Business Center', 'Arlington', 'VA', '22201', '54-6663456', 'Monthly', 'Office space lease', 1, 0),
(FORPROFIT_ID, 'Federal Insurance Partners', 'Mary Williams', 'mwilliams@fedinsurance.com', '(703) 555-3004', '300 Insurance Row', 'McLean', 'VA', '22101', '54-6664567', 'Annual', 'E&O and liability insurance', 1, 0),
(FORPROFIT_ID, 'Thompson Legal Group', 'James Thompson', 'jthompson@thompsonlegal.com', '(202) 555-3005', '1000 K Street NW', 'Washington', 'DC', '20001', '52-6665678', 'Net 30', 'Contract and employment law', 1, 1),
(FORPROFIT_ID, 'Apex Staffing Solutions', 'Karen Davis', 'kdavis@apexstaffing.com', '(571) 555-3006', '400 Contractor Plaza', 'Herndon', 'VA', '20170', '54-6666789', 'Net 15', 'Subcontractor staffing services', 1, 1);

-- ============================================================
-- STEP 9: Create Clients for For-Profit (REPLACE FORPROFIT_ID)
-- ============================================================

INSERT INTO clients (organization_id, name, contact_name, email, phone, address, city, state, zip, payment_terms, notes, is_active) VALUES
(FORPROFIT_ID, 'Defense Information Systems Agency', 'Col. Mark Stevens', 'contract.admin@disa.mil', '(703) 555-4001', 'Fort Meade', 'Fort Meade', 'MD', '20755', 'Net 30', 'IDIQ Contract - Cybersecurity Services', 1),
(FORPROFIT_ID, 'Department of Homeland Security', 'Jennifer Walsh', 'jennifer.walsh@dhs.gov', '(202) 555-4002', '245 Murray Lane', 'Washington', 'DC', '20528', 'Net 30', 'T&M Contract - IT Modernization', 1),
(FORPROFIT_ID, 'National Geospatial Agency', 'David Chen', 'david.chen@nga.mil', '(571) 555-4003', '7500 GEOINT Drive', 'Springfield', 'VA', '22150', 'Net 30', 'Geospatial analytics support', 1),
(FORPROFIT_ID, 'GSA Federal Supply Service', 'Sarah Miller', 'sarah.miller@gsa.gov', '(202) 555-4004', '1800 F Street NW', 'Washington', 'DC', '20405', 'Net 30', 'GSA IT Schedule 70', 1),
(FORPROFIT_ID, 'Veterans Affairs Medical Center', 'Michael Brown', 'michael.brown@va.gov', '(202) 555-4005', '810 Vermont Ave NW', 'Washington', 'DC', '20420', 'Net 45', 'Medical IT modernization', 1);

-- ============================================================
-- ADDITIONAL DATA SECTIONS
-- Continue with Funds, Programs, Grants, Transactions, etc.
-- following the same pattern of replacing ORG IDs
-- ============================================================

-- For the complete transaction, invoice, bill, pledge, grant, fund, 
-- and program data, contact support or run the export query on your
-- development database to get the exact data format needed.

-- ============================================================
-- END OF MIGRATION SCRIPT
-- ============================================================
