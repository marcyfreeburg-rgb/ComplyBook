import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'crypto';

const APP_NAME = 'ComplyBook';
const BACKUP_CODE_COUNT = 10;

export function generateTotpSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function createTotpUri(secret: string, email: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  return await QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

export function verifyTotp(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  
  // Allow window of 2 for time drift tolerance (+/- 60 seconds)
  const delta = totp.validate({ token, window: 2 });
  console.log(`[MFA] TOTP validation result: delta=${delta}, token=${token.substring(0, 2)}****, serverTime=${new Date().toISOString()}`);
  return delta !== null;
}

export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(formatted);
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.replace('-', '').toLowerCase()).digest('hex');
}

export function verifyBackupCode(code: string, hashedCodes: string[]): { valid: boolean; remainingCodes: string[] } {
  const normalizedCode = code.replace('-', '').toLowerCase();
  const hashedInput = crypto.createHash('sha256').update(normalizedCode).digest('hex');
  
  const index = hashedCodes.findIndex(hc => hc === hashedInput);
  if (index !== -1) {
    const remainingCodes = [...hashedCodes];
    remainingCodes.splice(index, 1);
    return { valid: true, remainingCodes };
  }
  
  return { valid: false, remainingCodes: hashedCodes };
}
