import { type PasskeyAlgo } from "@/lib/passkey";

export interface AlgoDescription {
  keyLengthLine: string;
  chunkLines: string[];
  displayOrderLine: string;
  closingLine: string;
}

export function describeAlgo(algo: PasskeyAlgo): AlgoDescription {
  const chunkLines = algo.chunks.map((chunk, index) => {
    const reverseLabel = chunk.reverse ? "reversed" : "not reversed";
    return `Chunk ${index + 1}: positions ${chunk.from + 1}-${chunk.to + 1}, ${reverseLabel}`;
  });

  const displayOrder = algo.order.map((chunkIndex) => `Chunk ${chunkIndex + 1}`).join(" -> ");

  return {
    keyLengthLine: `Key Length: ${algo.keyLength}`,
    chunkLines,
    displayOrderLine: `Display order: ${displayOrder}`,
    closingLine: "When you see the challenge, reverse this to get the raw key.",
  };
}

export function describeAlgoAsMultilineText(algo: PasskeyAlgo): string {
  const description = describeAlgo(algo);
  return [
    description.keyLengthLine,
    ...description.chunkLines,
    description.displayOrderLine,
    description.closingLine,
  ].join("\n");
}
