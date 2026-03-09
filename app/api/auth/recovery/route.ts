import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { logServerError } from "@/lib/error-utils";
import { getClientIp, successResponse } from "@/lib/http";
import { sendRecoveryAlgoEmail } from "@/lib/mailer";
import { checkRecoveryRateLimit } from "@/lib/redis";
import { recoveryRequestSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

const GENERIC_MESSAGE =
  "If the details match our records, we will email your algorithm recovery instructions.";

function genericRecoveryResponse() {
  return successResponse({
    message: GENERIC_MESSAGE,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    try {
      body = await request.json();
    } catch {
      return genericRecoveryResponse();
    }

    const parsed = recoveryRequestSchema.safeParse(body);
    if (!parsed.success) {
      return genericRecoveryResponse();
    }

    const ipAddress = getClientIp(request);
    const rateLimitResult = await checkRecoveryRateLimit(ipAddress);
    if (!rateLimitResult.success) {
      return genericRecoveryResponse();
    }

    await connectToDatabase();
    const user = await UserModel.findOne({ slug: parsed.data.slug })
      .select("slug recoveryEmail algo")
      .lean();

    if (!user || typeof user.recoveryEmail !== "string" || user.recoveryEmail !== parsed.data.email) {
      return genericRecoveryResponse();
    }

    await sendRecoveryAlgoEmail({
      to: parsed.data.email,
      slug: user.slug,
      algo: user.algo,
    });

    return genericRecoveryResponse();
  } catch (error: unknown) {
    logServerError("api/auth/recovery", error, {
      requestBodyType: typeof body,
    });
    return genericRecoveryResponse();
  }
}
