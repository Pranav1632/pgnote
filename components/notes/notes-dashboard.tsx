"use client";

import debounce from "debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BashTextArea } from "@/components/notes/bash-text-area";
import { FolderSidebar } from "@/components/notes/folder-sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FolderDTO, NoteDTO } from "@/types";

interface NotesDashboardProps {
  slug: string;
  timeoutMinutes: number;
  initialLoginAt: number;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  message?: string;
}

type ApiResult<T> = ApiSuccess<T> | ApiFailure;

const AUTO_SAVE_DELAY_MS = 5000;

function formatDuration(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function parseApiResponse<T>(response: Response): Promise<ApiResult<T>> {
  try {
    return (await response.json()) as ApiResult<T>;
  } catch {
    return {
      success: false,
      message: "Request failed.",
    };
  }
}

function getFailureMessage<T>(payload: ApiResult<T>, fallback: string): string {
  if (!payload.success) {
    return payload.message ?? fallback;
  }
  return fallback;
}

function parseTimestamp(isoValue: string | undefined): number | null {
  if (!isoValue) {
    return null;
  }

  const timestamp = new Date(isoValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function notePreviewText(content: string, maxLength = 60): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

export function NotesDashboard({
  slug,
  timeoutMinutes,
  initialLoginAt,
}: NotesDashboardProps) {
  const router = useRouter();
  const [folders, setFolders] = useState<FolderDTO[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [autoSaveDueAt, setAutoSaveDueAt] = useState<number | null>(null);
  const [autoSaveRemainingMs, setAutoSaveRemainingMs] = useState(0);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<NoteDTO | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [deletingNoteIds, setDeletingNoteIds] = useState<Set<string>>(() => new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const sessionEndsAt = useMemo(
    () => initialLoginAt + timeoutMinutes * 60_000,
    [initialLoginAt, timeoutMinutes]
  );

  const [remainingMs, setRemainingMs] = useState(() => sessionEndsAt - Date.now());

  const lastSavedContentRef = useRef("");
  const saveInFlightRef = useRef(false);
  const warningShownRef = useRef(false);
  const isLoggingOutRef = useRef(false);

  const logoutAndRedirect = useCallback(
    async (reason?: "timeout" | "manual") => {
      if (isLoggingOutRef.current) {
        return;
      }

      isLoggingOutRef.current = true;
      toast.dismiss("session-timeout-warning");

      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
      }

      if (reason) {
        router.push(`/${slug}?reason=${reason}`);
        return;
      }

      router.push(`/${slug}`);
    },
    [router, slug]
  );

  const handleUnauthorized = useCallback(() => {
    void logoutAndRedirect("timeout");
  }, [logoutAndRedirect]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(sessionEndsAt - Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionEndsAt]);

  useEffect(() => {
    if (autoSaveDueAt === null) {
      setAutoSaveRemainingMs(0);
      return;
    }

    setAutoSaveRemainingMs(Math.max(0, autoSaveDueAt - Date.now()));
    const interval = setInterval(() => {
      setAutoSaveRemainingMs(Math.max(0, autoSaveDueAt - Date.now()));
    }, 250);

    return () => clearInterval(interval);
  }, [autoSaveDueAt]);

  useEffect(() => {
    if (isLoggingOutRef.current) {
      return;
    }

    if (remainingMs <= 0) {
      void logoutAndRedirect("timeout");
      return;
    }

    if (remainingMs <= 30_000) {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        toast.warning("Session ending soon", {
          id: "session-timeout-warning",
          description: "You will be logged out in about 30 seconds.",
          duration: 6000,
        });
      }
    } else if (warningShownRef.current) {
      warningShownRef.current = false;
      toast.dismiss("session-timeout-warning");
    }
  }, [remainingMs, logoutAndRedirect]);

  const fetchFolders = useCallback(async () => {
    setIsLoadingFolders(true);
    setDashboardError(null);

    try {
      const response = await fetch("/api/folders", { method: "GET" });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const payload = await parseApiResponse<{ folders: FolderDTO[] }>(response);
      if (!response.ok || !payload.success) {
        setDashboardError(getFailureMessage(payload, "Unable to load folders."));
        return;
      }

      setFolders(payload.data.folders);
      setActiveFolderId((previous) => {
        if (previous && payload.data.folders.some((folder) => folder.id === previous)) {
          return previous;
        }
        return payload.data.folders[0]?.id ?? null;
      });
    } catch {
      setDashboardError("Network error while loading folders.");
    } finally {
      setIsLoadingFolders(false);
    }
  }, [handleUnauthorized]);

  const fetchNotes = useCallback(async (folderId: string) => {
    setIsLoadingNotes(true);
    setDashboardError(null);

    try {
      const response = await fetch(`/api/notes?folderId=${encodeURIComponent(folderId)}`, {
        method: "GET",
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const payload = await parseApiResponse<{ notes: NoteDTO[] }>(response);
      if (!response.ok || !payload.success) {
        setDashboardError(getFailureMessage(payload, "Unable to load notes."));
        return;
      }

      const nextNotes = payload.data.notes;
      setNotes(nextNotes);

      const firstNote = nextNotes[0];
      setActiveNoteId(firstNote?.id ?? null);
      setEditorContent(firstNote?.content ?? "");
      lastSavedContentRef.current = firstNote?.content ?? "";
      setSaveState("saved");
      setLastSavedAt(parseTimestamp(firstNote?.updatedAt));
      setAutoSaveDueAt(null);
      setAutoSaveRemainingMs(0);
      setSaveMessage(null);
    } catch {
      setDashboardError("Network error while loading notes.");
      setNotes([]);
      setActiveNoteId(null);
      setEditorContent("");
      lastSavedContentRef.current = "";
      setSaveState("saved");
      setLastSavedAt(null);
      setAutoSaveDueAt(null);
      setAutoSaveRemainingMs(0);
    } finally {
      setIsLoadingNotes(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    void fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    if (!activeFolderId) {
      setNotes([]);
      setActiveNoteId(null);
      setEditorContent("");
      lastSavedContentRef.current = "";
      setSaveState("saved");
      setLastSavedAt(null);
      setAutoSaveDueAt(null);
      setAutoSaveRemainingMs(0);
      return;
    }

    void fetchNotes(activeFolderId);
  }, [activeFolderId, fetchNotes]);

  const saveContent = useCallback(async (contentToSave: string, reason: "manual" | "autosave") => {
    if (!activeFolderId) {
      return;
    }

    const creatingNewNote = !activeNoteId;
    if (creatingNewNote && contentToSave.trim().length === 0) {
      setSaveState("saved");
      setAutoSaveDueAt(null);
      setAutoSaveRemainingMs(0);
      return;
    }

    if (saveInFlightRef.current) {
      return;
    }

    if (contentToSave === lastSavedContentRef.current) {
      setSaveState("saved");
      setAutoSaveDueAt(null);
      setAutoSaveRemainingMs(0);
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    setSaveState("saving");
    setSaveMessage(null);
    setDashboardError(null);
    setAutoSaveDueAt(null);
    setAutoSaveRemainingMs(0);

    try {
      if (creatingNewNote) {
        const createResponse = await fetch("/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            folderId: activeFolderId,
            content: contentToSave,
          }),
        });

        if (createResponse.status === 401) {
          handleUnauthorized();
          return;
        }

        const createPayload = await parseApiResponse<{ note: NoteDTO }>(createResponse);
        if (!createResponse.ok || !createPayload.success) {
          setSaveState("unsaved");
          setDashboardError(getFailureMessage(createPayload, "Unable to save note."));
          return;
        }

        const createdNote = createPayload.data.note;
        setActiveNoteId(createdNote.id);
        setNotes((previous) => [createdNote, ...previous]);
      } else {
        const updateResponse = await fetch("/api/notes", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            noteId: activeNoteId,
            folderId: activeFolderId,
            content: contentToSave,
          }),
        });

        if (updateResponse.status === 401) {
          handleUnauthorized();
          return;
        }

        const updatePayload = await parseApiResponse<{ note: NoteDTO }>(updateResponse);
        if (!updateResponse.ok || !updatePayload.success) {
          setSaveState("unsaved");
          setDashboardError(getFailureMessage(updatePayload, "Unable to save note."));
          return;
        }

        const updatedNote = updatePayload.data.note;
        setNotes((previous) => {
          const withoutCurrent = previous.filter((note) => note.id !== updatedNote.id);
          return [updatedNote, ...withoutCurrent];
        });
      }

      lastSavedContentRef.current = contentToSave;
      setSaveState("saved");
      setLastSavedAt(Date.now());
      setSaveMessage(reason === "manual" ? "Saved." : "Autosaved.");
    } catch {
      setSaveState("unsaved");
      setDashboardError("Network error while saving note.");
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  }, [activeFolderId, activeNoteId, handleUnauthorized]);

  const debouncedSave = useMemo(
    () =>
      debounce((contentToSave: string) => {
        void saveContent(contentToSave, "autosave");
      }, AUTO_SAVE_DELAY_MS),
    [saveContent]
  );

  useEffect(() => {
    return () => {
      debouncedSave.clear();
    };
  }, [debouncedSave]);

  const handleEditorChange = (nextContent: string) => {
    setEditorContent(nextContent);
    setSaveMessage(null);
    setDashboardError(null);

    if (!activeFolderId) {
      return;
    }

    if (nextContent === lastSavedContentRef.current) {
      setSaveState("saved");
      setAutoSaveDueAt(null);
      setAutoSaveRemainingMs(0);
      debouncedSave.clear();
      return;
    }

    setSaveState("unsaved");
    const dueAt = Date.now() + AUTO_SAVE_DELAY_MS;
    setAutoSaveDueAt(dueAt);
    setAutoSaveRemainingMs(AUTO_SAVE_DELAY_MS);
    debouncedSave(nextContent);
  };

  const handleManualSave = () => {
    debouncedSave.clear();
    void saveContent(editorContent, "manual");
  };

  const handleCreateFolder = async (name: string) => {
    const normalizedName = name.trim().toLowerCase();
    const duplicateExists = folders.some(
      (folder) => folder.name.trim().toLowerCase() === normalizedName
    );

    if (duplicateExists) {
      throw new Error("Folder already exists.");
    }

    const response = await fetch("/api/folders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
      }),
    });

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("Unauthorized.");
    }

    const payload = await parseApiResponse<{ folder: FolderDTO }>(response);
    if (!response.ok || !payload.success) {
      const fallback = response.status === 409 ? "Folder already exists." : "Unable to create folder.";
      throw new Error(getFailureMessage(payload, fallback));
    }

    setFolders((previous) => [...previous, payload.data.folder]);
    setActiveFolderId(payload.data.folder.id);
    setNotes([]);
    setActiveNoteId(null);
    setEditorContent("");
    lastSavedContentRef.current = "";
    setSaveState("saved");
    setLastSavedAt(null);
    setAutoSaveDueAt(null);
    setAutoSaveRemainingMs(0);
    setSaveMessage("Folder created. Start typing your note.");
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Unauthorized.");
      }

      if (!response.ok) {
        toast.error("Failed to delete folder");
        throw new Error("Failed to delete folder.");
      }

      setFolders((previousFolders) => {
        const nextFolders = previousFolders.filter((folder) => folder.id !== folderId);

        if (activeFolderId === folderId) {
          const nextActiveFolderId = nextFolders[0]?.id ?? null;
          debouncedSave.clear();
          setActiveFolderId(nextActiveFolderId);
          setNotes([]);
          setActiveNoteId(null);
          setEditorContent("");
          lastSavedContentRef.current = "";
          setSaveState("saved");
          setLastSavedAt(null);
          setAutoSaveDueAt(null);
          setAutoSaveRemainingMs(0);
          setSaveMessage(null);
        }

        return nextFolders;
      });
    } catch (error) {
      toast.error("Failed to delete folder");
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to delete folder.");
    }
  };

  const handleDeleteNote = async () => {
    if (!pendingDeleteNote) {
      return;
    }

    setIsDeletingNote(true);

    try {
      const noteId = pendingDeleteNote.id;
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        toast.error("Failed to delete note");
        return;
      }

      setDeletingNoteIds((previous) => {
        const next = new Set(previous);
        next.add(noteId);
        return next;
      });
      setPendingDeleteNote(null);

      window.setTimeout(() => {
        setNotes((previousNotes) => {
          const nextNotes = previousNotes.filter((note) => note.id !== noteId);

          if (activeNoteId === noteId) {
            const nextActiveNote = nextNotes[0];
            debouncedSave.clear();
            setActiveNoteId(nextActiveNote?.id ?? null);
            setEditorContent(nextActiveNote?.content ?? "");
            lastSavedContentRef.current = nextActiveNote?.content ?? "";
            setSaveState("saved");
            setLastSavedAt(parseTimestamp(nextActiveNote?.updatedAt));
            setAutoSaveDueAt(null);
            setAutoSaveRemainingMs(0);
            setSaveMessage(null);
          }

          return nextNotes;
        });

        setDeletingNoteIds((previous) => {
          const next = new Set(previous);
          next.delete(noteId);
          return next;
        });
      }, 180);
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setIsDeletingNote(false);
    }
  };

  const handleOpenNote = (noteId: string) => {
    const selected = notes.find((note) => note.id === noteId);
    if (!selected) {
      return;
    }

    debouncedSave.clear();
    setActiveNoteId(selected.id);
    setEditorContent(selected.content);
    lastSavedContentRef.current = selected.content;
    setSaveState("saved");
    setLastSavedAt(parseTimestamp(selected.updatedAt));
    setAutoSaveDueAt(null);
    setAutoSaveRemainingMs(0);
    setSaveMessage(null);
  };

  const handleCreateNewNote = () => {
    debouncedSave.clear();
    setActiveNoteId(null);
    setEditorContent("");
    lastSavedContentRef.current = "";
    setSaveState("saved");
    setLastSavedAt(null);
    setAutoSaveDueAt(null);
    setAutoSaveRemainingMs(0);
    setSaveMessage("New note draft started.");
  };

  const handleEndSession = async () => {
    await logoutAndRedirect("manual");
  };

  const autosaveSeconds =
    saveState === "unsaved" && autoSaveDueAt !== null
      ? Math.max(1, Math.ceil(autoSaveRemainingMs / 1000))
      : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-500 uppercase">pgnote workspace</p>
            <p className="text-sm text-zinc-300">/{slug}/notes</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 font-mono text-sm text-emerald-400">
              {formatDuration(remainingMs)}
            </div>
            <Button type="button" variant="destructive" size="sm" onClick={handleEndSession}>
              End Session
            </Button>
          </div>
        </div>

        <div className={`grid gap-4 ${isSidebarCollapsed ? "md:grid-cols-[88px_1fr]" : "md:grid-cols-[280px_1fr]"}`}>
          <div className="h-[calc(100vh-7.5rem)]">
            <FolderSidebar
              folders={folders}
              activeFolderId={activeFolderId}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed((previous) => !previous)}
              onSelectFolder={setActiveFolderId}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
            />
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Notes</h2>
                <p className="text-sm text-zinc-400">
                  {activeFolderId
                    ? `Active folder: ${folders.find((folder) => folder.id === activeFolderId)?.name ?? "--"}`
                    : "Select or create a folder to begin"}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleCreateNewNote}>
                New Note
              </Button>
            </div>

            <BashTextArea
              value={editorContent}
              onChange={handleEditorChange}
              onSave={handleManualSave}
              isSaving={isSaving}
              saveState={saveState}
              autosaveSeconds={autosaveSeconds}
              lastSavedAt={lastSavedAt}
              disabled={!activeFolderId || isLoadingFolders || isLoadingNotes}
            />

            {saveMessage && <p className="text-sm text-emerald-400">{saveMessage}</p>}
            {dashboardError && <p className="text-sm text-rose-400">{dashboardError}</p>}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-zinc-200 uppercase">
                Saved Notes (Newest First)
              </h3>

              {!activeFolderId && <p className="text-sm text-zinc-400">Pick a folder to view notes.</p>}
              {activeFolderId && notes.length === 0 && (
                <p className="text-sm text-zinc-400">No notes saved yet in this folder.</p>
              )}

              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`group relative rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                      activeNoteId === note.id
                        ? "border-zinc-400 bg-zinc-800 text-zinc-100"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
                    } ${deletingNoteIds.has(note.id) ? "pointer-events-none opacity-0" : "opacity-100"}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenNote(note.id)}
                      className="w-full pr-9 text-left"
                    >
                      <div className="mb-1 text-xs text-zinc-500">
                        {new Date(note.updatedAt).toLocaleString()}
                      </div>
                      <div className="line-clamp-3 font-mono text-sm">
                        {note.content.length > 240 ? `${note.content.slice(0, 240)}...` : note.content}
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete note"
                      onClick={() => setPendingDeleteNote(note)}
                      className="absolute top-3 right-3 rounded-md border border-transparent p-1 text-zinc-500 opacity-0 transition hover:border-zinc-700 hover:text-rose-300 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <AlertDialog
        open={Boolean(pendingDeleteNote)}
        onOpenChange={(open) => {
          if (!open && !isDeletingNote) {
            setPendingDeleteNote(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteNote
                ? notePreviewText(pendingDeleteNote.content)
                : "This note will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingNote}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingNote}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteNote();
              }}
            >
              {isDeletingNote ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
