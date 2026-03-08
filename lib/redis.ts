import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: false,
  prefix: "pgnote:ratelimit:login",
});

export function challengeKey(slug: string): string {
  return `pgnote:challenge:${slug}`;
}

export async function storeChallenge(slug: string, rawKey: string): Promise<void> {
  await redis.set(challengeKey(slug), rawKey, { ex: 120 });
}

export async function getChallenge(slug: string): Promise<string | null> {
  return redis.get<string>(challengeKey(slug));
}

export async function deleteChallenge(slug: string): Promise<void> {
  await redis.del(challengeKey(slug));
}