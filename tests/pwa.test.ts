import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Progressive Web App (PWA) & Service Worker", () => {
  it("has a valid web manifest with proper icons and display modes", () => {
    const manifestPath = path.resolve(process.cwd(), "public/manifest.webmanifest");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifestContent.name).toBe("PGNote - Terminal Workspace");
    expect(manifestContent.short_name).toBe("PGNote");
    expect(manifestContent.display).toBe("standalone");
    expect(manifestContent.start_url).toBe("/");
    expect(manifestContent.background_color).toBe("#0a0a0a");
    expect(manifestContent.theme_color).toBe("#0a0a0a");
    expect(Array.isArray(manifestContent.icons)).toBe(true);
    expect(manifestContent.icons.length).toBeGreaterThanOrEqual(2);
  });

  it("provides valid SVG icons referenced by manifest", () => {
    const icon192 = path.resolve(process.cwd(), "public/icons/icon-192.svg");
    const icon512 = path.resolve(process.cwd(), "public/icons/icon-512.svg");

    expect(fs.existsSync(icon192)).toBe(true);
    expect(fs.existsSync(icon512)).toBe(true);

    const content192 = fs.readFileSync(icon192, "utf-8");
    expect(content192).toContain("<svg");
    expect(content192).toContain('viewBox="0 0 192 192"');
  });

  it("verifies service worker security policies (never caches /api/ endpoints)", () => {
    const swPath = path.resolve(process.cwd(), "public/sw.js");
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, "utf-8");
    // Explicit security rule: API calls must bypass cache
    expect(swContent).toContain('url.pathname.startsWith("/api/")');
    // Precache shell
    expect(swContent).toContain("STATIC_ASSETS");
    // Skip waiting and claim
    expect(swContent).toContain("self.skipWaiting()");
    expect(swContent).toContain("self.clients.claim()");
  });
});
