import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { requireSession, touchSession } from "@/lib/session";
import { deleteFolderParamsSchema } from "@/lib/validators";
import { FolderModel } from "@/models/Folder";
import { NoteModel } from "@/models/Note";

interface DeleteFolderRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: NextRequest, context: DeleteFolderRouteContext) {
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

    await connectToDatabase();

    const deletedFolder = await FolderModel.findOneAndDelete({
      _id: parsedParams.data.id,
      userId: session.userId,
    }).lean();

    if (!deletedFolder) {
      return errorResponse(404, "Request failed.");
    }

    const deletedNotes = await NoteModel.deleteMany({
      userId: session.userId,
      folderId: parsedParams.data.id,
    });

    await touchSession(session);

    return successResponse({
      deletedFolderId: parsedParams.data.id,
      deletedNotesCount: deletedNotes.deletedCount ?? 0,
    });
  } catch (error: unknown) {
    logServerError("api/folders/[id]/delete", error);
    return errorResponse(500, "Request failed.");
  }
}
