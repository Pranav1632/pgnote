"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
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
}: FolderSidebarProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState<FolderDTO | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

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
    <aside className="h-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-2">
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
              <div className="flex gap-2">
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
        {folders.length === 0 && !isCollapsed && (
          <p className="text-sm text-zinc-400">No folders yet. Create one to start taking notes.</p>
        )}

        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`group relative rounded-xl border transition ${
              activeFolderId === folder.id
                ? "border-zinc-400 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={`w-full text-left ${isCollapsed ? "px-1 py-2 text-center" : "px-3 py-2"}`}
              title={folder.name}
            >
              {isCollapsed ? (
                <div className="font-mono text-sm font-semibold text-zinc-100">
                  {folderShortName(folder.name)}
                </div>
              ) : (
                <>
                  <div className="font-medium">{folder.name}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {new Date(folder.createdAt).toLocaleString()}
                  </div>
                </>
              )}
            </button>

            {!isCollapsed && (
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
                    className="absolute top-2 right-2 rounded-md border border-transparent p-1 text-zinc-500 opacity-0 transition hover:border-zinc-700 hover:text-rose-300 group-hover:opacity-100"
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
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
