"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{2,31}$/;

export function SlugAccessForm() {
  const router = useRouter();
  const [slugInput, setSlugInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedSlug = slugInput.trim().toLowerCase();
    if (!SLUG_REGEX.test(normalizedSlug)) {
      setErrorMessage("Enter a valid slug (3-32 chars, lowercase letters/numbers/_/-).");
      return;
    }

    setErrorMessage(null);
    router.push(`/${normalizedSlug}`);
  };

  return (
    <form id="open-slug" onSubmit={handleSubmit} className="mt-6 w-full max-w-md space-y-2">
      <label htmlFor="quick-slug" className="block text-left text-sm text-zinc-300">
        Open your slug
      </label>
      <div className="flex overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
        <span className="px-3 py-2 text-zinc-500">/</span>
        <input
          id="quick-slug"
          value={slugInput}
          onChange={(event) => setSlugInput(event.target.value)}
          autoComplete="off"
          placeholder="your-slug"
          className="w-full bg-transparent px-1 py-2 text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        <Button type="submit" size="sm" className="m-1">
          Go
        </Button>
      </div>
      {errorMessage && <p className="text-left text-sm text-rose-400">{errorMessage}</p>}
    </form>
  );
}
