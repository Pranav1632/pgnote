import { NextRequest } from "next/server";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { getNoteStorageContextForUser, resolveNoteStorageFailure } from "@/lib/note-storage";
import { requireSession, touchSession } from "@/lib/session";
import { createFolderRequestSchema } from "@/lib/validators";

interface MongoDuplicateKeyError extends Error {
  code?: number;
}

const DEFAULT_FOLDER_NAME = "Inbox";

function toFolderDTO(folder: {
  _id: unknown;
  name: string;
  createdAt: Date;
}) {
  return {
    id: String(folder._id),
    name: folder.name,
    createdAt: new Date(folder.createdAt).toISOString(),
  };
}

export async function GET() {
  let usingCustomDatabase = false;

  try {
    const session = await requireSession();
    if (!session) {
      return errorResponse(401, "Unauthorized.");
    }

    const noteStorage = await getNoteStorageContextForUser(session.userId);
    usingCustomDatabase = noteStorage.usingCustomDatabase;
    const { folderModel } = noteStorage;
    let folders = await folderModel.find({ userId: session.userId })
      .sort({ createdAt: 1 })
      .lean();

    if (folders.length === 0) {
      try {
        await folderModel.updateOne(
          { userId: session.userId, name: DEFAULT_FOLDER_NAME },
          {
            $setOnInsert: {
              userId: session.userId,
              name: DEFAULT_FOLDER_NAME,
            },
          },
          { upsert: true }
        );
      } catch (error: unknown) {
        if ((error as MongoDuplicateKeyError).code !== 11000) {
          throw error;
        }
      }

      folders = await folderModel.find({ userId: session.userId })
        .sort({ createdAt: 1 })
        .lean();
    }

    const typedFolders = folders as Array<{
      _id: unknown;
      name: string;
      createdAt: Date;
    }>;

    await touchSession(session);

    return successResponse({
      folders: typedFolders.map((folder) =>
        toFolderDTO({
          _id: folder._id,
          name: folder.name,
          createdAt: folder.createdAt,
        })
      ),
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

    logServerError("api/folders/get", error);
    return errorResponse(500, "Request failed.");
  }
}

export async function POST(request: NextRequest) {
  let usingCustomDatabase = false;

  try {
    const session = await requireSession();
    if (!session) {
      return errorResponse(401, "Unauthorized.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "Invalid request.");
    }

    const parsed = createFolderRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid request.");
    }

    const noteStorage = await getNoteStorageContextForUser(session.userId);
    usingCustomDatabase = noteStorage.usingCustomDatabase;
    const { folderModel } = noteStorage;
    const createdFolder = await folderModel.create({
      userId: session.userId,
      name: parsed.data.name,
    });

    await touchSession(session);

    return successResponse(
      {
        folder: toFolderDTO({
          _id: createdFolder._id,
          name: createdFolder.name,
          createdAt: createdFolder.createdAt,
        }),
      },
      201
    );
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

    logServerError("api/folders/post", error);
    return errorResponse(500, "Request failed.");
  }
}
