"use client";

import { type ClipboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { SaveStatus, type SaveStatusState } from "@/components/notes/save-status";

interface BashTextAreaProps {
  value: string;
  onChange: (nextValue: string) => void;
  onSave: () => void;
  isSaving: boolean;
  saveState: SaveStatusState;
  autosaveSeconds: number | null;
  lastSavedAt: number | null;
  disabled?: boolean;
}

export function BashTextArea({
  value,
  onChange,
  onSave,
  isSaving,
  saveState,
  autosaveSeconds,
  lastSavedAt,
  disabled = false,
}: BashTextAreaProps) {
  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    const pastedText = event.clipboardData.getData("text");
    const target = event.currentTarget;
    const selectionStart = target.selectionStart ?? value.length;
    const selectionEnd = target.selectionEnd ?? value.length;

    const nextValue =
      value.slice(0, selectionStart) + pastedText + value.slice(selectionEnd);
    onChange(nextValue);

    const nextCaretPosition = selectionStart + pastedText.length;
    requestAnimationFrame(() => {
      target.selectionStart = nextCaretPosition;
      target.selectionEnd = nextCaretPosition;
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/70 p-4 shadow-[0_0_0_1px_rgba(39,39,42,0.35)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs tracking-[0.22em] text-zinc-500 uppercase">Bash Editor</p>
        <div className="flex items-center gap-2">
          <SaveStatus state={saveState} autosaveSeconds={autosaveSeconds} lastSavedAt={lastSavedAt} />
          <Button type="button" size="xs" variant="outline" onClick={onSave} disabled={disabled || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPaste={handlePaste}
        spellCheck={false}
        disabled={disabled}
        placeholder="$ paste your private notes here..."
        className="min-h-[280px] w-full resize-y rounded-xl border border-zinc-800 bg-black px-4 py-3 font-mono text-sm leading-6 text-emerald-400 outline-none placeholder:text-emerald-700 focus:border-emerald-700"
      />
    </div>
  );
}
