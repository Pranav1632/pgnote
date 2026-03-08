"use client";

import debounce from "debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BashTextArea } from "@/components/notes/bash-text-area";
import { FolderSidebar } from "@/components/notes/folder-sidebar";
import type { FolderDTO, NoteDTO } from "@/types";

interface NotesDashboardProps {
  slug: string;
  timeoutMinutes: number;
  initialLastActivityAt: number;
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

function newlineCount(content: string): number {
  const matches = content.match(/\n/g);
  return matches ? matches.length : 0;
}

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

export function NotesDashboard({
  slug,
  timeoutMinutes,
  initialLastActivityAt,
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
  const [activityAnchor, setActivityAnchor] = useState(initialLastActivityAt);
  const [remainingMs, setRemainingMs] = useState(() => {
    const timeoutMs = timeoutMinutes * 60_000;
    return timeoutMs - (Date.now() - initialLastActivityAt);
  });

  const lastSavedContentRef = useRef("");
  const saveInFlightRef = useRef(false);

  const timeoutMs = timeoutMinutes * 60_000;

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(timeoutMs - (Date.now() - activityAnchor));
    }, 1000);

    return () => clearInterval(interval);
  }, [activityAnchor, timeoutMs]);

  const handleUnauthorized = useCallback(() => {
    router.push(`/${slug}`);
  }, [router, slug]);

  const fetchFolders = useCallback(async () => {
    setIsLoadingFolders(true);
    setDashboardError(null);

    const response = await fetch("/api/folders", { method: "GET" });
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    const payload = await parseApiResponse<{ folders: FolderDTO[] }>(response);
    if (!response.ok || !payload.success) {
      setDashboardError(getFailureMessage(payload, "Unable to load folders."));
      setIsLoadingFolders(false);
      return;
    }

    setFolders(payload.data.folders);
    setActiveFolderId((previous) => {
      if (previous && payload.data.folders.some((folder) => folder.id === previous)) {
        return previous;
      }
      return payload.data.folders[0]?.id ?? null;
    });
    setActivityAnchor(Date.now());
    setIsLoadingFolders(false);
  }, [handleUnauthorized]);

  const fetchNotes = useCallback(async (folderId: string) => {
    setIsLoadingNotes(true);
    setDashboardError(null);

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
      setIsLoadingNotes(false);
      return;
    }

    const nextNotes = payload.data.notes;
    setNotes(nextNotes);

    const firstNote = nextNotes[0];
    setActiveNoteId(firstNote?.id ?? null);
    setEditorContent(firstNote?.content ?? "");
    lastSavedContentRef.current = firstNote?.content ?? "";
    setActivityAnchor(Date.now());
    setIsLoadingNotes(false);
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
      return;
    }
    void fetchNotes(activeFolderId);
  }, [activeFolderId, fetchNotes]);

  const saveContent = useCallback(async (contentToSave: string, reason: "manual" | "debounce" | "threshold") => {
    if (!activeFolderId) {
      return;
    }

    if (!contentToSave.trim()) {
      return;
    }

    if (saveInFlightRef.current) {
      return;
    }

    if (contentToSave === lastSavedContentRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    setSaveMessage(null);
    setDashboardError(null);

    try {
      if (!activeNoteId) {
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
      setActivityAnchor(Date.now());
      setSaveMessage(reason === "manual" ? "Saved manually." : "Autosaved.");
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  }, [activeFolderId, activeNoteId, handleUnauthorized]);

  const debouncedSave = useMemo(
    () =>
      debounce((contentToSave: string) => {
        void saveContent(contentToSave, "debounce");
      }, 3000),
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

    const unsavedNewlines = newlineCount(nextContent) - newlineCount(lastSavedContentRef.current);
    if (unsavedNewlines >= 4) {
      debouncedSave.clear();
      void saveContent(nextContent, "threshold");
      return;
    }

    debouncedSave(nextContent);
  };

  const handleManualSave = () => {
    debouncedSave.clear();
    void saveContent(editorContent, "manual");
  };

  const handleCreateFolder = async (name: string) => {
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
      throw new Error(getFailureMessage(payload, "Unable to create folder."));
    }

    setFolders((previous) => [...previous, payload.data.folder]);
    setActiveFolderId(payload.data.folder.id);
    setActivityAnchor(Date.now());
  };

  const handleOpenNote = (noteId: string) => {
    const selected = notes.find((note) => note.id === noteId);
    if (!selected) {
      return;
    }
    setActiveNoteId(selected.id);
    setEditorContent(selected.content);
    lastSavedContentRef.current = selected.content;
  };

  const handleCreateNewNote = () => {
    setActiveNoteId(null);
    setEditorContent("");
    lastSavedContentRef.current = "";
    setSaveMessage("New note draft started.");
  };

  const handleEndSession = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${slug}`);
  };

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

        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <div className="h-[calc(100vh-7.5rem)]">
            <FolderSidebar
              folders={folders}
              activeFolderId={activeFolderId}
              onSelectFolder={setActiveFolderId}
              onCreateFolder={handleCreateFolder}
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
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleOpenNote(note.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      activeNoteId === note.id
                        ? "border-zinc-400 bg-zinc-800 text-zinc-100"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
                    }`}
                  >
                    <div className="mb-1 text-xs text-zinc-500">
                      {new Date(note.updatedAt).toLocaleString()}
                    </div>
                    <div className="line-clamp-3 font-mono text-sm">
                      {note.content.length > 240 ? `${note.content.slice(0, 240)}...` : note.content}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
