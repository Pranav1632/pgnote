import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { normalizeSlug } from "@/lib/auth";

const CHALLENGE_KEY_PREFIX = "pgnote:challenge:";
const LOGIN_RATE_LIMIT_PREFIX = "pgnote:ratelimit:login";
const CHALLENGE_TTL_SECONDS = 120;

export interface ChallengeRecord {
  slug: string;
  rawKey: string;
  createdAt: number;
}

declare global {
  var upstashRedisClient: Redis | undefined;
  var loginRateLimitInstance: Ratelimit | undefined;
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

if (process.env.NODE_ENV !== "production") {
  globalThis.upstashRedisClient = redis;
  globalThis.loginRateLimitInstance = loginRateLimit;
}

export function loginRateLimitIdentifier(ipAddress: string, slug: string): string {
  return `${ipAddress}:${normalizeSlug(slug)}`;
}

export async function checkLoginRateLimit(ipAddress: string, slug: string) {
  return loginRateLimit.limit(loginRateLimitIdentifier(ipAddress, slug));
}

export function challengeKey(challengeId: string): string {
  return `${CHALLENGE_KEY_PREFIX}${challengeId}`;
}

export async function storeChallenge(challengeId: string, record: ChallengeRecord): Promise<void> {
  await redis.set(challengeKey(challengeId), JSON.stringify(record), {
    ex: CHALLENGE_TTL_SECONDS,
  });
}

export async function getChallenge(challengeId: string): Promise<ChallengeRecord | null> {
  const raw = await redis.get<string>(challengeKey(challengeId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ChallengeRecord>;
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
  } catch {
    return null;
  }
}

export async function consumeChallenge(challengeId: string): Promise<ChallengeRecord | null> {
  const raw = await redis.getdel<string>(challengeKey(challengeId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ChallengeRecord>;
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
  } catch {
    return null;
  }
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  await redis.del(challengeKey(challengeId));
}
