import { describe, expect, it } from "vitest";
import { createNoteSearchIndex, queryNotes, type SearchableNote } from "@/lib/search";

describe("Orama Note Search Engine", () => {
  const sampleNotes: SearchableNote[] = [
    {
      id: "note-1",
      folderId: "folder-1",
      folderName: "Work",
      title: "Quarterly Roadmap Review",
      content: "Discuss Next.js migration, MongoDB indexes, and search engine integration.",
    },
    {
      id: "note-2",
      folderId: "folder-1",
      folderName: "Work",
      title: "Incident Post-Mortem",
      content: "Investigating 500 error caused by compound sparse index duplicate keys.",
    },
    {
      id: "note-3",
      folderId: "folder-2",
      folderName: "Personal",
      title: "Gym Workout Plan",
      content: "Push Pull Legs split with progressive overload and rest days.",
    },
  ];

  it("indexes and finds notes by title", async () => {
    const db = await createNoteSearchIndex(sampleNotes);
    const results = await queryNotes(db, "Roadmap");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("note-1");
  });

  it("finds notes by content body", async () => {
    const db = await createNoteSearchIndex(sampleNotes);
    const results = await queryNotes(db, "progressive");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("note-3");
  });

  it("handles typo tolerance correctly", async () => {
    const db = await createNoteSearchIndex(sampleNotes);
    // Typo: "migraton" instead of "migration"
    const results = await queryNotes(db, "migraton");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("note-1");
  });

  it("returns empty array for empty search term", async () => {
    const db = await createNoteSearchIndex(sampleNotes);
    const results = await queryNotes(db, "   ");
    expect(results).toEqual([]);
  });
});
