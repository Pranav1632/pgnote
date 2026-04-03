"use client";

import { type ClipboardEvent, useEffect, useRef, useState, useMemo } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
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

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

function renderSimpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-zinc-100 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-zinc-100 mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-zinc-100 mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-100">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-zinc-800 px-1 py-0.5 text-emerald-300 text-xs">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-zinc-300">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-zinc-300">$2</li>')
    .replace(/\n/g, "<br />");
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const wordCount = useMemo(() => countWords(value), [value]);
  const charCount = value.length;

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text");
    const target = event.currentTarget;
    const selectionStart = target.selectionStart ?? value.length;
    const selectionEnd = target.selectionEnd ?? value.length;
    const nextValue = value.slice(0, selectionStart) + pastedText + value.slice(selectionEnd);
    onChange(nextValue);
    const nextCaretPosition = selectionStart + pastedText.length;
    requestAnimationFrame(() => {
      target.selectionStart = nextCaretPosition;
      target.selectionEnd = nextCaretPosition;
    });
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard", { duration: 1500 });
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!disabled && !isSaving) onSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, disabled, isSaving]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-black/70 shadow-[0_0_0_1px_rgba(39,39,42,0.35)]">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <p className="text-xs tracking-[0.22em] text-zinc-500 uppercase">Editor</p>
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-400 transition hover:border-emerald-700 hover:text-emerald-300"
            title={showPreview ? "Show editor" : "Preview markdown"}
          >
            {showPreview ? (
              <>
                <EyeOff className="h-3 w-3" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                Preview
              </>
            )}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyAll()}
            disabled={disabled || value.length === 0}
            className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-400 transition hover:border-emerald-700 hover:text-emerald-300 disabled:opacity-40"
            title="Copy all content"
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
          <SaveStatus state={saveState} autosaveSeconds={autosaveSeconds} lastSavedAt={lastSavedAt} />
          <Button type="button" size="xs" variant="outline" onClick={onSave} disabled={disabled || isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="relative min-h-0 flex-1">
        {showPreview ? (
          <div
            className="h-full overflow-y-auto px-4 py-3 font-mono text-sm leading-7 text-emerald-400/90"
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(value) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onPaste={handlePaste}
            spellCheck={false}
            disabled={disabled}
            placeholder="$ paste your private notes here..."
            className="h-full w-full resize-none rounded-none border-none bg-transparent px-4 py-3 font-mono text-sm leading-7 text-emerald-400 outline-none placeholder:text-emerald-800 focus:ring-0"
          />
        )}
      </div>

      {/* Status bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-zinc-800/60 px-4 py-1.5">
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span>{wordCount} words</span>
          <span className="text-zinc-700">|</span>
          <span>{charCount} chars</span>
        </div>
        <div className="text-[10px] text-zinc-600">
          <kbd className="rounded border border-zinc-700 px-1 py-0.5 text-zinc-500">Ctrl+S</kbd> save
        </div>
      </div>
    </div>
  );
}
