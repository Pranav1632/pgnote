import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/http";
import { requireSession, touchSession } from "@/lib/session";
import {
  createNoteRequestSchema,
  listNotesQuerySchema,
  updateNoteRequestSchema,
} from "@/lib/validators";
import { FolderModel } from "@/models/Folder";
import { NoteModel } from "@/models/Note";

function toNoteDTO(note: {
  _id: unknown;
  folderId: unknown;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: String(note._id),
    folderId: String(note.folderId),
    content: note.content,
    createdAt: new Date(note.createdAt).toISOString(),
    updatedAt: new Date(note.updatedAt).toISOString(),
  };
}

export async function GET(request: NextRequest) {
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

    await connectToDatabase();
    const filter: { userId: string; folderId?: string } = {
      userId: session.userId,
    };
    if (query.data.folderId) {
      filter.folderId = query.data.folderId;
    }

    const notes = await NoteModel.find(filter).sort({ updatedAt: -1 }).lean();
    const typedNotes = notes as Array<{
      _id: unknown;
      folderId: unknown;
      content: string;
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
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
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

    const parsed = createNoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid request.");
    }

    await connectToDatabase();

    const folderExists = await FolderModel.exists({
      _id: parsed.data.folderId,
      userId: session.userId,
    });
    if (!folderExists) {
      return errorResponse(404, "Request failed.");
    }

    const createdNote = await NoteModel.create({
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
          createdAt: createdNote.createdAt,
          updatedAt: createdNote.updatedAt,
        }),
      },
      201
    );
  } catch {
    return errorResponse(500, "Request failed.");
  }
}

export async function PATCH(request: NextRequest) {
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

    await connectToDatabase();

    if (parsed.data.folderId) {
      const folderExists = await FolderModel.exists({
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

    const updatedNote = await NoteModel.findOneAndUpdate(
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
        createdAt: updatedNote.createdAt,
        updatedAt: updatedNote.updatedAt,
      }),
    });
  } catch {
    return errorResponse(500, "Request failed.");
  }
}
