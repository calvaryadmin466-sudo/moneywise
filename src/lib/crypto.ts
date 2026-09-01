const VERSION_PREFIX = 'v1:';
const IV_BYTE_LENGTH = 12;
const SALT_BYTE_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

export function generateSalt(): string {
  const bytes = new Uint8Array(SALT_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function isWebCryptoSupported(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

async function deriveKey(password: string, saltB64: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const saltBytes = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptString(plaintext: string, password: string, saltB64: string): Promise<string> {
  const key = await deriveKey(password, saltB64);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const combined = new Uint8Array(iv.byteLength + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.byteLength);

  const cipherB64 = btoa(String.fromCharCode(...combined));
  return `${VERSION_PREFIX}${cipherB64}`;
}

export async function decryptString(payload: string, password: string, saltB64: string): Promise<string> {
  if (!payload.startsWith(VERSION_PREFIX)) {
    throw new Error('Unsupported encryption version');
  }
  const cipherB64 = payload.slice(VERSION_PREFIX.length);
  const combined = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));
  const iv = combined.subarray(0, IV_BYTE_LENGTH);
  const cipherBytes = combined.subarray(IV_BYTE_LENGTH);

  const key = await deriveKey(password, saltB64);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes
  );

  const decoder = new TextDecoder();
  return decoder.decode(plainBuffer);
}

export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface EncryptedBackupBundle {
  version: number;
  generated_at: string;
  checksum_sha256: string;
  encrypted_payload: string;
}

export async function createBackupBundle(data: unknown, password: string, salt: string): Promise<EncryptedBackupBundle> {
  const plaintext = JSON.stringify(data);
  const encrypted = await encryptString(plaintext, password, salt);
  const checksum = await sha256Hex(plaintext);
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    checksum_sha256: checksum,
    encrypted_payload: encrypted,
  };
}

export async function restoreBackupBundle(bundle: EncryptedBackupBundle, password: string, salt: string): Promise<unknown> {
  const plaintext = await decryptString(bundle.encrypted_payload, password, salt);
  const actualChecksum = await sha256Hex(plaintext);
  if (actualChecksum !== bundle.checksum_sha256) {
    throw new Error('Backup checksum mismatch — bundle is corrupted or password is wrong');
  }
  return JSON.parse(plaintext);
}
