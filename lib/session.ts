import "server-only";

import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import {
  type AppSessionData,
  isSessionExpired,
  isValidSessionShape,
  sessionOptions,
} from "@/lib/session-options";

export async function getSession(): Promise<IronSession<AppSessionData>> {
  const cookieStore = await cookies();
  return getIronSession<AppSessionData>(cookieStore, sessionOptions);
}

export function buildSessionData(input: {
  userId: string;
  slug: string;
  timeoutMinutes: number;
}): AppSessionData {
  const now = Date.now();
  return {
    userId: input.userId,
    slug: input.slug,
    isLoggedIn: true,
    loginAt: now,
    timeoutMinutes: input.timeoutMinutes,
    lastActivityAt: now,
  };
}

export async function requireValidSession(expectedSlug?: string): Promise<AppSessionData | null> {
  const session = await getSession();

  if (!isValidSessionShape(session)) {
    return null;
  }

  if (!session.isLoggedIn) {
    return null;
  }

  if (expectedSlug && session.slug !== expectedSlug) {
    return null;
  }

  if (isSessionExpired(session)) {
    session.destroy();
    return null;
  }

  return session;
}
