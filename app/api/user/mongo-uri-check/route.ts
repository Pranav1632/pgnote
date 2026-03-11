import { NextRequest } from "next/server";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { getMongoDatabaseName, verifyMongoUriConnectivity } from "@/lib/mongo-uri";
import { mongoUriVerifyRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request.");
    }

    const parsed = mongoUriVerifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        400,
        "Enter a valid MongoDB URI with a database name.",
        "INVALID_CUSTOM_MONGO_URI"
      );
    }

    const databaseName = getMongoDatabaseName(parsed.data.mongoUri);
    const verified = await verifyMongoUriConnectivity(parsed.data.mongoUri);

    if (!verified) {
      return successResponse({
        verified: false,
        databaseName,
        message:
          "Could not connect to this MongoDB URI. Check the database name, username/password, cluster IP allowlist, and network access.",
      });
    }

    return successResponse({
      verified: true,
      databaseName,
      message: `MongoDB URI verified. Notes and folders will use database "${databaseName}".`,
    });
  } catch (error: unknown) {
    const errorCode = inferInfraErrorCode(error, "CUSTOM_MONGO_VERIFY_FAILED");
    logServerError("api/user/mongo-uri-check", error, { errorCode });

    return errorResponse(500, "Unable to verify MongoDB URI right now.", errorCode);
  }
}
