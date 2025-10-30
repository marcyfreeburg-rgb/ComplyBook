# Field-Level Encryption Implementation

## Overview
This document describes the field-level encryption system implemented to protect sensitive data at rest, complying with NIST 800-53 SC-28 requirements.

## Encryption Specification

### Algorithm
- **Cipher:** AES-256-GCM (Galois/Counter Mode)
- **Key Derivation:** PBKDF2 with scrypt (32-byte key)
- **IV:** 16 bytes (randomly generated per encryption)
- **Authentication Tag:** 16 bytes (GCM authentication)
- **Salt:** 32 bytes (randomly generated per encryption)

### Why AES-256-GCM?
1. **NIST Approved:** Federal Information Processing Standard (FIPS) 197
2. **Authenticated Encryption:** Provides both confidentiality and integrity
3. **Performance:** Hardware-accelerated on modern CPUs
4. **Security:** Industry standard for protecting data at rest

## Encrypted Fields

The following sensitive fields are encrypted at rest:

### Organizations Table
- `tax_id` - Tax identification numbers (EIN for nonprofits, EIN/SSN for for-profits)

### Donors Table
- `tax_id` - Donor tax identification numbers (for tax reporting)

### Employees Table
- `bank_account_number` - Employee bank account numbers (for payroll direct deposit)
- `bank_routing_number` - Bank routing numbers (for payroll direct deposit)

### Sub-Awards Table (Government Grants)
- `subrecipient_ein` - Subrecipient employer identification numbers

### Subcontractors Table (Government Contracts)
- `tax_id` - Subcontractor tax identification numbers (for 1099 reporting)

## Encryption Key Management

### Environment Variable
The encryption key is stored in the `ENCRYPTION_KEY` environment variable:

```bash
# Minimum 32 characters (recommended: 64+ characters for additional security)
ENCRYPTION_KEY="your-secure-random-key-minimum-32-characters-long"
```

### Key Generation
Generate a secure random key:

```bash
# Using OpenSSL (recommended)
openssl rand -base64 48

# Using Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### Key Rotation
**CRITICAL:** Changing the encryption key will make all existing encrypted data unreadable.

**Key rotation procedure:**
1. Back up database before rotation
2. Decrypt all fields with old key
3. Set new `ENCRYPTION_KEY`
4. Re-encrypt all fields with new key
5. Verify decryption works
6. Securely delete old key

## Implementation

### Encryption Functions

```typescript
import { encryptField, decryptField, maskSensitiveData } from './encryption';

// Encrypt before saving to database
const encryptedTaxId = encryptField(organization.taxId);

// Decrypt after reading from database
const decryptedTaxId = decryptField(encryptedValue);

// Display masked value in UI
const maskedTaxId = maskSensitiveData(decryptedTaxId, 4); // "**-****1234"
```

### Storage Layer Integration

The storage layer automatically encrypts sensitive fields when saving and decrypts when retrieving:

```typescript
// Example: Creating an organization with encrypted tax ID
await storage.createOrganization({
  name: "Acme Nonprofit",
  taxId: "12-3456789", // Automatically encrypted
  // ...
});

// Example: Retrieving organization (tax ID automatically decrypted)
const org = await storage.getOrganization(organizationId);
console.log(org.taxId); // "12-3456789" (decrypted)
```

### Database Storage Format

Encrypted fields are stored as base64-encoded strings containing:
```
[32-byte salt][16-byte IV][16-byte auth tag][variable-length ciphertext]
```

Example encrypted value:
```
"kQw8Rh3L9pN2cF5xT6vB1jY7mZ8sD4aP0oK3iH2gE5wU9rL7nM4bV6xC8zA2qW5e..."
```

## Security Considerations

### ✅ Implemented
- AES-256-GCM with authentication
- Random IV per encryption (no IV reuse)
- Secure key derivation (scrypt)
- Tamper detection via authentication tags

### ⚠️ Important Notes
1. **Key Security:** Never commit `ENCRYPTION_KEY` to version control
2. **Key Backup:** Store encryption key in secure key vault (AWS KMS, Azure Key Vault, HashiCorp Vault)
3. **Access Control:** Limit who can access the encryption key
4. **Audit Trail:** All access to encrypted fields is logged in security_event_log

### 🔒 Production Recommendations
1. **Use a Hardware Security Module (HSM)** for key storage
2. **Implement key rotation** every 90 days
3. **Use envelope encryption** for additional security layer
4. **Enable database-level encryption** (Transparent Data Encryption)
5. **Monitor decryption failures** for potential tampering

## Compliance Mapping

### NIST 800-53 SC-28: Protection of Information at Rest
✅ **SC-28(1):** Cryptographic Protection
- Implemented AES-256-GCM encryption for sensitive fields
- FIPS 197 approved algorithm
- Authentication prevents tampering

✅ **MP-5:** Media Sanitization
- Encrypted data cannot be read without encryption key
- Database backups contain only encrypted data

## Testing Encryption

### Validate Encryption Key
```typescript
import { validateEncryptionKey } from './encryption';

if (!validateEncryptionKey()) {
  console.error('Encryption key is invalid or not set');
}
```

### Test Encryption/Decryption
```bash
# Insert test data
curl -X POST http://localhost:5000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Org", "taxId": "12-3456789"}'

# Verify encryption in database
psql $DATABASE_URL -c "SELECT tax_id FROM organizations WHERE name = 'Test Org';"
# Should show base64-encoded encrypted value

# Verify decryption via API
curl http://localhost:5000/api/organizations/1
# Should show decrypted value: "12-3456789"
```

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is not set"
**Solution:** Set the `ENCRYPTION_KEY` environment variable with a minimum 32-character random string.

### Error: "Failed to decrypt sensitive field"
**Possible causes:**
1. Encryption key has changed
2. Database corruption
3. Manual modification of encrypted field

**Solution:**
1. Verify `ENCRYPTION_KEY` hasn't changed
2. Check database integrity
3. Restore from backup if necessary

### Performance Considerations
- **Encryption overhead:** ~1-2ms per field
- **Recommended:** Encrypt only truly sensitive fields
- **Not recommended:** Encrypting frequently queried search fields

## Future Enhancements

### Phase 4 (Optional)
1. **Envelope Encryption:** Encrypt data encryption keys with master key
2. **Key Rotation Automation:** Automated key rotation with zero downtime
3. **Field-Level Access Control:** Role-based decryption permissions
4. **Searchable Encryption:** Homomorphic encryption for encrypted field searches
5. **HSM Integration:** Hardware Security Module for key storage

---

**Document Version:** 1.0  
**Last Updated:** October 30, 2025  
**NIST Control:** SC-28 (Protection of Information at Rest)  
**Compliance Status:** ✅ IMPLEMENTED
