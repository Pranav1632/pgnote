"use client";

import { useMemo, useState } from "react";
import { Check, PanelLeftClose, PanelLeftOpen, Pencil, Pin, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { FolderDTO } from "@/types";

interface FolderSidebarProps {
  folders: FolderDTO[];
  activeFolderId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onRenameFolder?: (folderId: string, newName: string) => Promise<void>;
  onTogglePinFolder?: (folderId: string, isPinned: boolean) => Promise<void>;
}

function folderShortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "--";
  }
  return trimmed.slice(0, 2);
}

export function FolderSidebar({
  folders,
  activeFolderId,
  isCollapsed,
  onToggleCollapse,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onTogglePinFolder,
}: FolderSidebarProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState<FolderDTO | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const startRename = (folder: FolderDTO) => {
    setRenamingFolderId(folder.id);
    setRenameValue(folder.name);
    setRenameError(null);
  };

  const cancelRename = () => {
    setRenamingFolderId(null);
    setRenameValue("");
    setRenameError(null);
  };

  const handleRenameSubmit = async (folderId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError("Folder name cannot be empty.");
      return;
    }
    if (!onRenameFolder) return;
    setIsRenaming(true);
    setRenameError(null);
    try {
      await onRenameFolder(folderId, trimmed);
      setRenamingFolderId(null);
      setRenameValue("");
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Failed to rename folder.");
    } finally {
      setIsRenaming(false);
    }
  };

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [folders]);

  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      setCreateError("Folder name is required.");
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    try {
      await onCreateFolder(trimmedName);
      setNewFolderName("");
      setShowCreateForm(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create folder.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!pendingDeleteFolder) {
      return;
    }

    setIsDeletingFolder(true);

    try {
      await onDeleteFolder(pendingDeleteFolder.id);
      setPendingDeleteFolder(null);
    } catch {
    } finally {
      setIsDeletingFolder(false);
    }
  };

  return (
    <aside className="flex h-full flex-col overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 backdrop-blur">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">Folders</h2>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand folders" : "Collapse folders"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="mb-3">
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="w-full"
              onClick={() => {
                setShowCreateForm((previous) => !previous);
                setCreateError(null);
              }}
            >
              New Folder
            </Button>
          </div>

          {showCreateForm && (
            <div className="mb-3 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <input
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="DSACode"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size="xs"
                  variant="default"
                  onClick={handleCreateFolder}
                  disabled={isCreating}
                >
                  {isCreating ? "Creating..." : "Create"}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError(null);
                    setNewFolderName("");
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </div>
              {createError && <p className="text-xs text-rose-400">{createError}</p>}
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        {sortedFolders.length === 0 && !isCollapsed && (
          <p className="text-sm text-zinc-400">No folders yet. Create one to start taking notes.</p>
        )}

        {sortedFolders.map((folder) => (
          <div
            key={folder.id}
            className={`group relative rounded-xl border transition ${activeFolderId === folder.id
                ? "border-zinc-400 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
              }`}
          >
            {renamingFolderId === folder.id ? (
              <div className="p-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleRenameSubmit(folder.id);
                      } else if (e.key === "Escape") {
                        cancelRename();
                      }
                    }}
                    autoFocus
                    disabled={isRenaming}
                    className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => void handleRenameSubmit(folder.id)}
                    disabled={isRenaming}
                    className="rounded p-1 text-emerald-400 hover:bg-zinc-700 hover:text-emerald-300 disabled:opacity-50"
                    title="Save folder name"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    disabled={isRenaming}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {renameError && <p className="text-[10px] text-rose-400">{renameError}</p>}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSelectFolder(folder.id)}
                  className={`w-full text-left ${isCollapsed ? "px-1 py-2 text-center" : "px-3 py-2 pr-20"}`}
                  title={folder.name}
                >
                  {isCollapsed ? (
                    <div className="relative font-mono text-sm font-semibold text-zinc-100">
                      {folderShortName(folder.name)}
                      {folder.isPinned && (
                        <Pin className="absolute -top-1 -right-1 h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="truncate">{folder.name}</span>
                        {folder.isPinned && (
                          <Pin className="h-3 w-3 shrink-0 fill-emerald-400 text-emerald-400" />
                        )}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {new Date(folder.createdAt).toLocaleString()}
                      </div>
                    </>
                  )}
                </button>

                {!isCollapsed && (
                  <div className="absolute top-2 right-2 flex items-center gap-0.5">
                    {onTogglePinFolder && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onTogglePinFolder(folder.id, !folder.isPinned);
                        }}
                        className={`rounded-md p-1 transition ${
                          folder.isPinned
                            ? "text-emerald-400 opacity-100 hover:text-emerald-300"
                            : "text-zinc-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-zinc-200"
                        }`}
                        title={folder.isPinned ? "Unpin folder" : "Pin folder to top"}
                        aria-label={folder.isPinned ? `Unpin folder ${folder.name}` : `Pin folder ${folder.name}`}
                      >
                        <Pin
                          className={`h-3.5 w-3.5 ${
                            folder.isPinned ? "fill-emerald-400 text-emerald-400" : ""
                          }`}
                        />
                      </button>
                    )}

                    {onRenameFolder && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startRename(folder);
                        }}
                        className="rounded-md p-1 text-zinc-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition hover:text-zinc-200"
                        title="Rename folder"
                        aria-label={`Rename folder ${folder.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <AlertDialog
                      open={pendingDeleteFolder?.id === folder.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setPendingDeleteFolder(folder);
                          return;
                        }
                        if (!isDeletingFolder) {
                          setPendingDeleteFolder(null);
                        }
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md border border-transparent p-1 text-zinc-500 opacity-100 transition hover:border-zinc-700 hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100"
                          aria-label={`Delete folder ${folder.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete folder and all its notes?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &quot;{folder.name}&quot; and ALL notes inside it.
                            This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeletingFolder}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={isDeletingFolder}
                            onClick={(event) => {
                              event.preventDefault();
                              void handleDeleteFolder();
                            }}
                          >
                            {isDeletingFolder ? "Deleting..." : "Delete Everything"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
