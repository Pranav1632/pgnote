import type { SessionOptions } from "iron-session";
import { env } from "@/lib/env";

export interface AppSessionData {
  userId: string;
  slug: string;
  isLoggedIn: boolean;
  loginAt: number;
  timeoutMinutes: number;
  lastActivityAt: number;
}

export const SESSION_COOKIE_NAME = "pgnote_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24;

export const sessionOptions: SessionOptions = {
  cookieName: SESSION_COOKIE_NAME,
  password: env.SESSION_SECRET,
  ttl: SESSION_TTL_SECONDS,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  },
};

export function isValidSessionShape(value: unknown): value is AppSessionData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AppSessionData>;
  return (
    typeof candidate.userId === "string" &&
    candidate.userId.length > 0 &&
    typeof candidate.slug === "string" &&
    candidate.slug.length > 0 &&
    typeof candidate.isLoggedIn === "boolean" &&
    typeof candidate.loginAt === "number" &&
    Number.isFinite(candidate.loginAt) &&
    typeof candidate.timeoutMinutes === "number" &&
    Number.isFinite(candidate.timeoutMinutes) &&
    candidate.timeoutMinutes > 0 &&
    typeof candidate.lastActivityAt === "number" &&
    Number.isFinite(candidate.lastActivityAt)
  );
}

export function isSessionExpired(
  session: Pick<AppSessionData, "loginAt" | "timeoutMinutes">,
  now = Date.now()
): boolean {
  const timeoutMs = session.timeoutMinutes * 60_000;
  return session.loginAt + timeoutMs <= now;
}
