-- ================================================================
-- ComplyBook Demo Date Fix
-- Run this in your Neon PRODUCTION database console
-- Shifts all demo org transactions/invoices/budgets forward
-- so they land in May–July 2026 (visible in all reports)
-- ================================================================

-- Shift transaction dates forward 17 months
UPDATE transactions
SET date = date + INTERVAL '17 months'
WHERE organization_id IN (246, 247);

-- Shift invoice dates forward 17 months
UPDATE invoices
SET issue_date = issue_date + INTERVAL '17 months',
    due_date   = due_date   + INTERVAL '17 months'
WHERE organization_id IN (246, 247);

-- Shift budget period dates forward 17 months
UPDATE budgets
SET start_date = start_date + INTERVAL '17 months',
    end_date   = end_date   + INTERVAL '17 months'
WHERE organization_id IN (246, 247)
  AND start_date IS NOT NULL;

-- Verify results
SELECT
  organization_id,
  MIN(date)::date AS earliest,
  MAX(date)::date AS latest,
  COUNT(*)        AS transaction_count
FROM transactions
WHERE organization_id IN (246, 247)
GROUP BY organization_id
ORDER BY organization_id;
