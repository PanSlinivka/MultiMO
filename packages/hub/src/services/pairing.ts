import { PAIRING_CODE_CHARS, PAIRING_CODE_LENGTH, PAIRING_CODE_TTL_MS } from '@multimo/shared';
import crypto from 'crypto';

export function generateShortCode(): string {
  let code = '';
  const bytes = crypto.randomBytes(PAIRING_CODE_LENGTH);
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    code += PAIRING_CODE_CHARS[bytes[i] % PAIRING_CODE_CHARS.length];
  }
  return code;
}

export function generateQrPayload(publicUrl: string, shortCode: string): string {
  return `${publicUrl}/pair?code=${shortCode}`;
}

export function getPairingExpiresAt(): number {
  return Date.now() + PAIRING_CODE_TTL_MS;
}
