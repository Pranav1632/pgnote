import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { buildSessionData, getSession } from "@/lib/session";
import { errorResponse, successResponse } from "@/lib/http";
import { signupRequestSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

interface MongoDuplicateKeyError extends Error {
  code?: number;
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request.");
    }

    const parsed = signupRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid request.");
    }

    await connectToDatabase();

    const existingUser = await UserModel.exists({ slug: parsed.data.slug });
    if (existingUser) {
      return errorResponse(409, "Unable to create account.");
    }

    const createdUser = await UserModel.create({
      slug: parsed.data.slug,
      algo: parsed.data.algo,
      sessionTimeout: parsed.data.sessionTimeout,
      recoveryEmail: parsed.data.recoveryEmail,
      lastLogin: new Date(),
    });

    const session = await getSession();
    const sessionData = buildSessionData({
      userId: String(createdUser._id),
      slug: createdUser.slug,
      timeoutMinutes: createdUser.sessionTimeout,
    });

    session.userId = sessionData.userId;
    session.slug = sessionData.slug;
    session.isLoggedIn = sessionData.isLoggedIn;
    session.loginAt = sessionData.loginAt;
    session.timeoutMinutes = sessionData.timeoutMinutes;
    session.lastActivityAt = sessionData.lastActivityAt;
    await session.save();

    return successResponse(
      {
        slug: createdUser.slug,
        redirectTo: `/${createdUser.slug}/notes`,
      },
      201
    );
  } catch (error: unknown) {
    if ((error as MongoDuplicateKeyError).code === 11000) {
      return errorResponse(409, "Unable to create account.");
    }

    return errorResponse(500, "Unable to create account.");
  }
}
