/**
 * PGNote Client-Side Zero-Knowledge Encryption
 * AES-GCM-256 with PBKDF2 Key Derivation using standard Web Crypto API
 */

const ENCRYPTION_VERSION = "ENC:v1";
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTE_LENGTH = 16;
const IV_BYTE_LENGTH = 12;

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto API (subtle) is not supported in this runtime environment.");
}

function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    return window.crypto.getRandomValues(array);
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(array);
  }
  throw new Error("Web Crypto API (getRandomValues) is not supported in this runtime environment.");
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string.");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a secret passphrase and salt using PBKDF2
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  saltBytes: Uint8Array
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const rawKeyMaterial = await subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    rawKeyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Checks whether content is an encrypted PGNote envelope
 */
export function isEncryptedEnvelope(content: string): boolean {
  return typeof content === "string" && content.startsWith(`${ENCRYPTION_VERSION}:`);
}

/**
 * Encrypts arbitrary plaintext into a self-contained, authenticated envelope:
 * Format: ENC:v1:<saltHex>:<ivHex>:<ciphertextBase64>
 */
export async function encryptNoteContent(
  plaintext: string,
  passphrase: string
): Promise<string> {
  if (!plaintext) return "";
  if (!passphrase) {
    throw new Error("Passphrase is required to encrypt content.");
  }

  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();

  const salt = getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
  const iv = getRandomValues(new Uint8Array(IV_BYTE_LENGTH));

  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const encodedPlaintext = encoder.encode(plaintext);

  const ciphertextBuffer = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedPlaintext
  );

  const ciphertextBase64 = bytesToBase64(new Uint8Array(ciphertextBuffer));
  return `${ENCRYPTION_VERSION}:${bufferToHex(salt)}:${bufferToHex(iv)}:${ciphertextBase64}`;
}

/**
 * Decrypts an authenticated PGNote envelope back to original plaintext.
 * Returns the original text if it was never encrypted.
 */
export async function decryptNoteContent(
  envelopeOrPlaintext: string,
  passphrase: string
): Promise<string> {
  if (!envelopeOrPlaintext) return "";
  if (!isEncryptedEnvelope(envelopeOrPlaintext)) {
    // Unencrypted legacy note passes through safely
    return envelopeOrPlaintext;
  }

  if (!passphrase) {
    throw new Error("Passphrase is required to decrypt content.");
  }

  const parts = envelopeOrPlaintext.split(":");
  if (parts.length !== 5 || parts[0] !== "ENC" || parts[1] !== "v1") {
    throw new Error("Malformed encrypted note envelope.");
  }

  const saltHex = parts[2];
  const ivHex = parts[3];
  const ciphertextBase64 = parts[4];

  const salt = hexToBytes(saltHex);
  const iv = hexToBytes(ivHex);
  const ciphertext = base64ToBytes(ciphertextBase64);

  const subtle = getSubtleCrypto();
  const key = await deriveKeyFromPassphrase(passphrase, salt);

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as unknown as BufferSource,
      },
      key,
      ciphertext as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    throw new Error("Decryption failed: Invalid passphrase or corrupted note ciphertext.");
  }
}
