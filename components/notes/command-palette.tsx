"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Archive, Copy, Download, FileText, Folder, Plus, Search } from "lucide-react";
import { queryNotes, type NoteSearchDatabase, type SearchableNote } from "@/lib/search";
import type { FolderDTO, NoteDTO } from "@/types";

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  searchDb: NoteSearchDatabase | null;
  folders: FolderDTO[];
  activeFolderId: string | null;
  activeNote: NoteDTO | null;
  onSelectNote: (noteId: string, folderId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onCreateNewNote: () => void;
  onCreateFolderClick: () => void;
  onCopyCurrentNote: () => void;
  onExportCurrentNote: () => void;
  onExportVault?: () => void;
}

export function CommandPalette({
  isOpen,
  onOpenChange,
  searchDb,
  folders,
  activeNote,
  onSelectNote,
  onSelectFolder,
  onCreateNewNote,
  onCreateFolderClick,
  onCopyCurrentNote,
  onExportCurrentNote,
  onExportVault,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchableNote[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function executeSearch() {
      if (!searchDb || !query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const hits = await queryNotes(searchDb, query, 15);
        if (!cancelled) {
          setSearchResults(hits);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      }
    }

    void executeSearch();

    return () => {
      cancelled = true;
    };
  }, [query, searchDb]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 pt-[12vh] backdrop-blur-sm animate-in fade-in-0">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          label="Global Command Palette"
          shouldFilter={!query.trim()}
          className="flex flex-col"
        >
          <div className="flex items-center border-b border-zinc-800 px-3 py-3">
            <Search className="mr-2.5 h-4 w-4 shrink-0 text-emerald-400" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="Search all notes or type a command... (Esc to close)"
              className="w-full bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
            />
            <kbd className="hidden rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400 sm:inline">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="p-6 text-center text-xs text-zinc-500">
              No results found for &quot;{query}&quot;.
            </Command.Empty>

            {/* Note search results */}
            {searchResults.length > 0 && (
              <Command.Group
                heading="Matching Notes"
                className="px-2 py-1 text-[10px] font-semibold tracking-wider text-emerald-400 uppercase"
              >
                {searchResults.map((note) => (
                  <Command.Item
                    key={note.id}
                    value={`note-${note.id}-${note.title}`}
                    onSelect={() => {
                      onSelectNote(note.id, note.folderId);
                      onOpenChange(false);
                    }}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs transition hover:bg-zinc-900 data-[selected=true]:bg-zinc-850"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-zinc-100">{note.title}</span>
                        <span className="shrink-0 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          {note.folderName}
                        </span>
                      </div>
                      <p className="line-clamp-1 mt-0.5 text-[11px] text-zinc-400">
                        {note.content}
                      </p>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick Actions */}
            <Command.Group
              heading="Actions"
              className="px-2 py-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase"
            >
              <Command.Item
                value="action-new-note"
                onSelect={() => {
                  onCreateNewNote();
                  onOpenChange(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-200 transition hover:bg-zinc-900 data-[selected=true]:bg-zinc-850"
              >
                <Plus className="h-4 w-4 text-emerald-400" />
                <span>Create New Note</span>
                <kbd className="ml-auto rounded border border-zinc-800 px-1 py-0.5 text-[10px] text-zinc-500">
                  Ctrl+N
                </kbd>
              </Command.Item>

              <Command.Item
                value="action-new-folder"
                onSelect={() => {
                  onCreateFolderClick();
                  onOpenChange(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-200 transition hover:bg-zinc-900 data-[selected=true]:bg-zinc-850"
              >
                <Plus className="h-4 w-4 text-emerald-400" />
                <span>Create New Folder</span>
              </Command.Item>

              {activeNote && (
                <>
                  <Command.Item
                    value="action-copy-current-note"
                    onSelect={() => {
                      onCopyCurrentNote();
                      onOpenChange(false);
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-200 transition hover:bg-zinc-900 data-[selected=true]:bg-zinc-850"
                  >
                    <Copy className="h-4 w-4 text-zinc-400" />
                    <span>Copy Current Note</span>
                  </Command.Item>

                  <Command.Item
                    value="action-export-current-note"
                    onSelect={() => {
                      onExportCurrentNote();
                      onOpenChange(false);
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-200 transition hover:bg-zinc-900 data-[selected=true]:bg-zinc-850"
                  >
                    <Download className="h-4 w-4 text-zinc-400" />
                    <span>Export Current Note (.md)</span>
                  </Command.Item>
                </>
              )}

              {onExportVault && (
                <Command.Item
                  value="action-export-vault-zip"
                  onSelect={() => {
                    onExportVault();
                    onOpenChange(false);
                  }}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-200 transition hover:bg-zinc-900 data-[selected=true]:bg-zinc-850"
                >
                  <Archive className="h-4 w-4 text-emerald-400" />
                  <span>Export Complete Vault (.zip)</span>
                </Command.Item>
              )}
            </Command.Group>

            {/* Jump to folder */}
            <Command.Group
              heading="Folders"
              className="px-2 py-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase"
            >
              {folders.map((folder) => (
                <Command.Item
                  key={folder.id}
                  value={`folder-${folder.id}-${folder.name}`}
                  onSelect={() => {
                    onSelectFolder(folder.id);
                    onOpenChange(false);
                  }}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-200 transition hover:bg-zinc-900 data-[selected=true]:bg-zinc-850"
                >
                  <Folder className="h-4 w-4 text-zinc-500" />
                  <span>/{folder.name}</span>
                  {folder.isPinned && (
                    <span className="ml-auto text-[10px] text-emerald-400">Pinned</span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
