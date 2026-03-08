import { getSession } from "@/lib/session";
import { errorResponse, successResponse } from "@/lib/http";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();

    return successResponse({
      loggedOut: true,
    });
  } catch {
    return errorResponse(500, "Request failed.");
  }
}
