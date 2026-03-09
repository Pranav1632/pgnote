import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { requireSession, touchSession } from "@/lib/session";
import { deleteNoteParamsSchema } from "@/lib/validators";
import { NoteModel } from "@/models/Note";

interface DeleteNoteRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: NextRequest, context: DeleteNoteRouteContext) {
  try {
    const session = await requireSession();
    if (!session) {
      return errorResponse(401, "Unauthorized.");
    }

    const routeParams = await context.params;
    const parsedParams = deleteNoteParamsSchema.safeParse(routeParams);
    if (!parsedParams.success) {
      return errorResponse(400, "Invalid request.");
    }

    await connectToDatabase();

    const deletedNote = await NoteModel.findOneAndDelete({
      _id: parsedParams.data.id,
      userId: session.userId,
    }).lean();

    if (!deletedNote) {
      return errorResponse(404, "Request failed.");
    }

    await touchSession(session);

    return successResponse({
      deletedNoteId: parsedParams.data.id,
    });
  } catch (error: unknown) {
    logServerError("api/notes/[id]/delete", error);
    return errorResponse(500, "Request failed.");
  }
}
