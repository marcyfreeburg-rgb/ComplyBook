import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Field-level encryption requires this key.');
  }
  
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters for AES-256 encryption.');
  }
  
  return crypto.scryptSync(key, 'budget-manager-salt', 32);
}

export function encryptField(plaintext: string | null): string | null {
  if (!plaintext || plaintext.trim() === '') {
    return null;
  }
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    const result = Buffer.concat([
      salt,
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
    
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
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
