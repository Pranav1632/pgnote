import Link from "next/link";
import { SlugAccessForm } from "@/components/auth/slug-access-form";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-3 text-xs tracking-[0.28em] text-zinc-500 uppercase">pgnote</p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">Secure Personal Notes</h1>
        <p className="mb-8 max-w-2xl text-zinc-400">
          Passwordless challenge-based login with your own algorithm. Start by creating your slug and
          auth pattern.
        </p>
        <Button asChild size="lg">
          <Link href="/signup">Go To Signup</Link>
        </Button>
        <SlugAccessForm />
      </div>
    </main>
  );
}
