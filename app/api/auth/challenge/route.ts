import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  createChallenge,
  createChallengeId,
  generateRawKey,
  normalizeSlug,
} from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/http";
import { storeChallenge } from "@/lib/redis";
import { challengeRequestSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request.");
    }

    const parsed = challengeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid request.");
    }

    await connectToDatabase();
    const user = await UserModel.findOne({ slug: parsed.data.slug })
      .select("slug algo")
      .lean();

    if (!user) {
      return errorResponse(401, "Invalid credentials.");
    }

    const rawKey = generateRawKey(user.algo.keyLength);
    const challenge = createChallenge(rawKey, user.algo);
    const challengeId = createChallengeId();

    await storeChallenge(challengeId, {
      slug: normalizeSlug(user.slug),
      rawKey,
      createdAt: Date.now(),
    });

    return successResponse({
      challengeId,
      challenge,
      keyLength: user.algo.keyLength,
    });
  } catch {
    return errorResponse(500, "Request failed.");
  }
}
