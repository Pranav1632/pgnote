import { describe, expect, it } from "vitest";
import {
  decryptNoteContent,
  encryptNoteContent,
  isEncryptedEnvelope,
} from "@/lib/crypto";

describe("Client-Side Zero-Knowledge Encryption (AES-GCM-256)", () => {
  const samplePasskey = "terminal-secret-key-98234-xyz";
  const noteContent = "Sensitive private key: 5K... confidential notes and thoughts.";

  it("identifies encrypted envelopes correctly", () => {
    expect(isEncryptedEnvelope("ENC:v1:abc:def:ghi")).toBe(true);
    expect(isEncryptedEnvelope("Normal unencrypted note content")).toBe(false);
    expect(isEncryptedEnvelope("")).toBe(false);
  });

  it("encrypts and decrypts content cleanly matching original text", async () => {
    const encrypted = await encryptNoteContent(noteContent, samplePasskey);

    expect(encrypted.startsWith("ENC:v1:")).toBe(true);
    expect(encrypted).not.toContain(noteContent);

    const decrypted = await decryptNoteContent(encrypted, samplePasskey);
    expect(decrypted).toBe(noteContent);
  });

  it("rejects decryption with an invalid passphrase", async () => {
    const encrypted = await encryptNoteContent(noteContent, samplePasskey);

    await expect(
      decryptNoteContent(encrypted, "wrong-passphrase-attempt")
    ).rejects.toThrow("Decryption failed");
  });

  it("rejects tampered or corrupted ciphertext (AES-GCM authentication tag failure)", async () => {
    const encrypted = await encryptNoteContent(noteContent, samplePasskey);
    const parts = encrypted.split(":");
    // Corrupt ciphertext in parts[4]
    const corruptedBase64 = parts[4].slice(0, -4) + "AAAA";
    const corruptedEnvelope = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:${corruptedBase64}`;

    await expect(
      decryptNoteContent(corruptedEnvelope, samplePasskey)
    ).rejects.toThrow();
  });

  it("gracefully returns legacy unencrypted content unchanged", async () => {
    const legacyContent = "Existing legacy unencrypted note";
    const result = await decryptNoteContent(legacyContent, samplePasskey);
    expect(result).toBe(legacyContent);
  });

  it("supports large notes up to 40,000+ characters with zero data loss", async () => {
    const largeNote = "A".repeat(40_000) + "\nSpecial Symbols: 🚀🔥§±~`!@#$%^&*()_+";
    const encrypted = await encryptNoteContent(largeNote, samplePasskey);

    expect(encrypted.length).toBeGreaterThan(40_000);
    const decrypted = await decryptNoteContent(encrypted, samplePasskey);
    expect(decrypted).toBe(largeNote);
    expect(decrypted.length).toBe(largeNote.length);
  });
});
