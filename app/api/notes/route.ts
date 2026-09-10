import { NextRequest } from "next/server";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { errorResponse, successResponse } from "@/lib/http";
import { getNoteStorageContextForUser, resolveNoteStorageFailure } from "@/lib/note-storage";
import { requireSession, touchSession } from "@/lib/session";
import {
  createNoteRequestSchema,
  listNotesQuerySchema,
  updateNoteRequestSchema,
} from "@/lib/validators";

function toNoteDTO(note: {
  _id: unknown;
  folderId: unknown;
  content: string;
  isPublic?: boolean;
  shareToken?: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: String(note._id),
    folderId: String(note.folderId),
    content: note.content,
    isPublic: note.isPublic ?? false,
    shareToken: note.shareToken,
    createdAt: new Date(note.createdAt).toISOString(),
    updatedAt: new Date(note.updatedAt).toISOString(),
  };
}

export async function GET(request: NextRequest) {
  let usingCustomDatabase = false;

  try {
    const session = await requireSession();
    if (!session) {
      return errorResponse(401, "Unauthorized.");
    }

    const query = listNotesQuerySchema.safeParse({
      folderId: request.nextUrl.searchParams.get("folderId") ?? undefined,
    });

    if (!query.success) {
      return errorResponse(400, "Invalid request.");
    }

    const noteStorage = await getNoteStorageContextForUser(session.userId);
    usingCustomDatabase = noteStorage.usingCustomDatabase;
    const { noteModel } = noteStorage;
    const filter: { userId: string; folderId?: string } = {
      userId: session.userId,
    };
    if (query.data.folderId) {
      filter.folderId = query.data.folderId;
    }

    const notes = await noteModel.find(filter).sort({ updatedAt: -1 }).lean();
    const typedNotes = notes as Array<{
      _id: unknown;
      folderId: unknown;
      content: string;
      isPublic?: boolean;
      shareToken?: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
    await touchSession(session);

    return successResponse({
      notes: typedNotes.map((note) =>
        toNoteDTO({
          _id: note._id,
          folderId: note.folderId,
          content: note.content,
          isPublic: note.isPublic,
          shareToken: note.shareToken,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
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

    logServerError("api/notes/get", error);
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

    const parsed = createNoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid request.");
    }

    const noteStorage = await getNoteStorageContextForUser(session.userId);
    usingCustomDatabase = noteStorage.usingCustomDatabase;
    const { folderModel, noteModel } = noteStorage;

    const folderExists = await folderModel.exists({
      _id: parsed.data.folderId,
      userId: session.userId,
    });
    if (!folderExists) {
      return errorResponse(404, "Request failed.");
    }

    const createdNote = await noteModel.create({
      userId: session.userId,
      folderId: parsed.data.folderId,
      content: parsed.data.content,
    });

    await touchSession(session);

    return successResponse(
      {
        note: toNoteDTO({
          _id: createdNote._id,
          folderId: createdNote.folderId,
          content: createdNote.content,
          isPublic: createdNote.isPublic,
          shareToken: createdNote.shareToken,
          createdAt: createdNote.createdAt,
          updatedAt: createdNote.updatedAt,
        }),
      },
      201
    );
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

    logServerError("api/notes/post", error);
    return errorResponse(500, "Request failed.");
  }
}

export async function PATCH(request: NextRequest) {
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

    const parsed = updateNoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid request.");
    }

    const noteStorage = await getNoteStorageContextForUser(session.userId);
    usingCustomDatabase = noteStorage.usingCustomDatabase;
    const { folderModel, noteModel } = noteStorage;

    if (parsed.data.folderId) {
      const folderExists = await folderModel.exists({
        _id: parsed.data.folderId,
        userId: session.userId,
      });
      if (!folderExists) {
        return errorResponse(404, "Request failed.");
      }
    }

    const updateData: { content: string; folderId?: string } = {
      content: parsed.data.content,
    };
    if (parsed.data.folderId) {
      updateData.folderId = parsed.data.folderId;
    }

    const updatedNote = await noteModel.findOneAndUpdate(
      {
        _id: parsed.data.noteId,
        userId: session.userId,
      },
      {
        $set: updateData,
      },
      {
        new: true,
      }
    ).lean();

    if (!updatedNote) {
      return errorResponse(404, "Request failed.");
    }

    await touchSession(session);

    return successResponse({
      note: toNoteDTO({
        _id: updatedNote._id,
        folderId: updatedNote.folderId,
        content: updatedNote.content,
        isPublic: updatedNote.isPublic,
        shareToken: updatedNote.shareToken,
        createdAt: updatedNote.createdAt,
        updatedAt: updatedNote.updatedAt,
      }),
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

    logServerError("api/notes/patch", error);
    return errorResponse(500, "Request failed.");
  }
}
