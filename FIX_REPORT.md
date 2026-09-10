# Fix Report
**Date:** April 3, 2026, 20:55 IST  
**Model:** Google DeepMind Antigravity AI (M37 Variant)

## 1. Fixed Next.js Server Component Cookie Error
**Error:** `Error: Cookies can only be modified in a Server Action or Route Handler.` \
**File Updated:** `lib/session.ts` \
**Details:** The `requireValidSession()` and `requireSession()` helpers were calling `session.destroy()` when an expired session was detected. Since the app relies on Next.js App Router and Server Components (`app/[slug]/page.tsx`), attempting to forcefully destroy cookies during the Server Render phase threw errors. 

**Solution:** Removed the `session.destroy()` call. The system now safely returns `null` when the session is expired without aggressively attempting to modify the browser cookie on the backend. Your new login naturally overwrites the stale cookie.

## 2. Fixed Custom MongoDB 503 Timeout Issues
**Error:** `GET /api/folders 503 in 47s` and `Your custom MongoDB database is unavailable. Notes and folders stay in your database only, so pgnote cannot load or save them until that connection works again.` \
**File Updated:** `lib/note-storage.ts` \
**Details:** While modifying the `Note` model locally (`models/Note.ts`), Next.js fast-refreshed (HMR). This severed the existing connections to your custom MongoDB, but the backend's Global Cache (`globalThis.customNoteStorageConnectionCache`) was still holding onto the original `connectionPromise`. Mongoose was attempting to run queries over these dead/orphaned sockets, leading to them hanging eternally until hitting the absolute socket timeout (`45,000ms`, rendering as `~47s`).

**Solution:** 
- Added an automatic "dead connection" detector before assigning the cached connection. 
- If `readyState !== 1` (Not Connected), the code explicitly calls `await cacheEntry.connection.close()` and drops the old reference.
- Then, it immediately spins up a brand new healthy connection so no manual server restart is necessary after editing files. Error logging was also added on the catch block for visibility during `pnpm dev`.
