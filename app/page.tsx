import Link from "next/link";
import { SlugAccessForm } from "@/components/auth/slug-access-form";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-32 right-0 h-80 w-80 rounded-full bg-orange-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-14">
        <p className="mb-4 text-xs tracking-[0.32em] text-zinc-500 uppercase">pgnote</p>

        <h1 className="max-w-4xl text-4xl leading-tight font-semibold tracking-tight text-zinc-100 md:text-6xl">
          Your notes.
          <span className="ml-3 bg-gradient-to-r from-cyan-300 via-emerald-300 to-orange-300 bg-clip-text text-transparent">
            Your slug.
          </span>
          <br />
          No stored password.
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">
          pgnote is a personal note-pasting app with challenge-based login. You create your own algo
          once, then login with your slug route every time.
        </p>

        <p className="mt-3 max-w-3xl text-sm text-zinc-400 md:text-base">
          Example: if your slug is <span className="font-mono text-cyan-300">pranav</span>, open{" "}
          <span className="font-mono text-emerald-300">/pranav</span> to reach your challenge screen,
          then unlock and continue at <span className="font-mono text-orange-300">/pranav/notes</span>.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Create Slug</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signup">How Setup Works</Link>
          </Button>
        </div>

        <SlugAccessForm />

        <section className="mt-10 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <p className="text-xs tracking-[0.2em] text-cyan-200 uppercase">Route 1</p>
            <p className="mt-2 font-mono text-cyan-100">/signup</p>
            <p className="mt-2 text-sm text-zinc-300">
              Pick your slug and define your login algo. This is your one-time setup.
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-xs tracking-[0.2em] text-emerald-200 uppercase">Route 2</p>
            <p className="mt-2 font-mono text-emerald-100">/{`{slug}`}</p>
            <p className="mt-2 text-sm text-zinc-300">
              Enter your slug route, solve your challenge, and authenticate securely.
            </p>
          </article>

          <article className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
            <p className="text-xs tracking-[0.2em] text-orange-200 uppercase">Route 3</p>
            <p className="mt-2 font-mono text-orange-100">/{`{slug}`}/notes</p>
            <p className="mt-2 text-sm text-zinc-300">
              Write, paste, and autosave notes inside your private folders dashboard.
            </p>
          </article>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">Aim</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Build a private notes space where your login is based on your slug + personal algo.
              pgnote stores your algo config, not a traditional password.
            </p>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">How Saving Works</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
              <li>Autosave runs 5 seconds after your last text change.</li>
              <li>Every new edit resets that 5s autosave countdown.</li>
              <li>You can also click the Save button anytime.</li>
              <li>Status shows Unsaved, Saving, and Saved with save time.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              Session Timeout
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
              <li>Timeout is selected during signup (2/5/10/30/custom minutes).</li>
              <li>Countdown starts at login and keeps running.</li>
              <li>Typing, mouse movement, and saves do not extend session time.</li>
              <li>You get a warning ~30s before auto-logout.</li>
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
