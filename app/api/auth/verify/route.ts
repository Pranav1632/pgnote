import { NextRequest } from "next/server";
import { buildSessionData, getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, getClientIp, successResponse } from "@/lib/http";
import {
  checkLoginRateLimit,
  deleteChallenge,
  getChallenge,
} from "@/lib/redis";
import { verifyChallengeRequestSchema } from "@/lib/validators";
import { normalizeSlug, safeEqual } from "@/lib/auth";
import { UserModel } from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request.");
    }

    const parsed = verifyChallengeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid request.");
    }

    const ipAddress = getClientIp(request);
    const limitResult = await checkLoginRateLimit(ipAddress, parsed.data.slug);
    if (!limitResult.success) {
      return errorResponse(429, "Too many attempts. Try again later.");
    }

    await connectToDatabase();
    const user = await UserModel.findOne({ slug: parsed.data.slug })
      .select("_id slug sessionTimeout")
      .lean();

    if (!user) {
      return errorResponse(401, "Invalid credentials.");
    }

    const challengeRecord = await getChallenge(parsed.data.challengeId);
    if (!challengeRecord) {
      return errorResponse(401, "Invalid credentials.");
    }

    if (normalizeSlug(challengeRecord.slug) !== normalizeSlug(parsed.data.slug)) {
      return errorResponse(401, "Invalid credentials.");
    }

    if (!safeEqual(parsed.data.responseKey, challengeRecord.rawKey)) {
      return errorResponse(401, "Invalid credentials.");
    }

    await deleteChallenge(parsed.data.challengeId);

    const session = await getSession();
    const sessionData = buildSessionData({
      userId: String(user._id),
      slug: user.slug,
      timeoutMinutes: user.sessionTimeout,
    });

    session.userId = sessionData.userId;
    session.slug = sessionData.slug;
    session.isLoggedIn = sessionData.isLoggedIn;
    session.loginAt = sessionData.loginAt;
    session.timeoutMinutes = sessionData.timeoutMinutes;
    session.lastActivityAt = sessionData.lastActivityAt;
    await session.save();

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
        },
      }
    );

    return successResponse({
      slug: user.slug,
      redirectTo: `/${user.slug}/notes`,
    });
  } catch {
    return errorResponse(500, "Request failed.");
  }
}
