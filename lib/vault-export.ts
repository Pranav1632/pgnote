import JSZip from "jszip";
import { saveAs } from "file-saver";

export interface VaultNote {
  _id: string;
  title?: string;
  content: string;
  folderId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VaultFolder {
  _id: string;
  name: string;
}

export function sanitizeFilename(name: string, fallback = "untitled"): string {
  const sanitized = (name || "")
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return sanitized || fallback;
}

export function formatNoteMarkdown(note: VaultNote): string {
  const title = (note.title || "Untitled").trim();
  const frontmatter = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    note.createdAt ? `created: "${note.createdAt}"` : null,
    note.updatedAt ? `updated: "${note.updatedAt}"` : null,
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${frontmatter}\n${note.content || ""}\n`;
}

export async function generateVaultZip(
  notes: VaultNote[],
  folders: VaultFolder[],
  slug = "notes"
): Promise<{ zip: JSZip; blob: Blob; filename: string }> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split("T")[0];
  const rootFolderName = `pgnote-vault-${sanitizeFilename(slug)}-${dateStr}`;
  const root = zip.folder(rootFolderName) || zip;

  // Folder map: folderId -> folderName
  const folderMap = new Map<string, string>();
  folders.forEach((f) => {
    folderMap.set(f._id, sanitizeFilename(f.name));
  });

  // Track filenames within each folder to prevent collisions
  const fileCounts = new Map<string, number>();

  let exportedNotesCount = 0;

  for (const note of notes) {
    const folderName =
      (note.folderId && folderMap.get(note.folderId)) || "Inbox";
    const baseTitle = sanitizeFilename(note.title || "Untitled");
    const folderZip = root.folder(folderName) || root;

    const fileKey = `${folderName}/${baseTitle.toLowerCase()}`;
    const count = fileCounts.get(fileKey) || 0;
    fileCounts.set(fileKey, count + 1);

    const filename = count === 0 ? `${baseTitle}.md` : `${baseTitle}-${count}.md`;
    const markdownContent = formatNoteMarkdown(note);

    folderZip.file(filename, markdownContent);
    exportedNotesCount++;
  }

  // Vault Index README
  const indexReadme = [
    `# PGNote Vault Export`,
    ``,
    `- **User**: \`${slug}\``,
    `- **Export Date**: ${new Date().toISOString()}`,
    `- **Total Notes**: ${exportedNotesCount}`,
    `- **Total Folders**: ${folders.length}`,
    ``,
    `## Folders`,
    ...folders.map((f) => `- **${f.name}**`),
    `- **Inbox** (default / root notes)`,
    ``,
    `---`,
    `*Generated securely with PGNote.*`,
  ].join("\n");

  root.file("README.md", indexReadme);

  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `${rootFolderName}.zip`;

  return { zip, blob, filename };
}

export async function downloadVaultZip(
  notes: VaultNote[],
  folders: VaultFolder[],
  slug = "notes"
): Promise<string> {
  const { blob, filename } = await generateVaultZip(notes, folders, slug);
  saveAs(blob, filename);
  return filename;
}
