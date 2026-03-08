import { notFound, redirect } from "next/navigation";
import { NotesDashboard } from "@/components/notes/notes-dashboard";
import { requireValidSession } from "@/lib/session";

const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{2,31}$/;

interface NotesPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function NotesPage({ params }: NotesPageProps) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams.slug ?? "";
  const normalizedSlug = rawSlug.trim().toLowerCase();

  if (!SLUG_REGEX.test(normalizedSlug)) {
    notFound();
  }

  if (rawSlug !== normalizedSlug) {
    redirect(`/${normalizedSlug}/notes`);
  }

  const session = await requireValidSession(normalizedSlug);
  if (!session) {
    redirect(`/${normalizedSlug}`);
  }

  return (
    <NotesDashboard
      slug={normalizedSlug}
      timeoutMinutes={session.timeoutMinutes}
      initialLoginAt={session.loginAt}
    />
  );
}
