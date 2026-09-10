import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { getNoteStorageContextForUser } from "@/lib/note-storage";
import { UserModel } from "@/models/User";

const SHARE_ID_REGEX = /^([a-z0-9][a-z0-9_-]{2,31})\.([a-z0-9]{18})$/;

interface PublicNotePageProps {
  params: Promise<{
    shareId: string;
  }>;
}

function extractTitle(content: string): string {
  const firstLine = content.split("\n")[0]?.trim() ?? "";
  if (firstLine.length === 0) return "Shared Note";
  return firstLine.length > 80 ? `${firstLine.slice(0, 80)}...` : firstLine;
}

export default async function PublicNotePage({ params }: PublicNotePageProps) {
  const resolvedParams = await params;
  const rawShareId = resolvedParams.shareId ?? "";
  const normalizedShareId = rawShareId.trim().toLowerCase();

  if (rawShareId !== normalizedShareId) {
    redirect(`/public/${normalizedShareId}`);
  }

  const match = SHARE_ID_REGEX.exec(normalizedShareId);
  if (!match) {
    notFound();
  }

  const slug = match[1];
  const shareToken = match[2];

  await connectToDatabase();
  const user = await UserModel.findOne({ slug }).select("_id").lean();
  if (!user) {
    notFound();
  }

  const userId = String(user._id);
  const noteStorage = await getNoteStorageContextForUser(userId);
  const sharedNote = await noteStorage.noteModel
    .findOne({
      userId,
      shareToken,
      isPublic: true,
    })
    .select("content updatedAt")
    .lean();

  if (!sharedNote) {
    notFound();
  }

  const updatedAt = new Date(sharedNote.updatedAt).toLocaleString();

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-2xl sm:p-6">
        <div className="mb-5 border-b border-zinc-800 pb-4">
          <p className="text-xs tracking-[0.2em] text-zinc-500 uppercase">pgnote public note</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-100">{extractTitle(sharedNote.content)}</h1>
          <p className="mt-2 text-xs text-zinc-500">Shared by /{slug} | Updated {updatedAt}</p>
        </div>

        <article className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black/40 p-4 font-mono text-sm leading-7 text-emerald-300/95">
          {sharedNote.content}
        </article>

        <div className="mt-5 text-xs text-zinc-500">
          <Link href={`/${slug}`} className="text-emerald-300 hover:text-emerald-200">
            Open pgnote
          </Link>
        </div>
      </div>
    </main>
  );
}
