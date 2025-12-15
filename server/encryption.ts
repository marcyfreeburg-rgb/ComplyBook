import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Cache the derived key to avoid expensive scrypt on every operation
let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  // Return cached key if available
  if (cachedKey) {
    return cachedKey;
  }
  
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Field-level encryption requires this key.');
  }
  
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters for AES-256 encryption.');
  }
  
  // Derive key once and cache it
  cachedKey = crypto.scryptSync(key, 'budget-manager-salt', 32);
  return cachedKey;
}

export function encryptField(plaintext: string | null): string | null {
  if (!plaintext || plaintext.trim() === '') {
    return null;
  }
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: [IV][Auth Tag][Ciphertext]
    const result = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');
    
    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt sensitive field');
  }
}

export function decryptField(ciphertext: string | null): string | null {
  if (!ciphertext || ciphertext.trim() === '') {
    return null;
  }
  
  try {
    const key = getEncryptionKey();
    const buffer = Buffer.from(ciphertext, 'base64');
    
    // Parse format: [IV][Auth Tag][Ciphertext]
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt sensitive field. Data may be corrupted or encryption key changed.');
  }
}

export function maskSensitiveData(value: string | null, visibleChars: number = 4): string {
  if (!value || value.length <= visibleChars) {
    return '****';
  }
  
  const masked = '*'.repeat(value.length - visibleChars);
  const visible = value.slice(-visibleChars);
  
  return masked + visible;
}

export function validateEncryptionKey(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch (error) {
    console.error('Encryption key validation failed:', error);
    return false;
  }
}

export function encryptAccessToken(token: string): string {
  const encrypted = encryptField(token);
  if (!encrypted) {
    throw new Error('Failed to encrypt access token');
  }
  return encrypted;
}

export function decryptAccessToken(encryptedToken: string): string {
  if (!encryptedToken) {
    throw new Error('Access token is required');
  }
  
  // Check if the token looks like a Plaid access token (starts with 'access-')
  // If so, it's not encrypted yet (legacy data)
  if (encryptedToken.startsWith('access-')) {
    return encryptedToken;
  }
  
  const decrypted = decryptField(encryptedToken);
  if (!decrypted) {
    throw new Error('Failed to decrypt access token');
  }
  return decrypted;
}

export function isTokenEncrypted(token: string): boolean {
  // Plaid access tokens start with 'access-'
  // Encrypted tokens are base64 and won't start with 'access-'
  return !token.startsWith('access-');
}
