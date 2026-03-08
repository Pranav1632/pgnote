import { errorResponse, successResponse } from "@/lib/http";
import { requireSession } from "@/lib/session";

export async function POST() {
  try {
    const session = await requireSession();
    if (!session) {
      return errorResponse(401, "Unauthorized.");
    }

    session.lastActivityAt = Date.now();
    await session.save();

    return successResponse({
      lastActivityAt: session.lastActivityAt,
      timeoutMinutes: session.timeoutMinutes,
    });
  } catch {
    return errorResponse(500, "Request failed.");
  }
}
