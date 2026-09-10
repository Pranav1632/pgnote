import { customAlphabet } from "nanoid";
import { NextRequest } from "next/server";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { getNoteStorageContextForUser, resolveNoteStorageFailure } from "@/lib/note-storage";
import { requireSession, touchSession } from "@/lib/session";
import { deleteNoteParamsSchema } from "@/lib/validators";
import { NoteModel } from "@/models/Note";

interface ShareNoteRouteContext {
  params: Promise<{
    id: string;
  }>;
}

const createShareToken = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 18);
const TOKEN_GENERATION_ATTEMPTS = 5;
type NoteStorageModel = typeof NoteModel;

type LeanShareNote = {
  shareToken?: string;
  isPublic?: boolean;
};

function hasShareToken(note: LeanShareNote | null): note is LeanShareNote & { shareToken: string } {
  return typeof note?.shareToken === "string" && note.shareToken.length > 0;
}

async function getExistingShareToken(
  noteModel: NoteStorageModel,
  userId: string,
  noteId: string
): Promise<string | null> {
  const existingNote = await noteModel
    .findOne({
      _id: noteId,
      userId,
    })
    .select("shareToken isPublic")
    .lean();

  if (!existingNote) {
    return null;
  }

  if (hasShareToken(existingNote)) {
    if (!existingNote.isPublic) {
      await noteModel.updateOne(
        {
          _id: noteId,
          userId,
        },
        {
          $set: {
            isPublic: true,
          },
        }
      );
    }
    return existingNote.shareToken;
  }

  return "";
}

async function ensureShareToken(
  noteModel: NoteStorageModel,
  userId: string,
  noteId: string
): Promise<string | null> {
  const existingToken = await getExistingShareToken(noteModel, userId, noteId);
  if (existingToken === null) {
    return null;
  }
  if (existingToken.length > 0) {
    return existingToken;
  }

  const shareTokenMissingFilter = {
    $or: [{ shareToken: { $exists: false } }, { shareToken: null }, { shareToken: "" }],
  };

  for (let attempt = 0; attempt < TOKEN_GENERATION_ATTEMPTS; attempt += 1) {
    const nextToken = createShareToken();
    try {
      const updatedNote = await noteModel
        .findOneAndUpdate(
          {
            _id: noteId,
            userId,
            ...shareTokenMissingFilter,
          },
          {
            $set: {
              shareToken: nextToken,
              isPublic: true,
            },
          },
          {
            new: true,
          }
        )
        .lean();

      if (hasShareToken(updatedNote)) {
        return updatedNote.shareToken;
      }

      const tokenAfterRace = await getExistingShareToken(noteModel, userId, noteId);
      if (tokenAfterRace === null) {
        return null;
      }
      if (tokenAfterRace.length > 0) {
        return tokenAfterRace;
      }
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to generate share token.");
}

export async function POST(_request: NextRequest, context: ShareNoteRouteContext) {
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

    const shareToken = await ensureShareToken(noteModel, session.userId, parsedParams.data.id);
    if (!shareToken) {
      return errorResponse(404, "Request failed.");
    }

    await touchSession(session);

    const shareId = `${session.slug}.${shareToken}`;

    return successResponse({
      shareId,
      sharePath: `/public/${shareId}`,
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

    logServerError("api/notes/[id]/share/post", error);
    return errorResponse(500, "Request failed.");
  }
}
