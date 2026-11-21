import { describe, expect, it } from "vitest";
import {
  createFolderRequestSchema,
  createNoteRequestSchema,
  slugSchema,
  updateFolderRequestSchema,
  updateNoteRequestSchema,
} from "@/lib/validators";

describe("Validation Schemas", () => {
  it("validates valid and invalid user slugs", () => {
    expect(slugSchema.safeParse("pranav").success).toBe(true);
    expect(slugSchema.safeParse("user_123").success).toBe(true);
    expect(slugSchema.safeParse("u").success).toBe(false); // too short
    expect(slugSchema.safeParse("invalid space").success).toBe(false);
  });

  it("validates create and update folder payloads", () => {
    expect(createFolderRequestSchema.safeParse({ name: "Work" }).success).toBe(true);
    expect(createFolderRequestSchema.safeParse({ name: "" }).success).toBe(false);

    expect(
      updateFolderRequestSchema.safeParse({ name: "Renamed", isPinned: true }).success
    ).toBe(true);
    expect(updateFolderRequestSchema.safeParse({ isPinned: false }).success).toBe(true);
  });

  it("validates note creation with character boundaries", () => {
    const validObjectId = "69b19a3d2ec8dd1c1173878b";
    expect(
      createNoteRequestSchema.safeParse({
        folderId: validObjectId,
        content: "Hello World",
      }).success
    ).toBe(true);

    // Empty content fails
    expect(
      createNoteRequestSchema.safeParse({
        folderId: validObjectId,
        content: "",
      }).success
    ).toBe(false);

    // Large content (e.g. 35k chars) succeeds within 200k limit
    expect(
      createNoteRequestSchema.safeParse({
        folderId: validObjectId,
        content: "A".repeat(35000),
      }).success
    ).toBe(true);
  });

  it("validates note update payload", () => {
    const validObjectId = "69b19a3d2ec8dd1c1173878b";
    expect(
      updateNoteRequestSchema.safeParse({
        noteId: validObjectId,
        folderId: validObjectId,
        content: "Updated note text",
      }).success
    ).toBe(true);
  });
});
