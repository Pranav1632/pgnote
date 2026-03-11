import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { signupRequestSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
}

function duplicateSignupResponse(error: MongoDuplicateKeyError) {
  if (error.code !== 11000) {
    return null;
  }

  if (error.keyPattern?.recoveryEmail || "recoveryEmail" in (error.keyValue ?? {})) {
    return errorResponse(
      409,
      "Recovery email is already registered.",
      "RECOVERY_EMAIL_ALREADY_EXISTS"
    );
  }

  return errorResponse(409, "Slug is already taken.", "SLUG_ALREADY_EXISTS");
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

    const [existingSlugUser, existingRecoveryEmailUser] = await Promise.all([
      UserModel.exists({ slug: parsed.data.slug }),
      UserModel.exists({ recoveryEmail: parsed.data.recoveryEmail }),
    ]);

    if (existingSlugUser) {
      return errorResponse(409, "Slug is already taken.", "SLUG_ALREADY_EXISTS");
    }

    if (existingRecoveryEmailUser) {
      return errorResponse(
        409,
        "Recovery email is already registered.",
        "RECOVERY_EMAIL_ALREADY_EXISTS"
      );
    }

    const createdUser = await UserModel.create({
      slug: parsed.data.slug,
      algo: parsed.data.algo,
      sessionTimeout: parsed.data.sessionTimeout,
      recoveryEmail: parsed.data.recoveryEmail,
    });

    return successResponse(
      {
        slug: createdUser.slug,
        redirectTo: `/${createdUser.slug}`,
      },
      201
    );
  } catch (error: unknown) {
    const duplicateResponse = duplicateSignupResponse(error as MongoDuplicateKeyError);
    if (duplicateResponse) {
      return duplicateResponse;
    }

    const errorCode = inferInfraErrorCode(error, "SIGNUP_FAILED");
    logServerError("api/auth/signup", error, { errorCode });

    return errorResponse(500, "Unable to create account.", errorCode);
  }
}
