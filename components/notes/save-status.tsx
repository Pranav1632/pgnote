"use client";

export type SaveStatusState = "saved" | "saving" | "unsaved";

interface SaveStatusProps {
  state: SaveStatusState;
  autosaveSeconds: number | null;
  lastSavedAt: number | null;
}

function formatSavedTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function SaveStatus({ state, autosaveSeconds, lastSavedAt }: SaveStatusProps) {
  if (state === "saving") {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
        Saving...
      </div>
    );
  }

  if (state === "unsaved") {
    return (
      <div className="rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-xs text-zinc-300">
        Unsaved{typeof autosaveSeconds === "number" ? ` | Autosave in ${autosaveSeconds}s` : ""}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
      Saved{lastSavedAt ? ` | ${formatSavedTime(lastSavedAt)}` : ""}
    </div>
  );
}
