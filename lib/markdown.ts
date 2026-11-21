/**
 * Advanced terminal-aesthetic Markdown parser & sanitizer
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function parseMarkdown(rawText: string): string {
  if (!rawText) return "";

  // 1. First escape raw HTML
  let html = escapeHtml(rawText);

  // 2. Fenced code blocks ```lang ... ```
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langLabel = lang ? `<div class="border-b border-zinc-800 bg-zinc-900/80 px-3 py-1 font-mono text-[10px] text-zinc-400 uppercase">${escapeHtml(lang)}</div>` : "";
    return `<div class="my-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">${langLabel}<pre class="overflow-x-auto p-3 text-xs font-mono text-emerald-300"><code>${code.trimEnd()}</code></pre></div>`;
  });

  // Handle unclosed or inline backtick blocks
  html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre class="my-3 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs font-mono text-emerald-300"><code>${code.trimEnd()}</code></pre>`;
  });

  // 3. Tables: | col1 | col2 |
  html = html.replace(
    /(?:^|\n)(\|.+?\|\n\|[-: ]+?\|[\s\S]*?)(?=\n\n|$)/g,
    (_match, tableContent) => {
      const lines = tableContent.trim().split("\n");
      if (lines.length < 2) return tableContent;

      const headerCells = lines[0]
        .split("|")
        .slice(1, -1)
        .map((cell: string) => `<th class="border-b border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-left text-xs font-semibold text-zinc-200">${cell.trim()}</th>`)
        .join("");

      const rows = lines
        .slice(2)
        .map((row: string) => {
          const cells = row
            .split("|")
            .slice(1, -1)
            .map((c: string) => `<td class="border-b border-zinc-800 px-3 py-1.5 text-xs text-zinc-300">${c.trim()}</td>`)
            .join("");
          return `<tr class="hover:bg-zinc-900/30">${cells}</tr>`;
        })
        .join("");

      return `<div class="my-3 overflow-x-auto rounded-lg border border-zinc-800"><table class="w-full border-collapse"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
  );

  // 4. Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-emerald-500/70 pl-3 my-2 text-zinc-400 italic bg-zinc-900/20 py-1 rounded-r">$1</blockquote>');

  // 5. Headings
  html = html
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-zinc-100 mt-4 mb-1 tracking-tight">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-zinc-100 mt-5 mb-1 tracking-tight border-b border-zinc-800/80 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-zinc-100 mt-6 mb-2 tracking-tight border-b border-zinc-800 pb-1.5">$1</h1>');

  // 6. Checklists
  html = html
    .replace(/^- \[x\] (.+)$/gim, '<div class="flex items-center gap-2 text-zinc-500 line-through my-1 text-xs"><span class="flex h-3.5 w-3.5 items-center justify-center rounded border border-emerald-500/60 bg-emerald-950/40 text-[9px] text-emerald-400">✓</span><span>$1</span></div>')
    .replace(/^- \[ \] (.+)$/gim, '<div class="flex items-center gap-2 text-zinc-200 my-1 text-xs"><span class="flex h-3.5 w-3.5 items-center justify-center rounded border border-zinc-700 bg-zinc-900"></span><span>$1</span></div>');

  // 7. Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-4 border-zinc-800" />');

  // 8. Bold, Italic, Strikethrough, Inline Code
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-100 font-semibold">$1</strong>')
    .replace(/~~(.+?)~~/g, '<del class="text-zinc-500 line-through">$1</del>')
    .replace(/\*(.+?)\*/g, '<em class="text-zinc-300 italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-zinc-800/90 px-1.5 py-0.5 text-emerald-300 text-xs font-mono border border-zinc-700/50">$1</code>');

  // 9. Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-400 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-300">$1</a>');

  // 10. Unordered & Ordered Lists
  html = html
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-zinc-300 text-xs">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-zinc-300 text-xs">$2</li>');

  // 11. Preserved line breaks
  return html.replace(/\n/g, "<br />");
}
