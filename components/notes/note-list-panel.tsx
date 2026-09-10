"use client";

import { useMemo, useState } from "react";
import { Copy, Loader2, Pin, PinOff, Search, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { NoteDTO } from "@/types";

interface NoteListPanelProps {
  notes: NoteDTO[];
  activeNoteId: string | null;
  deletingNoteIds: Set<string>;
  sharingNoteIds: Set<string>;
  onOpenNote: (noteId: string) => void;
  onDeleteNote: (note: NoteDTO) => void;
  onShareNote: (note: NoteDTO) => void;
  onCreateNewNote: () => void;
  activeFolderId: string | null;
}

function extractTitle(content: string): string {
  const firstLine = content.split("\n")[0]?.trim() ?? "";
  if (firstLine.length === 0) return "Untitled Note";
  if (firstLine.length > 50) return `${firstLine.slice(0, 50)}...`;
  return firstLine;
}

function extractPreview(content: string, maxLength = 120): string {
  const lines = content.split("\n");
  const preview = lines.slice(1).join(" ").replace(/\s+/g, " ").trim();
  if (preview.length === 0) return "";
  if (preview.length <= maxLength) return preview;
  return `${preview.slice(0, maxLength)}...`;
}

export function NoteListPanel({
  notes,
  activeNoteId,
  deletingNoteIds,
  sharingNoteIds,
  onOpenNote,
  onDeleteNote,
  onShareNote,
  onCreateNewNote,
  activeFolderId,
}: NoteListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedNoteIds, setPinnedNoteIds] = useState<Set<string>>(() => new Set());

  const togglePin = (noteId: string) => {
    setPinnedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const copyNoteContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard", { duration: 1500 });
    } catch {
      toast.error("Failed to copy");
    }
  };

  const filteredNotes = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return notes;
    return notes.filter((note) => note.content.toLowerCase().includes(query));
  }, [notes, searchQuery]);

  const sortedNotes = useMemo(() => {
    const pinned = filteredNotes.filter((note) => pinnedNoteIds.has(note.id));
    const unpinned = filteredNotes.filter((note) => !pinnedNoteIds.has(note.id));
    return [...pinned, ...unpinned];
  }, [filteredNotes, pinnedNoteIds]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur">
      <div className="shrink-0 border-b border-zinc-800 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">Notes</h3>
          <button
            type="button"
            onClick={onCreateNewNote}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200 transition hover:border-emerald-600 hover:bg-zinc-700 hover:text-emerald-300"
          >
            + New
          </button>
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search notes..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-1.5 pr-3 pl-8 text-xs text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-emerald-700"
          />
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin">
        {!activeFolderId && (
          <p className="px-2 py-4 text-center text-xs text-zinc-500">Pick a folder to view notes.</p>
        )}

        {activeFolderId && sortedNotes.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-zinc-500">
              {searchQuery ? "No matching notes." : "No notes yet in this folder."}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={onCreateNewNote}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-900/40"
              >
                + Write First Note
              </button>
            )}
          </div>
        )}

        {sortedNotes.map((note) => {
          const isPinned = pinnedNoteIds.has(note.id);
          const isActive = activeNoteId === note.id;
          const isDeleting = deletingNoteIds.has(note.id);
          const isSharing = sharingNoteIds.has(note.id);

          return (
            <div
              key={note.id}
              className={`group relative rounded-xl border transition-all duration-200 ${
                isActive
                  ? "border-emerald-600/40 bg-zinc-800/80 shadow-[0_0_12px_rgba(16,185,129,0.06)]"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              } ${isDeleting ? "pointer-events-none scale-95 opacity-0" : "opacity-100"}`}
            >
              <button
                type="button"
                onClick={() => onOpenNote(note.id)}
                className="w-full px-3 py-2.5 pr-28 text-left md:pr-3"
              >
                <div className="mb-0.5 flex items-center gap-1.5">
                  {isPinned && <Pin className="h-3 w-3 shrink-0 text-amber-400" />}
                  {note.isPublic && !isPinned && <Share2 className="h-3 w-3 shrink-0 text-emerald-400" />}
                  <span className="truncate text-sm font-medium text-zinc-100 transition-colors group-hover:text-zinc-300">
                    {extractTitle(note.content)}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400 transition-colors group-hover:text-zinc-400/90">
                  {extractPreview(note.content)}
                </p>
                <p className="mt-1 text-[10px] text-zinc-600 transition-colors group-hover:text-zinc-500">
                  {new Date(note.updatedAt).toLocaleString()}
                </p>
              </button>

              <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-lg bg-zinc-950/90 p-0.5 shadow-sm backdrop-blur-sm transition md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  aria-label={note.isPublic ? "Copy public share link" : "Create public share link"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onShareNote(note);
                  }}
                  disabled={isSharing}
                  className="flex h-7 w-7 items-center justify-center rounded-md p-1 text-zinc-400 transition hover:text-emerald-300 disabled:opacity-40"
                >
                  {isSharing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Share2 className={`h-3.5 w-3.5 ${note.isPublic ? "text-emerald-300" : ""}`} />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={isPinned ? "Unpin note" : "Pin note"}
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePin(note.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md p-1 text-zinc-400 transition hover:text-amber-300"
                >
                  {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  aria-label="Copy note content"
                  onClick={(event) => {
                    event.stopPropagation();
                    void copyNoteContent(note.content);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md p-1 text-zinc-400 transition hover:text-emerald-300"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete note"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteNote(note);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md p-1 text-zinc-400 transition hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
