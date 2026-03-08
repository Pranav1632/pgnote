"use client";

import { useMemo, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { applyAlgo, type ChunkConfig, validateAlgo } from "@/lib/passkey";

const SAMPLE_CHARS = "A1b2C3d4E5f6G7h8I9j0KLMNOPQRST";

interface AlgoBuilderProps {
  keyLength: number;
  chunks: ChunkConfig[];
  order: number[];
  onKeyLengthChange: (nextKeyLength: number) => void;
  onChunksChange: (nextChunks: ChunkConfig[]) => void;
  onOrderChange: (nextOrder: number[]) => void;
}

function reorder<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function buildSampleKey(length: number): string {
  return Array.from({ length }, (_, index) => SAMPLE_CHARS[index % SAMPLE_CHARS.length]).join("");
}

export function AlgoBuilder({
  keyLength,
  chunks,
  order,
  onKeyLengthChange,
  onChunksChange,
  onOrderChange,
}: AlgoBuilderProps) {
  const [draftFrom, setDraftFrom] = useState(0);
  const [draftTo, setDraftTo] = useState(Math.max(0, keyLength - 1));
  const [draftReverse, setDraftReverse] = useState(false);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  const algo = useMemo(
    () => ({
      keyLength,
      chunks,
      order,
    }),
    [keyLength, chunks, order]
  );

  const algoValidation = useMemo(() => validateAlgo(algo), [algo]);
  const sampleRawKey = useMemo(() => buildSampleKey(keyLength), [keyLength]);
  const sampleChallenge = useMemo(() => {
    if (!algoValidation.valid) {
      return "--";
    }
    try {
      return applyAlgo(sampleRawKey, algo);
    } catch {
      return "--";
    }
  }, [algo, algoValidation.valid, sampleRawKey]);

  const addChunk = () => {
    if (!Number.isInteger(draftFrom) || !Number.isInteger(draftTo)) {
      return;
    }

    const nextChunks = [
      ...chunks,
      {
        from: draftFrom,
        to: draftTo,
        reverse: draftReverse,
      },
    ];

    onChunksChange(nextChunks);
    onOrderChange([...order, nextChunks.length - 1]);
  };

  const removeChunk = (chunkIndex: number) => {
    const nextChunks = chunks.filter((_, index) => index !== chunkIndex);
    const nextOrder = order
      .filter((index) => index !== chunkIndex)
      .map((index) => (index > chunkIndex ? index - 1 : index));

    onChunksChange(nextChunks);
    onOrderChange(nextOrder);
  };

  const updateChunk = (chunkIndex: number, nextChunk: ChunkConfig) => {
    const nextChunks = chunks.map((chunk, index) => (index === chunkIndex ? nextChunk : chunk));
    onChunksChange(nextChunks);
  };

  const handleOrderDrop = (dropIndex: number) => {
    if (dragSourceIndex === null || dragSourceIndex === dropIndex) {
      return;
    }
    onOrderChange(reorder(order, dragSourceIndex, dropIndex));
    setDragSourceIndex(null);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-[0_0_0_1px_rgba(63,63,70,0.3)]">
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="min-w-44 flex-1">
          <label className="mb-2 block text-sm font-medium text-zinc-200">Key Length (8-14)</label>
          <input
            type="range"
            min={8}
            max={14}
            value={keyLength}
            onChange={(event) => {
              const next = Number(event.target.value);
              onKeyLengthChange(next);
              setDraftTo(Math.max(0, next - 1));
            }}
            className="w-full accent-zinc-100"
          />
        </div>
        <input
          type="number"
          min={8}
          max={14}
          value={keyLength}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isNaN(next)) {
              return;
            }
            onKeyLengthChange(Math.min(14, Math.max(8, next)));
          }}
          className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-zinc-400 focus:outline-none"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
            Chunk Definitions
          </h3>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                max={keyLength - 1}
                value={draftFrom}
                onChange={(event) => setDraftFrom(Number(event.target.value))}
                placeholder="from"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-zinc-400 focus:outline-none"
              />
              <input
                type="number"
                min={0}
                max={keyLength - 1}
                value={draftTo}
                onChange={(event) => setDraftTo(Number(event.target.value))}
                placeholder="to"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-zinc-400 focus:outline-none"
              />
            </div>
            <label className="mb-3 flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={draftReverse}
                onChange={(event) => setDraftReverse(event.target.checked)}
                className="h-4 w-4 accent-zinc-100"
              />
              Reverse chunk
            </label>
            <Button type="button" variant="outline" className="w-full" onClick={addChunk}>
              Add Chunk
            </Button>
          </div>

          <div className="space-y-2">
            {chunks.length === 0 && (
              <p className="text-sm text-zinc-400">No chunks yet. Add at least one chunk.</p>
            )}
            {chunks.map((chunk, index) => (
              <div
                key={`${index}-${chunk.from}-${chunk.to}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
              >
                <div className="mb-2 text-xs tracking-wide text-zinc-400 uppercase">
                  Chunk {index + 1}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    max={keyLength - 1}
                    value={chunk.from}
                    onChange={(event) =>
                      updateChunk(index, {
                        ...chunk,
                        from: Number(event.target.value),
                      })
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-zinc-400 focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    max={keyLength - 1}
                    value={chunk.to}
                    onChange={(event) =>
                      updateChunk(index, {
                        ...chunk,
                        to: Number(event.target.value),
                      })
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={chunk.reverse}
                      onChange={(event) =>
                        updateChunk(index, {
                          ...chunk,
                          reverse: event.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-zinc-100"
                    />
                    Reverse
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs text-zinc-300 hover:text-zinc-100"
                    onClick={() => removeChunk(index)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">Display Order</h3>
          <div className="space-y-2">
            {order.map((chunkIndex, orderIndex) => {
              const chunk = chunks[chunkIndex];
              return (
                <div
                  key={`order-${chunkIndex}-${orderIndex}`}
                  draggable
                  onDragStart={() => setDragSourceIndex(orderIndex)}
                  onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
                  onDrop={() => handleOrderDrop(orderIndex)}
                  className="cursor-move rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-sm text-zinc-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      Slot {orderIndex + 1} {"->"} Chunk {chunkIndex + 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        disabled={orderIndex === 0}
                        onClick={() => onOrderChange(reorder(order, orderIndex, orderIndex - 1))}
                      >
                        Up
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        disabled={orderIndex === order.length - 1}
                        onClick={() => onOrderChange(reorder(order, orderIndex, orderIndex + 1))}
                      >
                        Down
                      </Button>
                    </div>
                  </div>
                  {chunk && (
                    <div className="mt-1 text-xs text-zinc-400">
                      [{chunk.from}-{chunk.to}] {chunk.reverse ? "reversed" : "normal"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 font-mono text-sm">
            <div className="mb-2 text-xs tracking-wide text-zinc-400 uppercase">Live Preview</div>
            <p className="text-zinc-400">
              Raw Key: <span className="text-zinc-100">{sampleRawKey}</span>
            </p>
            <p className="mt-1 text-zinc-400">
              Challenge: <span className="text-emerald-400">{sampleChallenge}</span>
            </p>
            {!algoValidation.valid && (
              <p className="mt-2 text-rose-400">{algoValidation.error ?? "Invalid algo configuration."}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
