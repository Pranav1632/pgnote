import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      <div className="fixed right-4 bottom-4 z-20 flex flex-col gap-2 md:top-1/2 md:bottom-auto md:-translate-y-1/2">
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

      <div className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <header className="mb-10 space-y-3">
          <p className="text-xs tracking-[0.26em] text-zinc-500 uppercase">pgnote / signup</p>
          <h1 className="text-3xl font-semibold tracking-tight">Create your private note space</h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-400">
            Set your permanent slug and your challenge algorithm. pgnote stores the algorithm
            structure only, not keys or passwords.
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 md:p-5">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Optional custom notes database
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            You can paste a verified MongoDB URI during signup if you want your folders and notes
            stored in your own MongoDB database instead of pgnote&apos;s managed one.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Account metadata still stays in pgnote&apos;s main database: slug, recovery email, login
            algorithm structure, session timeout, and last login activity.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Use a URI that includes a database name and a database user with read/write access.
            Keep the URI secret. If your MongoDB later becomes unreachable, note loading and saving
            will pause until the connection works again.
          </p>
        </section>

        <div className="rounded-md border border-[#333] bg-[#0d0d0d] p-5 md:p-6 lg:p-8">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
