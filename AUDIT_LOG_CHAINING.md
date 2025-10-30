# Audit Log Cryptographic Chaining

## Overview
This document describes the cryptographic chaining system implemented for audit logs to ensure tamper detection and maintain log integrity. This feature complies with NIST 800-53 AU-9 (Protection of Audit Information) requirements for detecting unauthorized changes to audit logs.

## How It Works

### Cryptographic Hash Chain
Each audit log entry includes:
1. **chainHash**: SHA-256 hash of the current entry's content
2. **previousHash**: SHA-256 hash from the previous audit log entry

This creates a blockchain-like chain where:
- The first entry has `previousHash = null`
- Each subsequent entry includes the `chainHash` of the previous entry as its `previousHash`
- Any tampering with an entry will break the chain

### Hash Calculation
The `chainHash` is computed using HMAC-SHA256 from:
```typescript
{
  id,
  organizationId,
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  changes,
  timestamp, // Stored database timestamp (ISO format)
  previousHash
}
```

Using HMAC-SHA256 (keyed with ENCRYPTION_KEY), this produces a 64-character hexadecimal hash that:
- Uniquely identifies the log entry
- Links it to the previous entry via previousHash
- Cannot be forged without the secret key
- Detects any modification to the entry

## Implementation

### Automatic Chain Management
When creating a new audit log (within a database transaction):
1. **Lock latest entry**: Retrieve most recent audit log with SELECT FOR UPDATE (prevents race conditions)
2. **Set previousHash**: Use previous entry's `chainHash` (or null for first entry)
3. **Insert**: Save audit log with previousHash to database (timestamp auto-generated)
4. **Compute chainHash**: Calculate HMAC-SHA256 hash using stored timestamp and ID
5. **Update**: Set chainHash on newly inserted entry

This happens automatically in the `createAuditLog()` method within a database transaction - no manual intervention required. The transaction ensures no concurrent inserts can cause chain corruption.

### Chain Verification
To verify the audit log chain integrity:

```typescript
const result = await storage.verifyAuditLogChain(organizationId);

if (result.isValid) {
  console.log(result.message); // "Audit log chain verified successfully (N entries)"
} else {
  console.log(result.message); // Details about tampering
  console.log('Tampered entries:', result.tamperedIndices);
  console.log('Broken chain links:', result.brokenChainIndices);
}
```

## Tamper Detection

### Types of Tampering Detected

1. **Modified Entry**: If someone changes an audit log entry after creation
   - The `chainHash` will no longer match the HMAC computed hash
   - Detected by recalculating HMAC and comparing hashes
   - Without the secret key, attacker cannot forge a valid hash

2. **Deleted Entry**: If someone deletes an entry from the middle of the chain
   - The next entry's `previousHash` won't match the new previous entry's `chainHash`
   - Gap in sequential IDs will be detected
   - Detected as broken chain link and missing index

3. **Inserted Entry**: If someone tries to insert a fake entry
   - Without the secret key, cannot compute valid `chainHash`
   - The fake entry's `previousHash` won't match the actual previous entry
   - The next entry's `previousHash` won't match the fake entry's `chainHash`
   - Detected as broken chain links and tampered entry

### Example Detection Scenario
```
Original chain:
Entry 1: previousHash=null, chainHash=ABC123
Entry 2: previousHash=ABC123, chainHash=DEF456
Entry 3: previousHash=DEF456, chainHash=GHI789

If Entry 2 is modified:
Entry 1: previousHash=null, chainHash=ABC123 ✓
Entry 2: previousHash=ABC123, chainHash=XYZ999 ✗ (tampered)
Entry 3: previousHash=DEF456, chainHash=GHI789 ✗ (broken link)
```

## Security Properties

### Tamper-Evident (Not Tamper-Proof)
- **Cannot prevent** unauthorized modification of database records
- **Can detect** any tampering after the fact
- Creates a strong audit trail that reveals security breaches

### Cryptographic Strength
- **HMAC-SHA256**: Keyed hash using secret key (NIST approved)
- **Message Authentication**: Prevents forgery by requiring secret key to compute hash
- **Collision resistance**: Practically impossible to find two different inputs with the same hash
- **Avalanche effect**: Small change in input creates completely different hash
- **Key-dependent**: Without the secret key, attackers cannot forge valid hashes

### Organizational Isolation
- Each organization has its own independent chain
- Chains start fresh for each organization (previousHash=null for first entry)
- Tampering in one organization doesn't affect others

## NIST 800-53 Compliance

### AU-9: Protection of Audit Information
- ✅ Detect unauthorized changes to audit records
- ✅ Cryptographic mechanisms to protect audit information
- ✅ Maintain chain of custody for audit information

### AU-9(3): Cryptographic Protection
- ✅ Use cryptographic mechanisms (SHA-256) to protect audit log integrity
- ✅ Ensure authenticity of audit records via hash chaining
- ✅ Detect tampering through chain verification

## Usage Guidelines

### When to Verify Chain
1. **Routine monitoring**: Periodically verify chain integrity (e.g., daily/weekly)
2. **Security audit**: Before and during security audits
3. **Incident response**: When investigating suspected tampering
4. **Compliance review**: As part of regulatory compliance checks

### Handling Tamper Detection
If tampering is detected:
1. **Immediate alert**: Notify security team and organization owners
2. **Incident response**: Follow security incident response procedures
3. **Investigation**: Determine scope and impact of tampering
4. **Evidence preservation**: Preserve tampered logs as evidence
5. **Remediation**: Restore from backups if available, enhance security controls

## Limitations

### Not a Complete Audit Solution
- Protects against **post-modification tampering**
- Does not prevent **real-time tampering** during log creation
- Does not protect against **database administrator** tampering
- Should be combined with other security controls (database triggers, immutable storage, etc.)

### Performance Considerations
- Each audit log creation requires one additional SELECT query (to get previous hash)
- Hash computation is fast (SHA-256 on small data)
- Verification scales linearly with number of logs (O(n) complexity)
- For large organizations, consider periodic chain verification rather than full chain verification

## Future Enhancements

Potential improvements for stronger security:
1. **External hash anchoring**: Store periodic chain hashes in external immutable storage
2. **Digital signatures**: Sign each entry with private key for non-repudiation
3. **Merkle trees**: Use Merkle tree structure for more efficient verification
4. **Real-time monitoring**: Automated chain verification with alerting
5. **Distributed ledger**: Consider blockchain for ultimate tamper resistance

## Testing

To test the audit log chaining:

```typescript
// Create test audit logs
await storage.createAuditLog({
  organizationId: 1,
  userId: 'user-123',
  action: 'create',
  entityType: 'transaction',
  entityId: '1',
  newValues: { amount: 100 },
  changes: 'Created transaction #1',
});

// Verify chain
const result = await storage.verifyAuditLogChain(1);
console.log(result); // Should show isValid: true
```

## References

- NIST SP 800-53 Rev. 5: AU-9 (Protection of Audit Information)
- FIPS 180-4: Secure Hash Standard (SHA-256)
- Blockchain technology principles
- Tamper-evident logging best practices
