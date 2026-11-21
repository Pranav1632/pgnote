import { create, insert, search } from "@orama/orama";
import type { Orama } from "@orama/orama";

export interface SearchableNote {
  id: string;
  folderId: string;
  folderName: string;
  title: string;
  content: string;
}

export type NoteSearchDatabase = Orama<{
  id: "string";
  folderId: "string";
  folderName: "string";
  title: "string";
  content: "string";
}>;

export async function createNoteSearchIndex(notes: SearchableNote[]): Promise<NoteSearchDatabase> {
  const db = await create({
    schema: {
      id: "string",
      folderId: "string",
      folderName: "string",
      title: "string",
      content: "string",
    },
  });

  for (const note of notes) {
    await insert(db, {
      id: note.id,
      folderId: note.folderId,
      folderName: note.folderName,
      title: note.title,
      content: note.content,
    });
  }

  return db;
}

export async function queryNotes(
  db: NoteSearchDatabase,
  term: string,
  limit = 20
): Promise<SearchableNote[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];

  const results = await search(db, {
    term: trimmed,
    tolerance: 1, // Typo tolerance
    limit,
    boost: {
      title: 2.5,
      folderName: 1.5,
      content: 1.0,
    },
  });

  return results.hits.map((hit) => ({
    id: String(hit.document.id),
    folderId: String(hit.document.folderId),
    folderName: String(hit.document.folderName),
    title: String(hit.document.title),
    content: String(hit.document.content),
  }));
}
