"use client";

import {
  type ClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  Bold,
  Code,
  Copy,
  Download,
  Eye,
  EyeOff,
  Hash,
  Italic,
  List,
  ListTodo,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SaveStatus, type SaveStatusState } from "@/components/notes/save-status";
import { parseMarkdown } from "@/lib/markdown";
import { isEncryptedEnvelope } from "@/lib/crypto";

interface BashTextAreaProps {
  value: string;
  onChange: (nextValue: string) => void;
  onSave: () => void;
  onExport?: () => void;
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

export function BashTextArea({
  value,
  onChange,
  onSave,
  isSaving,
  saveState,
  autosaveSeconds,
  lastSavedAt,
  onExport,
  disabled = false,
}: BashTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const wordCount = useMemo(() => countWords(value), [value]);
  const charCount = value.length;
  const lines = useMemo(() => value.split("\n"), [value]);
  const lineCount = Math.max(1, lines.length);

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

  const wrapSelection = (before: string, after: string = before, placeholder = "") => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = value.slice(start, end) || placeholder;

    const nextValue = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    });
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    // 1. Tab key: insert 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(nextValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
      return;
    }

    // 2. Auto-closing pairs: (), [], {}, "", '', ``
    const pairs: Record<string, string> = {
      "(": ")",
      "[": "]",
      "{": "}",
      '"': '"',
      "'": "'",
      "`": "`",
    };

    if (pairs[e.key] && textarea.selectionStart === textarea.selectionEnd) {
      const start = textarea.selectionStart;
      const closeChar = pairs[e.key];
      const nextValue = value.substring(0, start) + e.key + closeChar + value.substring(start);
      e.preventDefault();
      onChange(nextValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      });
      return;
    }

    // 3. Enter key on list items: auto-continue lists
    if (e.key === "Enter") {
      const start = textarea.selectionStart;
      const currentLine = value.substring(0, start).split("\n").pop() ?? "";

      const taskMatch = /^- \[([ x])\]\s+/i.exec(currentLine);
      const listMatch = /^-\s+/.exec(currentLine);

      if (taskMatch) {
        if (currentLine.trim() === "- [ ]" || currentLine.trim() === "- [x]") {
          // Empty item, cancel list on Enter
          e.preventDefault();
          const lineStart = start - currentLine.length;
          const nextValue = value.substring(0, lineStart) + value.substring(start);
          onChange(nextValue);
          return;
        }
        e.preventDefault();
        const nextValue = value.substring(0, start) + "\n- [ ] " + value.substring(start);
        onChange(nextValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 7;
        });
        return;
      }

      if (listMatch) {
        if (currentLine.trim() === "-") {
          e.preventDefault();
          const lineStart = start - currentLine.length;
          const nextValue = value.substring(0, lineStart) + value.substring(start);
          onChange(nextValue);
          return;
        }
        e.preventDefault();
        const nextValue = value.substring(0, start) + "\n- " + value.substring(start);
        onChange(nextValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 3;
        });
        return;
      }
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!disabled && !isSaving) onSave();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onSave, disabled, isSaving]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-black/70 shadow-[0_0_0_1px_rgba(39,39,42,0.35)]">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800/60 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <p className="hidden text-xs tracking-[0.22em] text-zinc-500 uppercase md:inline">Editor</p>

          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900/50 px-2 py-1 text-[10px] font-medium text-zinc-300 transition hover:border-emerald-600 hover:text-emerald-300"
            title={showPreview ? "Show editor" : "Preview markdown"}
          >
            {showPreview ? (
              <>
                <EyeOff className="h-3 w-3 text-emerald-400" />
                <span>Edit</span>
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 text-zinc-400" />
                <span>Preview</span>
              </>
            )}
          </button>

          {!showPreview && (
            <div className="hidden items-center gap-0.5 border-l border-zinc-800 pl-1.5 sm:flex">
              <button
                type="button"
                onClick={() => wrapSelection("**", "**", "bold text")}
                className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection("*", "*", "italic text")}
                className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection("`", "`", "code")}
                className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                title="Inline Code"
              >
                <Code className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection("```bash\n", "\n```", "#!/bin/bash")}
                className="rounded px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 transition hover:bg-zinc-800 hover:text-emerald-300"
                title="Code Block"
              >
                &lt;/&gt;
              </button>
              <button
                type="button"
                onClick={() => wrapSelection("- ", "", "List item")}
                className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                title="Bullet List"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection("- [ ] ", "", "Task")}
                className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                title="Checklist Item"
              >
                <ListTodo className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowLineNumbers((prev) => !prev)}
                className={`rounded p-1 text-zinc-400 transition hover:bg-zinc-800 ${showLineNumbers ? "text-emerald-400" : ""}`}
                title="Toggle Line Numbers"
              >
                <Hash className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => void handleCopyAll()}
            disabled={disabled || value.length === 0}
            className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-400 transition hover:border-emerald-700 hover:text-emerald-300 disabled:opacity-40"
            title="Copy all content"
          >
            <Copy className="h-3 w-3" />
            <span className="hidden sm:inline">Copy</span>
          </button>
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              disabled={disabled || value.length === 0}
              className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-400 transition hover:border-emerald-700 hover:text-emerald-300 disabled:opacity-40"
              title="Export note as .md"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          {/* Client-Side Encryption Indicator */}
          <div
            className={`hidden items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-mono transition lg:flex ${
              isEncryptedEnvelope(value)
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-400"
            }`}
            title={
              isEncryptedEnvelope(value)
                ? "E2EE: Zero-knowledge AES-GCM-256 encrypted payload"
                : "Zero-Knowledge client passkey protected"
            }
          >
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>{isEncryptedEnvelope(value) ? "AES-GCM" : "E2EE"}</span>
          </div>

          <SaveStatus state={saveState} autosaveSeconds={autosaveSeconds} lastSavedAt={lastSavedAt} />
          <Button type="button" size="xs" variant="outline" onClick={onSave} disabled={disabled || isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {showPreview ? (
          <div
            className="h-full w-full overflow-y-auto px-4 py-3 font-mono text-base leading-7 text-emerald-400/90 md:text-sm"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(value) }}
          />
        ) : (
          <div className="flex h-full w-full overflow-hidden">
            {/* Line numbers gutter */}
            {showLineNumbers && (
              <div
                aria-hidden="true"
                className="hidden select-none border-r border-zinc-800/80 bg-zinc-950/40 px-2.5 py-3 text-right font-mono text-xs text-zinc-700 sm:block"
                style={{ minWidth: "3rem" }}
              >
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i + 1} className="leading-7">
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              spellCheck={false}
              disabled={disabled}
              placeholder="$ paste your private notes here..."
              className="h-full w-full resize-none rounded-none border-none bg-transparent px-4 py-3 font-mono text-base leading-7 text-emerald-400 outline-none placeholder:text-emerald-800 focus:ring-0 md:text-sm"
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-zinc-800/60 px-3 py-1.5 sm:px-4">
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span>{lineCount} lines</span>
          <span className="text-zinc-700">|</span>
          <span>{wordCount} words</span>
          <span className="text-zinc-700">|</span>
          <span>{charCount} chars</span>
        </div>
        <div className="text-[10px] text-zinc-600">
          <span className="hidden sm:inline">
            <kbd className="rounded border border-zinc-700 px-1 py-0.5 text-zinc-500">Tab</kbd> indent · <kbd className="rounded border border-zinc-700 px-1 py-0.5 text-zinc-500">Ctrl+S</kbd> save
          </span>
          <span className="text-[10px] text-zinc-500 sm:hidden">
            {saveState === "saved" ? "✓ Saved" : saveState === "saving" ? "Saving..." : "Unsaved"}
          </span>
        </div>
      </div>
    </div>
  );
}
