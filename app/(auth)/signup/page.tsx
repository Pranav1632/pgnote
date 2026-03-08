import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#18181b_0%,#09090b_42%,#020617_100%)]" />
      <div className="absolute inset-0 opacity-25 [background:linear-gradient(120deg,transparent_0%,rgba(63,63,70,0.5)_45%,transparent_100%)]" />

      <div className="relative mx-auto w-full max-w-4xl px-6 py-12 md:py-16">
        <header className="mb-8 space-y-2">
          <p className="text-xs tracking-[0.28em] text-zinc-500 uppercase">pgnote / secure signup</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Create Your Private Note Space
          </h1>
          <p className="max-w-2xl text-zinc-400">
            Configure your personal challenge algorithm. No stored password, no recoverable secret.
            Your slug becomes your permanent path.
          </p>
        </header>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-2xl backdrop-blur md:p-8">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
