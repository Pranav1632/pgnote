export interface ChunkConfig {
  from: number;
  to: number;
  reverse: boolean;
}

export interface PasskeyAlgo {
  keyLength: number;
  chunks: ChunkConfig[];
  order: number[];
}

export const MIN_KEY_LENGTH = 5;
export const MAX_KEY_LENGTH = 12;

export function validateAlgo(algo: PasskeyAlgo): { valid: boolean; error?: string } {
  if (!algo || typeof algo !== "object") {
    return { valid: false, error: "Algo must be an object." };
  }

  if (!Number.isInteger(algo.keyLength)) {
    return { valid: false, error: "Key length must be an integer." };
  }

  if (algo.keyLength < MIN_KEY_LENGTH || algo.keyLength > MAX_KEY_LENGTH) {
    return {
      valid: false,
      error: `Key length must be between ${MIN_KEY_LENGTH} and ${MAX_KEY_LENGTH}.`,
    };
  }

  if (!Array.isArray(algo.chunks) || algo.chunks.length === 0) {
    return { valid: false, error: "At least one chunk is required." };
  }

  if (!Array.isArray(algo.order) || algo.order.length !== algo.chunks.length) {
    return { valid: false, error: "Order must include each chunk exactly once." };
  }

  const coverage = new Array<number>(algo.keyLength).fill(0);

  for (let chunkIndex = 0; chunkIndex < algo.chunks.length; chunkIndex += 1) {
    const chunk = algo.chunks[chunkIndex];

    if (!Number.isInteger(chunk.from) || !Number.isInteger(chunk.to)) {
      return { valid: false, error: `Chunk ${chunkIndex + 1} indices must be integers.` };
    }

    if (typeof chunk.reverse !== "boolean") {
      return { valid: false, error: `Chunk ${chunkIndex + 1} reverse flag must be boolean.` };
    }

    if (chunk.from < 0 || chunk.to < 0 || chunk.from >= algo.keyLength || chunk.to >= algo.keyLength) {
      return {
        valid: false,
        error: `Chunk ${chunkIndex + 1} indices must be within 1 and ${algo.keyLength}.`,
      };
    }

    if (chunk.from > chunk.to) {
      return { valid: false, error: `Chunk ${chunkIndex + 1} has invalid range.` };
    }

    for (let position = chunk.from; position <= chunk.to; position += 1) {
      coverage[position] += 1;
      if (coverage[position] > 1) {
        return {
          valid: false,
          error: `Chunks overlap at position ${position + 1}.`,
        };
      }
    }
  }

  for (let position = 0; position < coverage.length; position += 1) {
    if (coverage[position] === 0) {
      return {
        valid: false,
        error: `Algo has a gap at position ${position + 1}.`,
      };
    }
  }

  const seenOrderEntries = new Set<number>();
  for (const orderIndex of algo.order) {
    if (!Number.isInteger(orderIndex)) {
      return { valid: false, error: "Order values must be integers." };
    }

    if (orderIndex < 0 || orderIndex >= algo.chunks.length) {
      return { valid: false, error: "Order contains an out-of-range chunk index." };
    }

    if (seenOrderEntries.has(orderIndex)) {
      return { valid: false, error: "Order contains duplicate chunk index." };
    }

    seenOrderEntries.add(orderIndex);
  }

  if (seenOrderEntries.size !== algo.chunks.length) {
    return { valid: false, error: "Order must include each chunk exactly once." };
  }

  return { valid: true };
}

export function applyAlgo(rawKey: string, algo: PasskeyAlgo): string {
  const validation = validateAlgo(algo);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid algo configuration.");
  }

  if (rawKey.length !== algo.keyLength) {
    throw new Error("Raw key length does not match algo keyLength.");
  }

  const transformedChunks = algo.chunks.map((chunk) => {
    const segment = rawKey.slice(chunk.from, chunk.to + 1);
    return chunk.reverse ? segment.split("").reverse().join("") : segment;
  });

  return algo.order.map((chunkIndex) => transformedChunks[chunkIndex]).join("");
}
