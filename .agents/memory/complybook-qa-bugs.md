---
name: ComplyBook QA Bug Patterns
description: Recurring bug patterns found during pre-ChannelCon QA — useful for future sessions
---

## Security Event Enum Crashes
Any new code that calls `storage.logSecurityEvent()` must use ONLY these valid `eventType` values:
`login_success`, `login_failure`, `logout`, `session_expired`, `account_locked`, `account_unlocked`, `password_reset`, `unauthorized_access`, `permission_denied`, `rate_limit_exceeded`, `suspicious_activity`

**Why:** The DB enum `security_event_type` is locked to these 11 values. Invalid values cause 502 server crashes (Zod/DB insert failure).

**How to apply:** When adding new security event logging, map to the nearest valid value. Never invent new enum values without a DB migration.

## CSRF Exempt List
New auth/public API routes must be added to the exempt list in `server/index.ts`.

**Why:** The CSRF double-submit cookie check blocks POST/PATCH/DELETE on all paths not in the exempt list. Auth routes like `/register` and `/forgot-password` must be exempt since no session cookie exists yet.

## Org Type Default
Organization creation form (`organizations.tsx`) defaults to `'nonprofit'`.

**Why:** Most target customers are nonprofits; forprofit default caused all nonprofit-gated routes (/donors, /grants, /funds, etc.) to show 404 for new users. Changed default to nonprofit.

## Math.max on Empty Arrays
`Math.max(...[])` returns `-Infinity` in JavaScript, not a crash. But using it as an ID causes rendering bugs.

**Why:** CRM page used `Math.max(...leads.map(l => l.id)) + 1` for ID generation. Safe fix: `(arr.length > 0 ? Math.max(...arr.map(x => x.id)) : 0) + 1`.
