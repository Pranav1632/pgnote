import { unsealData } from "iron-session";
import { NextRequest, NextResponse } from "next/server";
import {
  isSessionExpired,
  isValidSessionShape,
  sessionOptions,
} from "@/lib/session-options";

function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(sessionOptions.cookieName, "", {
    ...sessionOptions.cookieOptions,
    maxAge: 0,
  });
}

function redirectToHome(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/", request.url));
  clearSessionCookie(response);
  return response;
}

function extractSlugFromNotesPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const [slug, notesSegment] = segments;
  if (!slug || notesSegment !== "notes") {
    return null;
  }

  // Prevent matching API routes like /api/notes, which would otherwise
  // look like a slug-notes path and incorrectly clear valid sessions.
  if (slug === "api" || slug.startsWith("_next")) {
    return null;
  }

  return slug.toLowerCase();
}

export async function proxy(request: NextRequest) {
  const pathSlug = extractSlugFromNotesPath(request.nextUrl.pathname);
  if (!pathSlug) {
    return NextResponse.next();
  }

  const sealedSession = request.cookies.get(sessionOptions.cookieName)?.value;
  if (!sealedSession) {
    return redirectToHome(request);
  }

  try {
    const parsedSession = await unsealData<unknown>(sealedSession, {
      password: sessionOptions.password,
      ttl: sessionOptions.ttl,
    });

    if (!isValidSessionShape(parsedSession)) {
      return redirectToHome(request);
    }

    if (!parsedSession.isLoggedIn) {
      return redirectToHome(request);
    }

    if (parsedSession.slug.toLowerCase() !== pathSlug) {
      return redirectToHome(request);
    }

    if (isSessionExpired(parsedSession)) {
      return redirectToHome(request);
    }

    return NextResponse.next();
  } catch {
    return redirectToHome(request);
  }
}

export const config = {
  matcher: ["/:slug/notes/:path*"],
};
