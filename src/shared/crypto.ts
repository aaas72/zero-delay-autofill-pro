// ─── Native Web Crypto API Wrapper ─────────────────────────────────────────────
// Blazing fast, client-side only, PBKDF2 + AES-GCM encryption. Zero libraries.

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives an AES-GCM CryptoKey from a password string using PBKDF2 key derivation.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  // Import raw password as key material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes as any,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  salt: string;
  iv: string;
}

/**
 * Encrypts data using AES-GCM with a PBKDF2 derived key from the password.
 */
export async function encryptData(data: string, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKey(password, salt);
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    dataBytes as any
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts data using AES-GCM with a PBKDF2 derived key from the password.
 */
export async function decryptData(
  ciphertext: string,
  password: string,
  salt: string,
  iv: string
): Promise<string> {
  const saltBytes = base64ToBuffer(salt);
  const ivBytes = base64ToBuffer(iv);
  const ciphertextBytes = base64ToBuffer(ciphertext);

  const key = await deriveKey(password, saltBytes);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as any,
    },
    key,
    ciphertextBytes as any
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Generates a verification token package for verifying passwords in the future.
 */
export async function generateVerificationToken(password: string): Promise<EncryptedPayload> {
  return encryptData('auth-ok', password);
}

/**
 * Verifies if the password is correct by trying to decrypt the token package.
 */
export async function verifyPassword(password: string, token: EncryptedPayload): Promise<boolean> {
  try {
    const decrypted = await decryptData(token.ciphertext, password, token.salt, token.iv);
    return decrypted === 'auth-ok';
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically secure random password.
 */
export function generateSecurePassword(
  length: number = 16,
  options = { uppercase: true, lowercase: true, numbers: true, symbols: true }
): string {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let allChars = '';
  const guaranteedChars: string[] = [];

  if (options.uppercase) {
    allChars += uppercaseChars;
    guaranteedChars.push(uppercaseChars[getRandomIndex(uppercaseChars.length)]);
  }
  if (options.lowercase) {
    allChars += lowercaseChars;
    guaranteedChars.push(lowercaseChars[getRandomIndex(lowercaseChars.length)]);
  }
  if (options.numbers) {
    allChars += numberChars;
    guaranteedChars.push(numberChars[getRandomIndex(numberChars.length)]);
  }
  if (options.symbols) {
    allChars += symbolChars;
    guaranteedChars.push(symbolChars[getRandomIndex(symbolChars.length)]);
  }

  if (allChars.length === 0) {
    allChars = lowercaseChars + numberChars;
  }

  const result: string[] = [];
  const remainingLength = Math.max(0, length - guaranteedChars.length);
  for (let i = 0; i < remainingLength; i++) {
    result.push(allChars[getRandomIndex(allChars.length)]);
  }

  const combined = [...guaranteedChars, ...result];
  const shuffled = shuffleArray(combined);

  return shuffled.join('');
}

function getRandomIndex(max: number): number {
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  return randomBytes[0] % max;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = getRandomIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
