"use client";

import { useMemo, useState, type DragEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  applyAlgo,
  MAX_KEY_LENGTH,
  MIN_KEY_LENGTH,
  type ChunkConfig,
  validateAlgo,
} from "@/lib/passkey";

const SAMPLE_CHARS = "A1b2C3d4E5f6G7h8I9j0KLMNOPQRST";
const BUTTON_CLASS =
  "rounded-md border border-[#333] bg-black text-white transition hover:bg-[#111] disabled:opacity-50";

interface AlgoBuilderProps {
  keyLength: number;
  chunks: ChunkConfig[];
  order: number[];
  onKeyLengthChange: (nextKeyLength: number) => void;
  onChunksChange: (nextChunks: ChunkConfig[]) => void;
  onOrderChange: (nextOrder: number[]) => void;
  onRandomAlgoChange: (next: { keyLength: number; chunks: ChunkConfig[]; order: number[] }) => void;
}

interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (nextValue: number) => void;
  label: string;
  className?: string;
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

function clampIndex(value: number, keyLength: number): number {
  return Math.min(Math.max(0, value), Math.max(0, keyLength - 1));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    const current = next[index];
    next[index] = next[swapIndex] as T;
    next[swapIndex] = current as T;
  }
  return next;
}

function NumberStepper({
  value,
  min,
  max,
  onChange,
  label,
  className,
}: NumberStepperProps) {
  const clampedValue = Math.min(max, Math.max(min, value));

  const updateValue = (nextValue: number) => {
    onChange(Math.min(max, Math.max(min, nextValue)));
  };

  return (
    <div className={className}>
      <span className="mb-2 block text-xs font-medium tracking-wide text-zinc-400 uppercase">
        {label}
      </span>
      <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-stretch rounded-2xl border border-[#333] bg-black/80 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => updateValue(clampedValue - 1)}
          disabled={clampedValue <= min}
          className="flex min-h-14 items-center justify-center rounded-l-2xl border-r border-[#333] text-zinc-200 transition hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={clampedValue}
          aria-label={label}
          onChange={(event) => {
            const digitsOnly = event.target.value.replace(/\D/g, "");
            if (!digitsOnly) {
              onChange(min);
              return;
            }
            updateValue(Number(digitsOnly));
          }}
          className="min-w-0 bg-transparent px-2 text-center text-lg font-semibold text-zinc-100 outline-none"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => updateValue(clampedValue + 1)}
          disabled={clampedValue >= max}
          className="flex min-h-14 items-center justify-center rounded-r-2xl border-l border-[#333] text-zinc-200 transition hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function createRandomChunks(keyLength: number): ChunkConfig[] {
  const maxChunks = Math.min(5, keyLength);
  const chunkCount = randomInt(1, maxChunks);

  const cutPoints = new Set<number>();
  while (cutPoints.size < chunkCount - 1) {
    cutPoints.add(randomInt(1, keyLength - 1));
  }

  const sorted = [0, ...Array.from(cutPoints).sort((left, right) => left - right), keyLength];

  return Array.from({ length: chunkCount }, (_, index) => ({
    from: sorted[index] as number,
    to: ((sorted[index + 1] as number) - 1),
    reverse: Math.random() < 0.5,
  }));
}

export function AlgoBuilder({
  keyLength,
  chunks,
  order,
  onKeyLengthChange,
  onChunksChange,
  onOrderChange,
  onRandomAlgoChange,
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

  const transformedChunks = useMemo(
    () =>
      chunks.map((chunk) => {
        const segment = sampleRawKey.slice(chunk.from, chunk.to + 1);
        const transformed = chunk.reverse ? segment.split("").reverse().join("") : segment;
        return {
          segment,
          transformed,
        };
      }),
    [chunks, sampleRawKey]
  );

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

  const handleGenerateRandomAlgo = () => {
    const nextKeyLength = randomInt(MIN_KEY_LENGTH, MAX_KEY_LENGTH);
    const nextChunks = createRandomChunks(nextKeyLength);
    const nextOrder = shuffle(Array.from({ length: nextChunks.length }, (_, index) => index));

    onRandomAlgoChange({
      keyLength: nextKeyLength,
      chunks: nextChunks,
      order: nextOrder,
    });

    setDraftFrom(0);
    setDraftTo(Math.max(0, nextKeyLength - 1));
    setDraftReverse(false);
  };

  const copyPreviewChallenge = async () => {
    if (!algoValidation.valid || sampleChallenge === "--") {
      return;
    }

    try {
      await navigator.clipboard.writeText(sampleChallenge);
      toast.success("Challenge copied.");
    } catch {
      toast.error("Unable to copy challenge.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:max-w-sm">
          <label className="mb-2 block text-sm font-medium text-zinc-200">
            Key Length ({MIN_KEY_LENGTH}-{MAX_KEY_LENGTH})
          </label>
          <div className="space-y-3">
            <input
              type="range"
              min={MIN_KEY_LENGTH}
              max={MAX_KEY_LENGTH}
              value={keyLength}
              onChange={(event) => {
                const next = Number(event.target.value);
                onKeyLengthChange(next);
                setDraftTo(Math.max(0, next - 1));
              }}
              className="w-full accent-[#0070f3]"
            />
            <NumberStepper
              value={keyLength}
              min={MIN_KEY_LENGTH}
              max={MAX_KEY_LENGTH}
              label="Length"
              className="w-full"
              onChange={(next) => {
                onKeyLengthChange(next);
                setDraftTo(Math.max(0, next - 1));
              }}
            />
          </div>
        </div>

        <Button
          type="button"
          className={`${BUTTON_CLASS} w-full md:w-auto`}
          onClick={handleGenerateRandomAlgo}
        >
          Generate random algo for me
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
            Chunk Builder
          </h3>

          <div className="space-y-3 rounded-md border border-[#333] bg-[#0b0b0b] p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberStepper
                value={draftFrom + 1}
                min={1}
                max={keyLength}
                label="From"
                onChange={(next) => {
                  setDraftFrom(clampIndex(next - 1, keyLength));
                }}
                className="w-full"
              />
              <NumberStepper
                value={draftTo + 1}
                min={1}
                max={keyLength}
                label="To"
                onChange={(next) => {
                  setDraftTo(clampIndex(next - 1, keyLength));
                }}
                className="w-full"
              />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={draftReverse}
                onChange={(event) => setDraftReverse(event.target.checked)}
                className="h-4 w-4 accent-[#0070f3]"
              />
              Reverse chunk 
            </label>
            <Button type="button" className={`${BUTTON_CLASS} w-full`} onClick={addChunk}>
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
                className="space-y-3 rounded-md border border-[#333] bg-[#0b0b0b] p-3"
              >
                <div className="text-xs tracking-wide text-zinc-400 uppercase">Chunk {index + 1}</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <NumberStepper
                    value={chunk.from + 1}
                    min={1}
                    max={keyLength}
                    label="From"
                    onChange={(next) => {
                      updateChunk(index, {
                        ...chunk,
                        from: clampIndex(next - 1, keyLength),
                      });
                    }}
                    className="w-full"
                  />
                  <NumberStepper
                    value={chunk.to + 1}
                    min={1}
                    max={keyLength}
                    label="To"
                    onChange={(next) => {
                      updateChunk(index, {
                        ...chunk,
                        to: clampIndex(next - 1, keyLength),
                      });
                    }}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={chunk.reverse}
                      onChange={(event) =>
                        updateChunk(index, {
                          ...chunk,
                          reverse: event.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-[#0070f3]"
                    />
                    Reverse
                  </label>
                  <Button
                    type="button"
                    size="xs"
                    className={`${BUTTON_CLASS} w-full sm:w-auto`}
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
          <h3 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
            Display Order
          </h3>
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
                  className="cursor-move rounded-md border border-[#333] bg-[#0b0b0b] p-3 text-sm text-zinc-200"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Slot {orderIndex + 1} -&gt; Chunk {chunkIndex + 1}
                    </span>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-1">
                      <Button
                        type="button"
                        size="xs"
                        className={`${BUTTON_CLASS} w-full sm:w-auto`}
                        disabled={orderIndex === 0}
                        onClick={() => onOrderChange(reorder(order, orderIndex, orderIndex - 1))}
                      >
                        Up
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        className={`${BUTTON_CLASS} w-full sm:w-auto`}
                        disabled={orderIndex === order.length - 1}
                        onClick={() => onOrderChange(reorder(order, orderIndex, orderIndex + 1))}
                      >
                        Down
                      </Button>
                    </div>
                  </div>
                  {chunk && (
                    <div className="mt-1 text-xs text-zinc-400">
                      [{chunk.from + 1}-{chunk.to + 1}] {chunk.reverse ? "reversed" : "normal"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 rounded-md border border-[#333] bg-[#0b0b0b] p-3">
            <p className="text-xs tracking-wide text-zinc-400 uppercase">What This Algo Does</p>
            {chunks.length === 0 && <p className="text-sm text-zinc-400">Add chunks to see explanation.</p>}
            {chunks.map((chunk, index) => {
              const transformed = transformedChunks[index];
              if (!transformed) {
                return null;
              }
              return (
                <p key={`explain-${index}`} className="text-sm text-zinc-300">
                  Chunk {index + 1}: Take characters {chunk.from + 1}-{chunk.to + 1},{" "}
                  {chunk.reverse ? "reverse them" : "keep order"} -&gt;{" "}
                  <span className="font-mono text-zinc-100">{transformed.transformed}</span>
                </p>
              );
            })}
            {order.length > 0 && (
              <p className="text-sm text-zinc-300">
                Display order:{" "}
                <span className="font-mono text-zinc-100">
                  {order.map((chunkIndex) => `Chunk ${chunkIndex + 1}`).join(" -> ")}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-md border border-[#333] bg-[#0b0b0b] p-3 font-mono text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs tracking-wide text-zinc-400 uppercase">Live Preview</p>
              <Button
                type="button"
                size="xs"
                className={`${BUTTON_CLASS} w-full sm:w-auto`}
                onClick={copyPreviewChallenge}
              >
                Copy Challenge
              </Button>
            </div>
            <p className="text-zinc-300">
              Raw Key: <span className="text-zinc-100">{sampleRawKey}</span>
            </p>
            <p className="text-zinc-300">
              Challenge: <span className="text-emerald-300">{sampleChallenge}</span>
            </p>
            {!algoValidation.valid && (
              <p className="text-rose-400">{algoValidation.error ?? "Invalid algo configuration."}</p>
            )}
          </div>
        </div>
      </div>

      <details className="rounded-md border border-[#333] bg-[#0b0b0b] p-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-200">How this works</summary>
        <div className="mt-3 space-y-2 text-sm text-zinc-300">
          <p>1. Server shows you the CHALLENGE string.</p>
          <p>2. You mentally reverse your algo steps to decode it.</p>
          <p>3. You type the ORIGINAL raw key to login.</p>
          <div className="rounded-md border border-[#333] bg-black p-3 font-mono text-xs text-zinc-300">
            <p>Example raw key: {sampleRawKey}</p>
            <p>Displayed challenge: {sampleChallenge}</p>
            <p>Login response you type: {sampleRawKey}</p>
          </div>
        </div>
      </details>
    </div>
  );
}
