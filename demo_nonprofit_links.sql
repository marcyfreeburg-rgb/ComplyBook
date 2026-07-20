-- ================================================================
-- ComplyBook Demo: Nonprofit Data Links Fix
-- Run this in your Neon PRODUCTION database console
-- Links org 246 (Hope Community Foundation) transactions to
-- their donors, programs, and grants so all nonprofit reports
-- show real data.
-- ================================================================

-- ── GRANT INCOME links ──────────────────────────────────────────
UPDATE transactions SET grant_id = 23
WHERE organization_id = 246
  AND LOWER(description) LIKE '%food assistance%';

UPDATE transactions SET grant_id = 22
WHERE organization_id = 246
  AND (LOWER(description) LIKE '%williams family%'
    OR LOWER(description) LIKE '%youth program%'
    OR LOWER(description) LIKE '%youth grant%');

UPDATE transactions SET grant_id = 21
WHERE organization_id = 246
  AND (LOWER(description) LIKE '%community health%'
    OR LOWER(description) LIKE '%health initiative%');

UPDATE transactions SET grant_id = 24
WHERE organization_id = 246
  AND (LOWER(description) LIKE '%senior%block%'
    OR LOWER(description) LIKE '%senior services%'
    OR LOWER(description) LIKE '%community block%');

UPDATE transactions SET grant_id = 25
WHERE organization_id = 246
  AND (LOWER(description) LIKE '%peterson%'
    OR LOWER(description) LIKE '%scholarship%'
    OR LOWER(description) LIKE '%endowment%');

-- ── PROGRAM + GRANT links (expenses) ────────────────────────────
UPDATE transactions SET program_id = 9, grant_id = 23
WHERE organization_id = 246 AND program_id IS NULL
  AND (LOWER(description) LIKE '%food bank%'
    OR LOWER(description) LIKE '%food supply%'
    OR LOWER(description) LIKE '%nutrition%');

UPDATE transactions SET program_id = 7, grant_id = 22
WHERE organization_id = 246 AND program_id IS NULL
  AND (LOWER(description) LIKE '%youth%'
    OR LOWER(description) LIKE '%mentor%'
    OR LOWER(description) LIKE '%tutor%'
    OR LOWER(description) LIKE '%after-school%');

UPDATE transactions SET program_id = 8, grant_id = 24
WHERE organization_id = 246 AND program_id IS NULL
  AND LOWER(description) LIKE '%senior%';

UPDATE transactions SET program_id = 11, grant_id = 25
WHERE organization_id = 246 AND program_id IS NULL
  AND (LOWER(description) LIKE '%summer camp%'
    OR LOWER(description) LIKE '%scholarship%');

UPDATE transactions SET program_id = 10
WHERE organization_id = 246 AND program_id IS NULL
  AND (LOWER(description) LIKE '%emergency%'
    OR LOWER(description) LIKE '%family assist%');

-- ── DONOR income links ───────────────────────────────────────────
UPDATE transactions SET donor_id = 21
WHERE organization_id = 246 AND donor_id IS NULL
  AND LOWER(description) LIKE '%foster%';

UPDATE transactions SET donor_id = 15
WHERE organization_id = 246 AND donor_id IS NULL
  AND LOWER(description) LIKE '%williams family%';

UPDATE transactions SET donor_id = 22
WHERE organization_id = 246 AND donor_id IS NULL
  AND LOWER(description) LIKE '%peterson%';

UPDATE transactions SET donor_id = 14
WHERE organization_id = 246 AND donor_id IS NULL
  AND (LOWER(description) LIKE '%robert%'
    OR LOWER(description) LIKE '%johnson%');

UPDATE transactions SET donor_id = 18
WHERE organization_id = 246 AND donor_id IS NULL
  AND LOWER(description) LIKE '%richardson%';

UPDATE transactions SET donor_id = 20
WHERE organization_id = 246 AND donor_id IS NULL
  AND LOWER(description) LIKE '%tech innovation%';

UPDATE transactions SET donor_id = 23
WHERE organization_id = 246 AND donor_id IS NULL
  AND (LOWER(description) LIKE '%michael%'
    OR LOWER(description) LIKE '%wong%');

UPDATE transactions SET donor_id = 14
WHERE organization_id = 246 AND donor_id IS NULL
  AND LOWER(description) LIKE '%winter gala%'
  AND type = 'income';

UPDATE transactions SET donor_id = 14
WHERE organization_id = 246 AND donor_id IS NULL
  AND LOWER(description) LIKE '%senior companion program donation%';

-- ── Verify results ───────────────────────────────────────────────
SELECT 'By Grant' AS report,
       g.name     AS name,
       COUNT(t.id) AS transactions,
       SUM(t.amount)::numeric(12,2) AS total
FROM transactions t
JOIN grants g ON g.id = t.grant_id
WHERE t.organization_id = 246
GROUP BY g.name

UNION ALL

SELECT 'By Program',
       p.name,
       COUNT(t.id),
       SUM(t.amount)::numeric(12,2)
FROM transactions t
JOIN programs p ON p.id = t.program_id
WHERE t.organization_id = 246
GROUP BY p.name

UNION ALL

SELECT 'By Donor',
       d.name,
       COUNT(t.id),
       SUM(t.amount)::numeric(12,2)
FROM transactions t
JOIN donors d ON d.id = t.donor_id
WHERE t.organization_id = 246
GROUP BY d.name

ORDER BY report, name;
