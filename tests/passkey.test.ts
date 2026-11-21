import { describe, expect, it } from "vitest";
import { applyAlgo, validateAlgo, type PasskeyAlgo } from "@/lib/passkey";
import { generateRawKey, safeEqual } from "@/lib/auth";

describe("Passkey Algorithm Engine", () => {
  it("validates a well-formed passkey algorithm", () => {
    const algo: PasskeyAlgo = {
      keyLength: 8,
      chunks: [
        { from: 0, to: 3, reverse: true },
        { from: 4, to: 7, reverse: false },
      ],
      order: [1, 0],
    };

    const result = validateAlgo(algo);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects an algorithm with missing coverage", () => {
    const algo: PasskeyAlgo = {
      keyLength: 8,
      chunks: [{ from: 0, to: 3, reverse: false }],
      order: [0],
    };

    const result = validateAlgo(algo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("gap");
  });

  it("rejects an algorithm with overlapping chunks", () => {
    const algo: PasskeyAlgo = {
      keyLength: 8,
      chunks: [
        { from: 0, to: 4, reverse: false },
        { from: 4, to: 7, reverse: false },
      ],
      order: [0, 1],
    };

    const result = validateAlgo(algo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("overlap");
  });

  it("applies chunk transforms and reordering correctly", () => {
    // rawKey: "12345678"
    // chunk 0: "1234" -> reverse -> "4321"
    // chunk 1: "5678" -> no reverse -> "5678"
    // order [1, 0] -> "5678" + "4321" = "56784321"
    const algo: PasskeyAlgo = {
      keyLength: 8,
      chunks: [
        { from: 0, to: 3, reverse: true },
        { from: 4, to: 7, reverse: false },
      ],
      order: [1, 0],
    };

    const challenge = applyAlgo("12345678", algo);
    expect(challenge).toBe("56784321");
  });

  it("generates raw keys with the requested length", () => {
    const key = generateRawKey(10);
    expect(key.length).toBe(10);
    expect(typeof key).toBe("string");
  });

  it("safely compares keys with constant-time equality check", () => {
    expect(safeEqual("ABCDE", "ABCDE")).toBe(true);
    expect(safeEqual("ABCDE", "ABCDX")).toBe(false);
    expect(safeEqual("ABCDE", "ABCD")).toBe(false);
  });
});
