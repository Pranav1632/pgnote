import { NextRequest } from "next/server";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { getNoteStorageContextForUser, resolveNoteStorageFailure } from "@/lib/note-storage";
import { requireSession, touchSession } from "@/lib/session";
import { deleteNoteParamsSchema } from "@/lib/validators";

interface DeleteNoteRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: NextRequest, context: DeleteNoteRouteContext) {
  let usingCustomDatabase = false;

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

    const noteStorage = await getNoteStorageContextForUser(session.userId);
    usingCustomDatabase = noteStorage.usingCustomDatabase;
    const { noteModel } = noteStorage;

    const deletedNote = await noteModel.findOneAndDelete({
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
    const storageFailure = resolveNoteStorageFailure(error);
    if (storageFailure) {
      return errorResponse(storageFailure.status, storageFailure.message, storageFailure.code);
    }

    if (usingCustomDatabase) {
      return errorResponse(
        503,
        "Your custom MongoDB database is unavailable. Notes and folders stay in your database only, so pgnote cannot load or save them until that connection works again.",
        inferInfraErrorCode(error, "CUSTOM_MONGO_REQUEST_FAILED")
      );
    }

    logServerError("api/notes/[id]/delete", error);
    return errorResponse(500, "Request failed.");
  }
}
