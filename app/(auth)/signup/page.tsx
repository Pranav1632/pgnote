import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <header className="mb-10 space-y-3">
          <p className="text-xs tracking-[0.26em] text-zinc-500 uppercase">pgnote / signup</p>
          <h1 className="text-3xl font-semibold tracking-tight">Create your private note space</h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-400">
            Set your permanent slug and your challenge algorithm. pgnote stores the algorithm
            structure only, not keys or passwords.
          </p>
        </header>

        <div className="rounded-md border border-[#333] bg-[#0d0d0d] p-5 md:p-6 lg:p-8">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
