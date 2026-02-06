import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { plaidClient } from './plaid';

const WEBHOOK_MAX_AGE_SECONDS = 5 * 60;

export async function verifyPlaidWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): Promise<boolean> {
  const signedJwt = headers['plaid-verification'] as string;
  if (!signedJwt) {
    console.warn('[Plaid Webhook] Missing Plaid-Verification header');
    return false;
  }

  try {
    const decoded = jwt.decode(signedJwt, { complete: true });
    if (!decoded || !decoded.header.kid) {
      console.warn('[Plaid Webhook] Invalid JWT format');
      return false;
    }

    const keyId = decoded.header.kid;

    const keyResponse = await plaidClient.webhookVerificationKeyGet({
      key_id: keyId,
    });

    const jwk = keyResponse.data.key;

    const publicKey = crypto.createPublicKey({
      key: jwk as any,
      format: 'jwk',
    });

    const verifiedToken = jwt.verify(signedJwt, publicKey, {
      algorithms: ['ES256'],
    }) as { iat: number; request_body_sha256: string };

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - verifiedToken.iat > WEBHOOK_MAX_AGE_SECONDS) {
      console.warn('[Plaid Webhook] Webhook timestamp too old (>5 minutes)');
      return false;
    }

    const bodyHash = crypto
      .createHash('sha256')
      .update(rawBody)
      .digest('hex');

    if (bodyHash !== verifiedToken.request_body_sha256) {
      console.warn('[Plaid Webhook] Request body hash mismatch');
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('[Plaid Webhook] Verification failed:', error.message);
    return false;
  }
}
