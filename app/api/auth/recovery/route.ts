import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { logServerError } from "@/lib/error-utils";
import { getClientIp, successResponse } from "@/lib/http";
import { sendRecoveryAlgoEmail } from "@/lib/mailer";
import {
  checkRecoveryRateLimit,
  getRecoverySendCooldownSeconds,
  markRecoverySent,
} from "@/lib/redis";
import { recoveryRequestSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

const GENERIC_MESSAGE =
  "If a recovery email is registered for this slug, we will email your algorithm recovery instructions.";

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

    if (!user || typeof user.recoveryEmail !== "string" || user.recoveryEmail.length === 0) {
      return genericRecoveryResponse();
    }

    const cooldownSeconds = await getRecoverySendCooldownSeconds(user.slug);
    if (cooldownSeconds > 0) {
      return successResponse({
        message: `Recovery email already sent. Try again in ${Math.ceil(cooldownSeconds / 60)} minute${cooldownSeconds > 60 ? "s" : ""}.`,
        cooldownSeconds,
        sent: true,
      });
    }

    await sendRecoveryAlgoEmail({
      to: user.recoveryEmail,
      slug: user.slug,
      algo: user.algo,
    });

    await markRecoverySent(user.slug);

    return successResponse({
      message: "Recovery email sent to the address registered for this slug.",
      cooldownSeconds: 300,
      sent: true,
    });
  } catch (error: unknown) {
    logServerError("api/auth/recovery", error, {
      requestBodyType: typeof body,
    });
    return genericRecoveryResponse();
  }
}
