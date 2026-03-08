import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
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
      return errorResponse(409, "Unable to create account.", "SLUG_ALREADY_EXISTS");
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
    if ((error as MongoDuplicateKeyError).code === 11000) {
      return errorResponse(409, "Unable to create account.", "SLUG_ALREADY_EXISTS");
    }

    const errorCode = inferInfraErrorCode(error, "SIGNUP_FAILED");
    logServerError("api/auth/signup", error, { errorCode });

    return errorResponse(500, "Unable to create account.", errorCode);
  }
}
