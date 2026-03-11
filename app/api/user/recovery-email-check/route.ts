import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { recoveryEmailCheckRequestSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request.");
    }

    const parsed = recoveryEmailCheckRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid request.");
    }

    await connectToDatabase();
    const existingUser = await UserModel.exists({ recoveryEmail: parsed.data.recoveryEmail });

    return successResponse({
      available: !Boolean(existingUser),
    });
  } catch (error: unknown) {
    const errorCode = inferInfraErrorCode(error, "RECOVERY_EMAIL_CHECK_FAILED");
    logServerError("api/user/recovery-email-check", error, { errorCode });

    return errorResponse(500, "Unable to check recovery email right now.", errorCode);
  }
}
