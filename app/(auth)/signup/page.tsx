import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      <div className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-20 flex-col gap-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-zinc-700 bg-zinc-950/85 text-zinc-100 backdrop-blur"
        >
          <Link href="/">Home</Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-zinc-700 bg-zinc-950/85 text-zinc-100 backdrop-blur"
        >
          <Link href="/#open-slug">/{`{slug}`}</Link>
        </Button>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-8 md:py-16">
        <div className="mb-6 flex items-center justify-between md:hidden">
          <Link href="/" className="text-xs text-zinc-400 transition hover:text-zinc-200">
            ← Home
          </Link>
          <Link href="/#open-slug" className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
            /{`{slug}`}
          </Link>
        </div>
        <header className="mb-10 space-y-3">
          <p className="text-xs tracking-[0.26em] text-zinc-500 uppercase">pgnote / signup</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Create your private note space
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-400">
            Set your permanent slug and challenge algorithm. Recovery email is required, and you
            can optionally verify your own MongoDB database for notes and folders.
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 md:p-5">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Optional custom notes database
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            If verified, only folders and notes are stored in your MongoDB database. Account
            metadata still stays in pgnote&apos;s main database.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Use a URI with a database name and working read/write access. Verification helps during
            signup, but later network or permission changes can still stop note access.
          </p>
        </section>

        <div className="rounded-md border border-[#333] bg-[#0d0d0d] p-5 md:p-6 lg:p-8">
            <SignupForm />
          </div>
      </div>
    </main>
  );
}
