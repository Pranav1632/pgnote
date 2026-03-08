import { customAlphabet, nanoid } from "nanoid";
import { applyAlgo, type PasskeyAlgo } from "@/lib/passkey";

const RAW_KEY_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
const DEFAULT_CHALLENGE_ID_SIZE = 21;

export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function generateRawKey(length: number): string {
  if (!Number.isInteger(length) || length < 8 || length > 14) {
    throw new Error("Invalid key length. Must be between 8 and 14.");
  }

  const keyGenerator = customAlphabet(RAW_KEY_ALPHABET, length);
  return keyGenerator();
}

export function createChallenge(rawKey: string, algo: PasskeyAlgo): string {
  return applyAlgo(rawKey, algo);
}

export function createChallengeId(): string {
  return nanoid(DEFAULT_CHALLENGE_ID_SIZE);
}

export function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}
