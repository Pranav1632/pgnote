import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/lib/markdown";

describe("Markdown Parser & Sanitizer", () => {
  it("escapes malicious raw HTML to prevent XSS", () => {
    const input = `<script>alert('xss')</script><img src="x" onerror="alert(1)" />`;
    const output = parseMarkdown(input);
    expect(output).not.toContain("<script>");
    expect(output).toContain("&lt;script&gt;");
    expect(output).not.toContain("<img");
    expect(output).toContain("&lt;img");
  });

  it("renders fenced code blocks with language indicators", () => {
    const input = "```typescript\nconst greeting: string = 'hello';\n```";
    const output = parseMarkdown(input);
    expect(output).toContain("<pre");
    expect(output).toContain("<code");
    expect(output).toContain("typescript");
    expect(output).toContain("const greeting: string = &#039;hello&#039;;");
  });

  it("renders markdown tables properly", () => {
    const input = `| Title | Status |\n|---|---|\n| Task 1 | Done |\n| Task 2 | In Progress |`;
    const output = parseMarkdown(input);
    expect(output).toContain("<table");
    expect(output).toContain("<th");
    expect(output).toContain("Title");
    expect(output).toContain("Task 1");
  });

  it("renders interactive checklists and strikethrough", () => {
    const input = `- [x] Completed task\n- [ ] Pending task\n~~deprecated~~`;
    const output = parseMarkdown(input);
    expect(output).toContain("Completed task");
    expect(output).toContain("Pending task");
    expect(output).toContain("<del");
    expect(output).toContain("deprecated</del>");
  });

  it("renders safe external links", () => {
    const input = `[Google](https://google.com)`;
    const output = parseMarkdown(input);
    expect(output).toContain('<a href="https://google.com"');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
  });
});
