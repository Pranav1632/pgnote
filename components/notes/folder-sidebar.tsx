"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FolderDTO } from "@/types";

interface FolderSidebarProps {
  folders: FolderDTO[];
  activeFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string) => Promise<void>;
}

export function FolderSidebar({
  folders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
}: FolderSidebarProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  return (
    <aside className="h-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">Folders</h2>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => {
            setShowCreateForm((previous) => !previous);
            setCreateError(null);
          }}
        >
          New Folder
        </Button>
      </div>

      {showCreateForm && (
        <div className="mb-4 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
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

      <div className="space-y-2">
        {folders.length === 0 && (
          <p className="text-sm text-zinc-400">No folders yet. Create one to start taking notes.</p>
        )}

        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => onSelectFolder(folder.id)}
            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
              activeFolderId === folder.id
                ? "border-zinc-400 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
            }`}
          >
            <div className="font-medium">{folder.name}</div>
            <div className="mt-1 text-xs text-zinc-500">
              {new Date(folder.createdAt).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
