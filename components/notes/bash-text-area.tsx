"use client";

import { type ClipboardEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

interface BashTextAreaProps {
  value: string;
  onChange: (nextValue: string) => void;
  onSave: () => void;
  isSaving: boolean;
  disabled?: boolean;
}

export function BashTextArea({
  value,
  onChange,
  onSave,
  isSaving,
  disabled = false,
}: BashTextAreaProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      onSave();
    }
  };

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
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs tracking-[0.22em] text-zinc-500 uppercase">Bash Editor</p>
        <Button type="button" size="xs" variant="outline" onClick={onSave} disabled={disabled || isSaving}>
          {isSaving ? "Saving..." : "Save (Ctrl+S)"}
        </Button>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        spellCheck={false}
        disabled={disabled}
        placeholder="$ paste your private notes here..."
        className="min-h-[280px] w-full resize-y rounded-xl border border-zinc-800 bg-black px-4 py-3 font-mono text-sm leading-6 text-emerald-400 outline-none placeholder:text-emerald-700 focus:border-emerald-700"
      />
    </div>
  );
}
