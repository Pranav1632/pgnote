import { NextRequest } from "next/server";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { getNoteStorageContextForUser, resolveNoteStorageFailure } from "@/lib/note-storage";
import { requireSession, touchSession } from "@/lib/session";
import { deleteFolderParamsSchema } from "@/lib/validators";

interface DeleteFolderRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: NextRequest, context: DeleteFolderRouteContext) {
  let usingCustomDatabase = false;

  try {
    const session = await requireSession();
    if (!session) {
      return errorResponse(401, "Unauthorized.");
    }

    const routeParams = await context.params;
    const parsedParams = deleteFolderParamsSchema.safeParse(routeParams);
    if (!parsedParams.success) {
      return errorResponse(400, "Invalid request.");
    }

    const noteStorage = await getNoteStorageContextForUser(session.userId);
    usingCustomDatabase = noteStorage.usingCustomDatabase;
    const { folderModel, noteModel } = noteStorage;

    const deletedFolder = await folderModel.findOneAndDelete({
      _id: parsedParams.data.id,
      userId: session.userId,
    }).lean();

    if (!deletedFolder) {
      return errorResponse(404, "Request failed.");
    }

    const deletedNotes = await noteModel.deleteMany({
      userId: session.userId,
      folderId: parsedParams.data.id,
    });

    await touchSession(session);

    return successResponse({
      deletedFolderId: parsedParams.data.id,
      deletedNotesCount: deletedNotes.deletedCount ?? 0,
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

    logServerError("api/folders/[id]/delete", error);
    return errorResponse(500, "Request failed.");
  }
}
