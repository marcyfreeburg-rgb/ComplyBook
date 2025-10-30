# Security Incident Response Playbook

**Document Version:** 1.0  
**Last Updated:** October 30, 2025  
**Compliance Framework:** NIST 800-53 IR-4, IR-5, IR-6

## Overview

This playbook provides step-by-step procedures for responding to security incidents in the Budget Manager application. It aligns with NIST 800-53 Rev 5 Incident Response (IR) control family.

---

## Table of Contents

1. [Incident Classification](#incident-classification)
2. [Incident Response Team](#incident-response-team)
3. [Response Procedures](#response-procedures)
4. [Common Incident Scenarios](#common-incident-scenarios)
5. [Post-Incident Activities](#post-incident-activities)
6. [Contact Information](#contact-information)

---

## Incident Classification

### Severity Levels (NIST 800-53 IR-4)

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **CRITICAL** | Active breach, data exfiltration, system compromise | Immediate (< 15 min) | Database breach, ransomware, active intrusion |
| **HIGH** | Attempted breach, significant vulnerability | < 1 hour | Repeated failed authentication, DDoS attack, critical CVE |
| **MEDIUM** | Security policy violation, suspicious activity | < 4 hours | Account lockout, unauthorized access attempt, malware detection |
| **LOW** | Minor security event, informational | < 24 hours | Failed login, rate limit exceeded, policy violation |

### Incident Categories

1. **Unauthorized Access:** Failed logins, account lockouts, privilege escalation
2. **Data Breach:** Unauthorized data access, exfiltration, exposure
3. **Malware/Ransomware:** Malicious code execution, encryption attacks
4. **Denial of Service:** DDoS, resource exhaustion, availability impact
5. **Insider Threat:** Malicious insider, data theft, sabotage
6. **Third-Party Compromise:** Supply chain attack, vendor breach
7. **Physical Security:** Unauthorized physical access, theft

---

## Incident Response Team

### Roles & Responsibilities (NIST 800-53 IR-5)

| Role | Responsibilities | Contact |
|------|------------------|---------|
| **Incident Commander** | Overall coordination, decision-making | [To be assigned] |
| **Security Lead** | Technical investigation, forensics | [To be assigned] |
| **Development Lead** | Code review, patching, remediation | [To be assigned] |
| **Legal Counsel** | Compliance, breach notification, legal advice | [To be assigned] |
| **Communications Lead** | Internal/external communications, PR | [To be assigned] |
| **Database Administrator** | Database forensics, recovery, backup | [To be assigned] |

### Escalation Path

```
Low Severity → Security Lead
     ↓
Medium Severity → Security Lead + Incident Commander
     ↓
High Severity → Full IR Team + Management
     ↓
Critical Severity → Full IR Team + Management + Legal + External IR Firm
```

---

## Response Procedures

### Phase 1: Detection & Analysis (IR-4)

**Objective:** Identify and assess the incident.

#### 1.1 Initial Detection

**Sources of Detection:**
- Security event log alerts (see `security_event_log` table)
- Rate limit violations
- Failed login patterns
- System monitoring alerts
- User reports
- Third-party notifications

**Query Security Events:**

```sql
-- Check recent critical security events
SELECT * FROM security_event_log
WHERE severity = 'critical'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Check failed login patterns
SELECT email, ip_address, COUNT(*) as attempts
FROM failed_login_attempts
WHERE attempted_at > NOW() - INTERVAL '1 hour'
GROUP BY email, ip_address
HAVING COUNT(*) > 5;

-- Check session expirations
SELECT event_type, user_id, email, ip_address, event_data
FROM security_event_log
WHERE event_type = 'session_expired'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

#### 1.2 Initial Assessment

**Questions to Answer:**
- What happened? (Describe the incident)
- When did it happen? (Timestamp)
- Who is affected? (Users, systems, data)
- How severe is it? (Use severity matrix)
- Is it ongoing? (Active or contained)

**Document in Incident Ticket:**
- Incident ID: INC-YYYYMMDD-NNN
- Detection time
- Reporter
- Initial severity assessment
- Affected systems/users

#### 1.3 Notification

**Critical/High Severity:**
- Notify Incident Commander immediately
- Escalate to full IR team within 15 minutes
- Document notification time

**Medium/Low Severity:**
- Create incident ticket
- Notify Security Lead
- Regular business hours response

### Phase 2: Containment (IR-4)

**Objective:** Stop the incident from spreading and minimize damage.

#### 2.1 Short-Term Containment

**Immediate Actions:**

1. **Account Lockout:**
```typescript
// Lock compromised account
await storage.lockAccount(email, 60); // 60 minute lockout
await storage.logSecurityEvent({
  eventType: 'account_locked',
  severity: 'critical',
  email,
  eventData: { reason: 'security_incident', incidentId: 'INC-XXXXXXX' }
});
```

2. **IP Blocking:**
```typescript
// Add to rate limiter blacklist (implementation needed)
rateLimitStore.set(`blocked:${ipAddress}`, { count: Infinity, resetAt: Infinity });
```

3. **Session Termination:**
```sql
-- Terminate all sessions for compromised user
DELETE FROM sessions
WHERE sess::text LIKE '%"sub":"<user_id>"%';
```

4. **Disable Affected Features:**
- Comment out vulnerable code
- Disable affected API endpoints
- Deploy emergency patch

#### 2.2 Long-Term Containment

**Rebuild/Restore:**
- Provision new infrastructure if compromised
- Restore from clean backup (verified not infected)
- Patch vulnerabilities before restoring service

#### 2.3 Evidence Preservation

**Critical for Forensics:**

1. **Capture Security Logs:**
```sql
-- Export all security events for incident timeframe
COPY (
  SELECT * FROM security_event_log
  WHERE timestamp BETWEEN '<incident_start>' AND '<incident_end>'
) TO '/path/to/incident_logs_<incident_id>.csv' WITH CSV HEADER;
```

2. **Database Snapshot:**
```bash
# Create point-in-time backup
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE > incident_backup_$(date +%Y%m%d_%H%M%S).sql
```

3. **System State:**
- Capture running processes
- Network connections
- File integrity checks
- Memory dumps (if applicable)

### Phase 3: Eradication (IR-4)

**Objective:** Remove the threat completely.

#### 3.1 Root Cause Analysis

**Investigate:**
- How did the attacker gain access?
- What vulnerabilities were exploited?
- What systems were compromised?
- What data was accessed/exfiltrated?

**Tools:**
- Security event log analysis
- Code review
- Dependency vulnerability scan: `npm audit`
- Database audit log review

#### 3.2 Remove Threat

**Actions:**
- Delete malicious code
- Patch vulnerabilities
- Reset compromised credentials
- Remove backdoors
- Update dependencies: `npm update`

#### 3.3 Strengthen Defenses

**Immediate Hardening:**
- Implement additional security controls
- Tighten access controls
- Increase logging/monitoring
- Update firewall rules

### Phase 4: Recovery (IR-4)

**Objective:** Restore normal operations safely.

#### 4.1 System Restoration

**Validation Steps:**
1. Verify all malicious code removed
2. Confirm vulnerabilities patched
3. Test security controls
4. Validate data integrity
5. Review access logs

#### 4.2 Phased Restoration

**Approach:**
1. Restore to isolated staging environment
2. Run comprehensive security tests
3. Monitor for 24-48 hours
4. Gradually restore production access
5. Maintain heightened monitoring

#### 4.3 User Communication

**Template:**

```
Subject: Security Incident Notification

Dear [Organization Name],

We recently detected a security incident that may have affected your account. Here's what happened:

**What Happened:**
[Brief description of incident]

**What Data Was Affected:**
[Specific data types]

**What We've Done:**
[Remediation steps taken]

**What You Should Do:**
[User action items, if any]

**Questions:**
Contact security@[domain] or call [phone number]

We take security seriously and apologize for any inconvenience.

Sincerely,
[Company Name] Security Team
```

### Phase 5: Post-Incident Activity (IR-6)

**Objective:** Learn from the incident and improve defenses.

#### 5.1 Post-Incident Review

**Meeting Agenda:**
- Timeline reconstruction
- What worked well?
- What didn't work?
- What could be improved?
- Action items for improvement

#### 5.2 Documentation

**Incident Report Template:**

```markdown
# Incident Report: INC-YYYYMMDD-NNN

## Executive Summary
[Brief overview for management]

## Incident Details
- **Detection Time:** [Timestamp]
- **Containment Time:** [Timestamp]
- **Resolution Time:** [Timestamp]
- **Total Duration:** [Hours/Days]
- **Severity:** [Critical/High/Medium/Low]
- **Category:** [Type of incident]

## Timeline
| Time | Event |
|------|-------|
| [Time] | [Event description] |

## Impact Assessment
- **Users Affected:** [Number]
- **Data Compromised:** [Yes/No, details]
- **Financial Impact:** [Estimate]
- **Reputation Impact:** [Assessment]
- **Compliance Impact:** [Breach notifications required?]

## Root Cause
[Detailed analysis of how incident occurred]

## Response Actions
[What was done to contain and eradicate]

## Lessons Learned
### What Went Well
- [Item 1]
- [Item 2]

### What Could Be Improved
- [Item 1]
- [Item 2]

## Recommendations
1. [Specific action item with owner and deadline]
2. [Specific action item with owner and deadline]

## Compliance & Legal
- **Breach Notification Required:** [Yes/No]
- **Regulatory Reporting:** [Details]
- **Law Enforcement Contacted:** [Yes/No]

**Prepared By:** [Name]  
**Date:** [Date]  
**Approved By:** [Management]
```

#### 5.3 Improvement Actions

**Update Security Controls:**
- Implement new controls to prevent recurrence
- Update incident response playbook
- Enhance monitoring/detection
- Provide additional training

**Update Documentation:**
- `NIST_800-53_Security_Assessment.md`
- `SECURITY_CONTROLS.md`
- `SECURITY_INCIDENT_RESPONSE.md` (this document)

---

## Common Incident Scenarios

### Scenario 1: Account Takeover

**Detection:**
- Multiple failed login attempts
- Login from unusual location/IP
- Session activity from multiple IPs

**Response:**
1. Lock the affected account
2. Terminate all active sessions
3. Contact user via verified channel
4. Review security event log for compromise indicators
5. Reset user credentials
6. Enable additional authentication measures

**Query:**
```sql
SELECT * FROM security_event_log
WHERE user_id = '<user_id>'
  AND event_type IN ('login_failure', 'login_success', 'session_expired')
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp;
```

### Scenario 2: SQL Injection Attack

**Detection:**
- Unusual database queries in application logs
- Unexpected data returned to users
- Database error messages exposed

**Response:**
1. Identify affected endpoint
2. Disable affected endpoint immediately
3. Review all similar endpoints for vulnerability
4. Patch vulnerability (use parameterized queries)
5. Review database audit logs for data exfiltration
6. Assess data exposure
7. Restore from backup if data modified

**Prevention:**
- All queries use Drizzle ORM (parameterized)
- Never concatenate user input into SQL
- Enable database query logging

### Scenario 3: Denial of Service (DoS)

**Detection:**
- Rate limit exceeded alerts
- Application slowness/unavailability
- High CPU/memory usage
- Unusual traffic patterns

**Response:**
1. Identify attack source (IP addresses)
2. Implement IP blocking via rate limiter
3. Increase rate limit strictness temporarily
4. Contact hosting provider for DDoS mitigation
5. Scale infrastructure if needed
6. Monitor for distributed attack patterns

**Query:**
```sql
SELECT ip_address, COUNT(*) as request_count
FROM security_event_log
WHERE event_type = 'rate_limit_exceeded'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
ORDER BY request_count DESC
LIMIT 20;
```

### Scenario 4: Data Breach

**Detection:**
- Unusual data export activity
- Large database queries
- Unauthorized access to sensitive data
- External notification of exposed data

**Response:**
1. **IMMEDIATE:** Contain the breach (lock accounts, disable endpoints)
2. Identify scope of data exposed
3. Preserve evidence (database logs, security events)
4. Assess legal/compliance obligations (GDPR, CCPA, etc.)
5. Prepare breach notification if required
6. Contact legal counsel
7. Notify affected users
8. Offer identity protection services if appropriate
9. Conduct forensic analysis

**Legal Requirements:**
- **GDPR:** 72-hour breach notification to authorities
- **CCPA:** Notify California residents without unreasonable delay
- **HIPAA:** 60-day notification for health data (if applicable)
- **State Laws:** Vary by state, consult legal

### Scenario 5: Ransomware Attack

**Detection:**
- Files/database encrypted
- Ransom note displayed
- Unable to access data
- Unusual file modifications

**Response:**
1. **DO NOT PAY RANSOM** (FBI recommendation)
2. Isolate affected systems immediately
3. Preserve forensic evidence
4. Contact law enforcement (FBI Cyber Division)
5. Assess backup availability
6. Identify ransomware variant
7. Restore from clean backups
8. Rebuild affected systems
9. Implement additional security controls

**Prevention:**
- Regular encrypted backups (tested restoration)
- Multi-factor authentication
- Principle of least privilege
- Security awareness training
- Keep systems patched

---

## Contact Information

### Internal Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Incident Commander | [TBD] | [TBD] | [TBD] |
| Security Lead | [TBD] | [TBD] | [TBD] |
| Development Lead | [TBD] | [TBD] | [TBD] |
| Legal Counsel | [TBD] | [TBD] | [TBD] |

### External Contacts

| Organization | Purpose | Phone | Website |
|--------------|---------|-------|---------|
| **FBI Cyber Division** | Report cybercrime | 1-800-CALL-FBI | https://www.ic3.gov |
| **US-CERT** | Incident reporting | 1-888-282-0870 | https://www.cisa.gov/report |
| **Neon Support** | Database incidents | [Support] | https://neon.tech/support |
| **Replit Support** | Platform incidents | [Support] | https://replit.com/support |

### Compliance & Regulatory

| Agency | When to Contact | Website |
|--------|-----------------|---------|
| **HHS OCR** | HIPAA breach (if applicable) | https://www.hhs.gov/ocr |
| **FTC** | Consumer data breach | https://www.ftc.gov |
| **State AG** | State law breach notification | [Varies by state] |
| **EU DPA** | GDPR breach (if EU users) | [Varies by country] |

---

## Incident Response Tools

### Security Event Analysis

```sql
-- Dashboard: Recent security events by type
SELECT 
  event_type,
  severity,
  COUNT(*) as count,
  MIN(timestamp) as first_seen,
  MAX(timestamp) as last_seen
FROM security_event_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY count DESC;

-- Suspicious IPs
SELECT 
  ip_address,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_events,
  array_agg(DISTINCT event_type) as event_types
FROM security_event_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND severity IN ('warning', 'critical')
GROUP BY ip_address
HAVING COUNT(*) > 10
ORDER BY total_events DESC;

-- Account lockout tracking
SELECT 
  email,
  COUNT(*) as lockout_count,
  MAX(attempted_at) as last_lockout
FROM failed_login_attempts
WHERE lockout_until IS NOT NULL
  AND attempted_at > NOW() - INTERVAL '7 days'
GROUP BY email
ORDER BY lockout_count DESC;
```

### Backup & Recovery

```bash
# Create emergency backup
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE -F c -b -v -f "emergency_backup_$(date +%Y%m%d_%H%M%S).backup"

# Restore from backup (to new database for safety)
pg_restore -h $PGHOST -U $PGUSER -d $PGDATABASE_RECOVERY -v backup_file.backup

# Verify backup integrity
pg_restore --list backup_file.backup | wc -l
```

---

## Training & Exercises

### Recommended IR Drills

**Quarterly:**
- Tabletop exercise (simulate incident response)
- Communication drill (practice notifications)
- Backup restoration test

**Annually:**
- Full incident simulation
- Red team / penetration testing
- IR playbook review and update

### Training Resources

- SANS Incident Response training
- NIST Computer Security Incident Handling Guide (SP 800-61)
- CISA Cyber Incident Response resources
- Internal security awareness training

---

## Appendix

### A. Regulatory Breach Notification Requirements

| Regulation | Trigger | Timeline | Notification Required |
|------------|---------|----------|----------------------|
| GDPR | Personal data breach | 72 hours | DPA + affected individuals |
| CCPA | Unauthorized access to PI | Without unreasonable delay | California AG + consumers |
| HIPAA | PHI breach affecting 500+ | 60 days | HHS + affected individuals + media |
| PCI-DSS | Payment card data breach | Immediately | Card brands + acquirer |

### B. Incident Severity Matrix

| Confidentiality | Integrity | Availability | Severity |
|----------------|-----------|--------------|----------|
| High | High | High | Critical |
| High | High | Low/Med | Critical |
| High | Low/Med | Any | High |
| Med | High | High | High |
| Med | Med | Med | Medium |
| Low | Low | Low | Low |

### C. Evidence Collection Checklist

- [ ] Security event log export
- [ ] Database audit logs
- [ ] Application logs
- [ ] Network traffic captures
- [ ] System snapshots/backups
- [ ] User account activity
- [ ] File system changes
- [ ] Memory dumps (if applicable)
- [ ] Timeline documentation
- [ ] Screenshots of evidence
- [ ] Chain of custody forms

---

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-30 | Security Team | Initial creation |

**Review Schedule:** Quarterly or after major incidents

**Next Review Date:** 2026-01-30

**Document Owner:** Security Lead

---

**Remember:** Time is critical in incident response. Follow this playbook, but adapt as needed based on the specific incident. When in doubt, escalate immediately.
