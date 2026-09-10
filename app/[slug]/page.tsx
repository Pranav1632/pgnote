import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChallengeLoginForm } from "@/components/auth/challenge-login-form";
import { Button } from "@/components/ui/button";
import { connectToDatabase } from "@/lib/db";
import { requireValidSession } from "@/lib/session";
import { UserModel } from "@/models/User";

const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{2,31}$/;

interface SlugLoginPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function SlugLoginPage({ params }: SlugLoginPageProps) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams.slug ?? "";
  const normalizedSlug = rawSlug.trim().toLowerCase();

  if (!SLUG_REGEX.test(normalizedSlug)) {
    notFound();
  }

  if (rawSlug !== normalizedSlug) {
    redirect(`/${normalizedSlug}`);
  }

  await connectToDatabase();
  const slugExists = await UserModel.exists({ slug: normalizedSlug });
  if (!slugExists) {
    notFound();
  }

  const activeSession = await requireValidSession(normalizedSlug);
  if (activeSession) {
    redirect(`/${normalizedSlug}/notes`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
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
          <Link href="/signup">/signup</Link>
        </Button>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#18181b_0%,#09090b_50%,#020617_100%)]" />
      <div className="absolute inset-0 opacity-30 [background:linear-gradient(130deg,transparent_0%,rgba(63,63,70,0.55)_42%,transparent_100%)]" />

      <div className="relative mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 flex items-center justify-between md:hidden">
          <Link href="/" className="text-xs text-zinc-400 transition hover:text-zinc-200">
            ← Home
          </Link>
          <Link href="/signup" className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
            /signup
          </Link>
        </div>
        <header className="mb-8 space-y-2">
          <p className="text-xs tracking-[0.28em] text-zinc-500 uppercase">pgnote / challenge login</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">/{normalizedSlug}</h1>
          <p className="text-zinc-400">Use your algorithm-generated challenge to access your notes.</p>
          <p className="text-sm text-zinc-500">
            Recovery mail is sent only to the email registered for this slug.
          </p>
        </header>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/55 p-5 shadow-2xl backdrop-blur md:p-8">
          <ChallengeLoginForm slug={normalizedSlug} />
        </div>
      </div>
    </main>
  );
}
