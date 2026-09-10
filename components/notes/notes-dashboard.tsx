"use client";

import debounce from "debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BashTextArea } from "@/components/notes/bash-text-area";
import { FolderSidebar } from "@/components/notes/folder-sidebar";
import { NoteListPanel } from "@/components/notes/note-list-panel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable-panel";
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
  if (!isoValue) return null;
  const timestamp = new Date(isoValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function notePreviewText(content: string, maxLength = 60): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
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
  const [sharingNoteIds, setSharingNoteIds] = useState<Set<string>>(() => new Set());

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
      if (isLoggingOutRef.current) return;
      isLoggingOutRef.current = true;
      toast.dismiss("session-timeout-warning");
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch { }
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

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(sessionEndsAt - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionEndsAt]);

  // Auto-save countdown
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

  // Session expiry warnings
  useEffect(() => {
    if (isLoggingOutRef.current) return;
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

  // ── Data fetching ──────────────────────────────────────────────
  const fetchFolders = useCallback(async () => {
    setIsLoadingFolders(true);
    setDashboardError(null);
    try {
      const response = await fetch("/api/folders", { method: "GET" });
      if (response.status === 401) { handleUnauthorized(); return; }
      const payload = await parseApiResponse<{ folders: FolderDTO[] }>(response);
      if (!response.ok || !payload.success) {
        setDashboardError(getFailureMessage(payload, "Unable to load folders."));
        return;
      }
      setFolders(payload.data.folders);
      setActiveFolderId((prev) => {
        if (prev && payload.data.folders.some((f) => f.id === prev)) return prev;
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
      const response = await fetch(`/api/notes?folderId=${encodeURIComponent(folderId)}`, { method: "GET" });
      if (response.status === 401) { handleUnauthorized(); return; }
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

  // ── Save logic ─────────────────────────────────────────────────
  const saveContent = useCallback(async (contentToSave: string, reason: "manual" | "autosave") => {
    if (!activeFolderId) return;
    const creatingNewNote = !activeNoteId;
    if (creatingNewNote && contentToSave.trim().length === 0) {
      setSaveState("saved");
      setAutoSaveDueAt(null);
      setAutoSaveRemainingMs(0);
      return;
    }
    if (saveInFlightRef.current) return;
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: activeFolderId, content: contentToSave }),
        });
        if (createResponse.status === 401) { handleUnauthorized(); return; }
        const createPayload = await parseApiResponse<{ note: NoteDTO }>(createResponse);
        if (!createResponse.ok || !createPayload.success) {
          setSaveState("unsaved");
          setDashboardError(getFailureMessage(createPayload, "Unable to save note."));
          return;
        }
        const createdNote = createPayload.data.note;
        setActiveNoteId(createdNote.id);
        setNotes((prev) => [createdNote, ...prev]);
      } else {
        const updateResponse = await fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteId: activeNoteId, folderId: activeFolderId, content: contentToSave }),
        });
        if (updateResponse.status === 401) { handleUnauthorized(); return; }
        const updatePayload = await parseApiResponse<{ note: NoteDTO }>(updateResponse);
        if (!updateResponse.ok || !updatePayload.success) {
          setSaveState("unsaved");
          setDashboardError(getFailureMessage(updatePayload, "Unable to save note."));
          return;
        }
        const updatedNote = updatePayload.data.note;
        setNotes((prev) => {
          const withoutCurrent = prev.filter((n) => n.id !== updatedNote.id);
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
    return () => { debouncedSave.clear(); };
  }, [debouncedSave]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleEditorChange = (nextContent: string) => {
    setEditorContent(nextContent);
    setSaveMessage(null);
    setDashboardError(null);
    if (!activeFolderId) return;
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
    if (duplicateExists) throw new Error("Folder already exists.");
    const response = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.status === 401) { handleUnauthorized(); throw new Error("Unauthorized."); }
    const payload = await parseApiResponse<{ folder: FolderDTO }>(response);
    if (!response.ok || !payload.success) {
      const fallback = response.status === 409 ? "Folder already exists." : "Unable to create folder.";
      throw new Error(getFailureMessage(payload, fallback));
    }
    setFolders((prev) => [...prev, payload.data.folder]);
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
      const response = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
      if (response.status === 401) { handleUnauthorized(); throw new Error("Unauthorized."); }
      if (!response.ok) { toast.error("Failed to delete folder"); throw new Error("Failed to delete folder."); }
      setFolders((prevFolders) => {
        const nextFolders = prevFolders.filter((f) => f.id !== folderId);
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
      if (error instanceof Error) throw error;
      throw new Error("Failed to delete folder.");
    }
  };

  const handleDeleteNote = async () => {
    if (!pendingDeleteNote) return;
    setIsDeletingNote(true);
    try {
      const noteId = pendingDeleteNote.id;
      const response = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (!response.ok) { toast.error("Failed to delete note"); return; }
      setDeletingNoteIds((prev) => { const next = new Set(prev); next.add(noteId); return next; });
      setPendingDeleteNote(null);
      window.setTimeout(() => {
        setNotes((prevNotes) => {
          const nextNotes = prevNotes.filter((n) => n.id !== noteId);
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
        setDeletingNoteIds((prev) => { const next = new Set(prev); next.delete(noteId); return next; });
      }, 180);
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setIsDeletingNote(false);
    }
  };

  const handleOpenNote = (noteId: string) => {
    const selected = notes.find((n) => n.id === noteId);
    if (!selected) return;
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

  const handleShareNote = async (note: NoteDTO) => {
    setSharingNoteIds((prev) => {
      const next = new Set(prev);
      next.add(note.id);
      return next;
    });

    try {
      const response = await fetch(`/api/notes/${note.id}/share`, { method: "POST" });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const payload = await parseApiResponse<{ shareId: string; sharePath: string }>(response);
      if (!response.ok || !payload.success) {
        toast.error(getFailureMessage(payload, "Unable to create share link."));
        return;
      }

      const shareToken = payload.data.shareId.split(".").slice(1).join(".");
      setNotes((prevNotes) =>
        prevNotes.map((existingNote) =>
          existingNote.id === note.id
            ? {
              ...existingNote,
              isPublic: true,
              shareToken: shareToken || existingNote.shareToken,
            }
            : existingNote
        )
      );

      const absoluteUrl = `${window.location.origin}${payload.data.sharePath}`;
      await navigator.clipboard.writeText(absoluteUrl);
      toast.success("Public link copied to clipboard.", { duration: 1800 });
    } catch {
      toast.error("Unable to create share link.");
    } finally {
      setSharingNoteIds((prev) => {
        const next = new Set(prev);
        next.delete(note.id);
        return next;
      });
    }
  };

  const handleEndSession = async () => {
    await logoutAndRedirect("manual");
  };

  // Keyboard shortcuts: Ctrl+N (new note)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleCreateNewNote();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autosaveSeconds =
    saveState === "unsaved" && autoSaveDueAt !== null
      ? Math.max(1, Math.ceil(autoSaveRemainingMs / 1000))
      : null;

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  return (
    <main className="h-screen bg-zinc-950 text-zinc-100">
      <div className="flex h-full flex-col px-3 py-3 sm:px-4 md:px-5">
        {/* Top bar */}
        <div className="mb-3 flex shrink-0 flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-500 uppercase">pgnote workspace</p>
            <p className="text-sm text-zinc-300">/{slug}/notes</p>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-1.5 font-mono text-sm text-emerald-400">
              {formatDuration(remainingMs)}
            </div>
            <Button type="button" variant="destructive" size="sm" onClick={handleEndSession}>
              End Session
            </Button>
          </div>
        </div>

        {/* Messages */}
        {(saveMessage || dashboardError) && (
          <div className="mb-2 shrink-0">
            {saveMessage && <p className="text-sm text-emerald-400">{saveMessage}</p>}
            {dashboardError && <p className="text-sm text-rose-400">{dashboardError}</p>}
          </div>
        )}

        {/* 3-panel resizable layout */}
        <div className="min-h-0 flex-1">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-xl">
            {/* Left: Folder sidebar */}
            <ResizablePanel defaultSize="18%" minSize="8%" maxSize="30%" id="sidebar">
              <FolderSidebar
                folders={folders}
                activeFolderId={activeFolderId}
                isCollapsed={false}
                onToggleCollapse={() => { }}
                onSelectFolder={setActiveFolderId}
                onCreateFolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Center: Note editor */}
            <ResizablePanel defaultSize="55%" minSize="30%" id="editor">
              <div className="flex h-full flex-col gap-2 px-1">
                <div className="flex shrink-0 items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">
                      {activeFolder?.name ?? "Notes"}
                    </h2>
                    {!activeFolderId && (
                      <p className="text-xs text-zinc-500">Select or create a folder</p>
                    )}
                  </div>
                </div>
                <div className="min-h-0 flex-1">
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
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right: Note list panel */}
            <ResizablePanel defaultSize="27%" minSize="15%" maxSize="45%" id="notes">
              <NoteListPanel
                notes={notes}
                activeNoteId={activeNoteId}
                deletingNoteIds={deletingNoteIds}
                sharingNoteIds={sharingNoteIds}
                onOpenNote={handleOpenNote}
                onDeleteNote={(note) => setPendingDeleteNote(note)}
                onShareNote={handleShareNote}
                onCreateNewNote={handleCreateNewNote}
                activeFolderId={activeFolderId}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* Delete note confirmation dialog */}
      <AlertDialog
        open={Boolean(pendingDeleteNote)}
        onOpenChange={(open) => {
          if (!open && !isDeletingNote) setPendingDeleteNote(null);
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
              {isDeletingNote ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
