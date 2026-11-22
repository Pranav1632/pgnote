import { describe, expect, it } from "vitest";
import {
  formatNoteMarkdown,
  generateVaultZip,
  sanitizeFilename,
  VaultFolder,
  VaultNote,
} from "@/lib/vault-export";

describe("Vault Export & Backup", () => {
  it("sanitizes dangerous filename characters", () => {
    expect(sanitizeFilename("my:invalid/file\\name?*")).toBe(
      "my-invalid-file-name-"
    );
    expect(sanitizeFilename("   ")).toBe("untitled");
    expect(sanitizeFilename("Normal Title")).toBe("Normal Title");
  });

  it("formats note with YAML frontmatter and markdown body", () => {
    const note: VaultNote = {
      _id: "note1",
      title: "Architecture Plan",
      content: "# Heading\nSome content here",
      createdAt: "2026-11-20T10:00:00.000Z",
    };
    const md = formatNoteMarkdown(note);
    expect(md).toContain('title: "Architecture Plan"');
    expect(md).toContain('created: "2026-11-20T10:00:00.000Z"');
    expect(md).toContain("# Heading\nSome content here");
  });

  it("builds a multi-folder zip archive with collision handling", async () => {
    const folders: VaultFolder[] = [
      { _id: "f1", name: "Work Projects" },
      { _id: "f2", name: "Personal" },
    ];

    const notes: VaultNote[] = [
      {
        _id: "n1",
        title: "Sprint Review",
        content: "Completed tickets",
        folderId: "f1",
      },
      {
        _id: "n2",
        title: "Sprint Review", // duplicate title in same folder
        content: "Second review draft",
        folderId: "f1",
      },
      {
        _id: "n3",
        title: "Groceries",
        content: "Milk, eggs, coffee",
        folderId: "f2",
      },
      {
        _id: "n4",
        title: "Quick Thought",
        content: "No folder assigned",
        folderId: null, // should go to Inbox
      },
    ];

    const { zip, filename } = await generateVaultZip(notes, folders, "pranav");

    expect(filename).toMatch(/^pgnote-vault-pranav-\d{4}-\d{2}-\d{2}\.zip$/);

    const rootFolder = Object.keys(zip.files).find((k) =>
      k.startsWith("pgnote-vault-pranav-")
    );
    expect(rootFolder).toBeDefined();

    // Check files inside the zip
    const fileKeys = Object.keys(zip.files);
    const hasWorkFolder = fileKeys.some((k) => k.includes("Work Projects/"));
    const hasPersonalFolder = fileKeys.some((k) => k.includes("Personal/"));
    const hasInboxFolder = fileKeys.some((k) => k.includes("Inbox/"));
    const hasReadme = fileKeys.some((k) => k.endsWith("README.md"));

    expect(hasWorkFolder).toBe(true);
    expect(hasPersonalFolder).toBe(true);
    expect(hasInboxFolder).toBe(true);
    expect(hasReadme).toBe(true);

    // Collision check: both Sprint Review.md and Sprint Review-1.md should exist
    const sprintReviews = fileKeys.filter(
      (k) => k.includes("Sprint Review.md") || k.includes("Sprint Review-1.md")
    );
    expect(sprintReviews.length).toBe(2);
  });
});
