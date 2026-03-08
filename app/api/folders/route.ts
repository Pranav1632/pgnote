import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/http";
import { requireSession, touchSession } from "@/lib/session";
import { createFolderRequestSchema } from "@/lib/validators";
import { FolderModel } from "@/models/Folder";

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
  try {
    const session = await requireSession();
    if (!session) {
      return errorResponse(401, "Unauthorized.");
    }

    await connectToDatabase();
    let folders = await FolderModel.find({ userId: session.userId })
      .sort({ createdAt: 1 })
      .lean();

    if (folders.length === 0) {
      try {
        await FolderModel.updateOne(
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

      folders = await FolderModel.find({ userId: session.userId })
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
  } catch {
    return errorResponse(500, "Request failed.");
  }
}

export async function POST(request: NextRequest) {
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

    await connectToDatabase();
    const createdFolder = await FolderModel.create({
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
    if ((error as MongoDuplicateKeyError).code === 11000) {
      return errorResponse(409, "Folder already exists.");
    }

    return errorResponse(500, "Request failed.");
  }
}
