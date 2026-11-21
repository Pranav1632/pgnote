import { NextRequest } from "next/server";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { getNoteStorageContextForUser, resolveNoteStorageFailure } from "@/lib/note-storage";
import { requireSession, touchSession } from "@/lib/session";
import { deleteFolderParamsSchema, updateFolderRequestSchema } from "@/lib/validators";

interface FolderRouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface MongoDuplicateKeyError extends Error {
  code?: number;
}

function toFolderDTO(folder: {
  _id: unknown;
  name: string;
  isPinned?: boolean;
  createdAt: Date;
}) {
  return {
    id: String(folder._id),
    name: folder.name,
    isPinned: Boolean(folder.isPinned),
    createdAt: new Date(folder.createdAt).toISOString(),
  };
}

export async function PATCH(request: NextRequest, context: FolderRouteContext) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request.");
    }

    const parsedBody = updateFolderRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(400, "Invalid request.");
    }

    if (parsedBody.data.isPinned === undefined && parsedBody.data.name === undefined) {
      return errorResponse(400, "Invalid request.");
    }

    const noteStorage = await getNoteStorageContextForUser(session.userId);
    usingCustomDatabase = noteStorage.usingCustomDatabase;
    const { folderModel } = noteStorage;

    const updateFields: { isPinned?: boolean; name?: string } = {};
    if (parsedBody.data.isPinned !== undefined) {
      updateFields.isPinned = parsedBody.data.isPinned;
    }
    if (parsedBody.data.name !== undefined) {
      updateFields.name = parsedBody.data.name;
    }

    const updatedFolder = await folderModel
      .findOneAndUpdate(
        {
          _id: parsedParams.data.id,
          userId: session.userId,
        },
        {
          $set: updateFields,
        },
        {
          new: true,
        }
      )
      .lean();

    if (!updatedFolder) {
      return errorResponse(404, "Request failed.");
    }

    const typedFolder = updatedFolder as {
      _id: unknown;
      name: string;
      isPinned?: boolean;
      createdAt: Date;
    };

    await touchSession(session);

    return successResponse({
      folder: toFolderDTO(typedFolder),
    });
  } catch (error: unknown) {
    const storageFailure = resolveNoteStorageFailure(error);
    if (storageFailure) {
      return errorResponse(storageFailure.status, storageFailure.message, storageFailure.code);
    }

    if ((error as MongoDuplicateKeyError).code === 11000) {
      return errorResponse(409, "Folder already exists.");
    }

    if (usingCustomDatabase) {
      return errorResponse(
        503,
        "Your custom MongoDB database is unavailable. Notes and folders stay in your database only, so pgnote cannot load or save them until that connection works again.",
        inferInfraErrorCode(error, "CUSTOM_MONGO_REQUEST_FAILED")
      );
    }

    logServerError("api/folders/[id]/patch", error);
    return errorResponse(500, "Request failed.");
  }
}

export async function DELETE(_request: NextRequest, context: FolderRouteContext) {
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
