import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/http";
import { slugCheckRequestSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request.");
    }

    const parsed = slugCheckRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid request.");
    }

    await connectToDatabase();
    const existingUser = await UserModel.exists({ slug: parsed.data.slug });

    return successResponse({
      available: !Boolean(existingUser),
    });
  } catch {
    return errorResponse(500, "Request failed.");
  }
}
