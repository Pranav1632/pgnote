import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { verifyMongoUriConnectivity } from "@/lib/mongo-uri";
import { requireSession } from "@/lib/session";
import { updateProfileRequestSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";
import type { UserProfileDTO } from "@/types";

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) {
      return errorResponse(401, "Unauthorized.", "SESSION_REQUIRED");
    }

    await connectToDatabase();
    const user = await UserModel.findById(session.userId).lean();
    if (!user) {
      return errorResponse(404, "User not found.", "USER_NOT_FOUND");
    }

    const profile: UserProfileDTO = {
      id: user._id.toString(),
      name: user.name ?? undefined,
      slug: user.slug,
      recoveryEmail: user.recoveryEmail,
      sessionTimeout: user.sessionTimeout,
      customMongoUri: user.customMongoUri ?? undefined,
      usingCustomDatabase: Boolean(user.customMongoUri && user.customMongoUri.trim().length > 0),
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : undefined,
      algoSummary: {
        keyLength: user.algo.keyLength,
        chunkCount: user.algo.chunks.length,
        order: user.algo.order,
      },
    };

    return successResponse(profile);
  } catch (error: unknown) {
    const errorCode = inferInfraErrorCode(error, "GET_PROFILE_FAILED");
    logServerError("api/user/profile/get", error, { errorCode });
    return errorResponse(500, "Unable to load profile.", errorCode);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) {
      return errorResponse(401, "Unauthorized.", "SESSION_REQUIRED");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid JSON payload.", "INVALID_JSON");
    }

    const parsed = updateProfileRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        400,
        parsed.error.issues[0]?.message ?? "Invalid profile data.",
        "VALIDATION_ERROR"
      );
    }

    await connectToDatabase();
    const user = await UserModel.findById(session.userId);
    if (!user) {
      return errorResponse(404, "User not found.", "USER_NOT_FOUND");
    }

    let slugChanged = false;
    let databaseChanged = false;

    // 1. Update Name
    if (parsed.data.name !== undefined) {
      user.name = parsed.data.name && parsed.data.name.trim().length > 0
        ? parsed.data.name.trim()
        : undefined;
    }

    // 2. Update Username / Slug
    if (parsed.data.slug && parsed.data.slug !== user.slug) {
      const slugCandidate = parsed.data.slug.toLowerCase().trim();
      const existingSlug = await UserModel.findOne({
        slug: slugCandidate,
        _id: { $ne: user._id },
      }).select("_id");

      if (existingSlug) {
        return errorResponse(409, "This username is already taken.", "SLUG_TAKEN");
      }

      user.slug = slugCandidate;
      session.slug = slugCandidate;
      slugChanged = true;
    }

    // 3. Update Recovery Email
    if (parsed.data.recoveryEmail && parsed.data.recoveryEmail !== user.recoveryEmail) {
      const emailCandidate = parsed.data.recoveryEmail.toLowerCase().trim();
      const existingEmail = await UserModel.findOne({
        recoveryEmail: emailCandidate,
        _id: { $ne: user._id },
      }).select("_id");

      if (existingEmail) {
        return errorResponse(409, "This recovery email is already in use.", "EMAIL_TAKEN");
      }

      user.recoveryEmail = emailCandidate;
    }

    // 4. Update Session Timeout
    if (parsed.data.sessionTimeout && parsed.data.sessionTimeout !== user.sessionTimeout) {
      user.sessionTimeout = parsed.data.sessionTimeout;
      session.timeoutMinutes = parsed.data.sessionTimeout;
    }

    // 5. Update Custom MongoDB URI
    if (parsed.data.customMongoUri !== undefined) {
      const trimmedUri =
        typeof parsed.data.customMongoUri === "string" ? parsed.data.customMongoUri.trim() : null;

      if (!trimmedUri || trimmedUri.length === 0) {
        if (user.customMongoUri) {
          databaseChanged = true;
        }
        user.customMongoUri = undefined;
      } else if (trimmedUri !== user.customMongoUri) {
        const canConnect = await verifyMongoUriConnectivity(trimmedUri);
        if (!canConnect) {
          return errorResponse(
            400,
            "Could not connect to this MongoDB URI. Please verify the credentials, database name, and network access.",
            "CUSTOM_MONGO_UNREACHABLE"
          );
        }
        user.customMongoUri = trimmedUri;
        databaseChanged = true;
      }
    }

    await user.save();
    await session.save();

    const profile: UserProfileDTO = {
      id: user._id.toString(),
      name: user.name ?? undefined,
      slug: user.slug,
      recoveryEmail: user.recoveryEmail,
      sessionTimeout: user.sessionTimeout,
      customMongoUri: user.customMongoUri ?? undefined,
      usingCustomDatabase: Boolean(user.customMongoUri && user.customMongoUri.trim().length > 0),
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : undefined,
      algoSummary: {
        keyLength: user.algo.keyLength,
        chunkCount: user.algo.chunks.length,
        order: user.algo.order,
      },
    };

    return successResponse({
      profile,
      slugChanged,
      databaseChanged,
      message: "Profile updated successfully.",
    });
  } catch (error: unknown) {
    const errorCode = inferInfraErrorCode(error, "UPDATE_PROFILE_FAILED");
    logServerError("api/user/profile/patch", error, { errorCode });
    return errorResponse(500, "Unable to update profile.", errorCode);
  }
}
