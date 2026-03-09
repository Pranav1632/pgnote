import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { normalizeSlug } from "@/lib/auth";

const CHALLENGE_KEY_PREFIX = "pgnote:challenge:";
const LOGIN_RATE_LIMIT_PREFIX = "pgnote:ratelimit:login";
const RECOVERY_RATE_LIMIT_PREFIX = "pgnote:ratelimit:recovery";
const CHALLENGE_TTL_SECONDS = 120;

export interface ChallengeRecord {
  slug: string;
  rawKey: string;
  createdAt: number;
}

declare global {
  var upstashRedisClient: Redis | undefined;
  var loginRateLimitInstance: Ratelimit | undefined;
  var recoveryRateLimitInstance: Ratelimit | undefined;
}

export const redis =
  globalThis.upstashRedisClient ??
  new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

export const loginRateLimit =
  globalThis.loginRateLimitInstance ??
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: true,
    prefix: LOGIN_RATE_LIMIT_PREFIX,
  });

export const recoveryRateLimit =
  globalThis.recoveryRateLimitInstance ??
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "10 m"),
    analytics: true,
    prefix: RECOVERY_RATE_LIMIT_PREFIX,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.upstashRedisClient = redis;
  globalThis.loginRateLimitInstance = loginRateLimit;
  globalThis.recoveryRateLimitInstance = recoveryRateLimit;
}

export function loginRateLimitIdentifier(ipAddress: string, slug: string): string {
  return `${ipAddress}:${normalizeSlug(slug)}`;
}

export async function checkLoginRateLimit(ipAddress: string, slug: string) {
  return loginRateLimit.limit(loginRateLimitIdentifier(ipAddress, slug));
}

export async function checkRecoveryRateLimit(ipAddress: string) {
  return recoveryRateLimit.limit(ipAddress);
}

export function challengeKey(challengeId: string): string {
  return `${CHALLENGE_KEY_PREFIX}${challengeId}`;
}

export async function storeChallenge(challengeId: string, record: ChallengeRecord): Promise<void> {
  await redis.set(challengeKey(challengeId), record, {
    ex: CHALLENGE_TTL_SECONDS,
  });
}

function parseChallengeRecord(raw: unknown): ChallengeRecord | null {
  if (!raw) {
    return null;
  }

  let candidate: unknown = raw;
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const parsed = candidate as Partial<ChallengeRecord>;
  if (
    typeof parsed.slug !== "string" ||
    typeof parsed.rawKey !== "string" ||
    typeof parsed.createdAt !== "number"
  ) {
    return null;
  }

  return {
    slug: parsed.slug,
    rawKey: parsed.rawKey,
    createdAt: parsed.createdAt,
  };
}

export async function getChallenge(challengeId: string): Promise<ChallengeRecord | null> {
  const raw = await redis.get(challengeKey(challengeId));
  return parseChallengeRecord(raw);
}

export async function consumeChallenge(challengeId: string): Promise<ChallengeRecord | null> {
  const raw = await redis.getdel(challengeKey(challengeId));
  return parseChallengeRecord(raw);
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  await redis.del(challengeKey(challengeId));
}
