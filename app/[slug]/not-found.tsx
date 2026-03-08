import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SlugNotFoundPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-3 text-xs tracking-[0.28em] text-zinc-500 uppercase">pgnote / slug</p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">
          Slug Not Found
        </h1>
        <p className="mb-8 text-zinc-400">
          This slug does not exist, or access is not available.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Create New Slug</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
