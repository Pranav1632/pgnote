import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  Folders,
  KeyRound,
  MailCheck,
  NotebookPen,
  Route,
} from "lucide-react";
import { SlugAccessForm } from "@/components/auth/slug-access-form";
import { Button } from "@/components/ui/button";

const flowSteps = [
  {
    route: "/signup",
    title: "Create Your Slug Space",
    description: "Set your slug, required recovery email, session timeout, and challenge algorithm.",
    accent: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100",
  },
  {
    route: "/{slug}",
    title: "Unlock With Your Challenge",
    description: "Open your slug route, solve the generated challenge, and recover only through the registered email.",
    accent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  },
  {
    route: "/{slug}/notes",
    title: "Write Inside Your Private Workspace",
    description: "Use folders, autosave, manual save, and session-aware note editing inside the dashboard.",
    accent: "border-orange-500/30 bg-orange-500/10 text-orange-100",
  },
];

const stackDetails = [
  {
    title: "Custom MongoDB Storage",
    description:
      "A user can attach their own MongoDB URI during signup so only note and folder data lives in their database instead of the app owner's database.",
    icon: Database,
  },
  {
    title: "Own Challenge Algo",
    description:
      "Instead of a normal saved password screen, each account uses its own challenge-building algorithm and key-length rules.",
    icon: KeyRound,
  },
  {
    title: "Slug Based Private Entry",
    description:
      "Every user gets a route like /pranav, solves the challenge there, and then enters the notes workspace from that personal path.",
    icon: Route,
  },
  {
    title: "Recovery + Session Guardrails",
    description:
      "Recovery mail goes only to the registered email, while the notes area keeps the session timeout visible during editing.",
    icon: MailCheck,
  },
];

const latestWork = [
  {
    title: "Recovery tightened",
    description:
      "Recovery email is now required at signup, checked for reuse, and forgot-password sends only to the stored account email.",
    icon: MailCheck,
  },
  {
    title: "Custom note database",
    description:
      "Users can verify an optional MongoDB URI at signup so only note and folder data live in their own database.",
    icon: Database,
  },
  {
    title: "Own note workspace",
    description:
      "The notes area supports folders, autosave, manual save, delete flows, and clearer session-aware editing states.",
    icon: Folders,
  },
  {
    title: "Timeout-aware security",
    description:
      "Session countdown, warnings, and slug-based challenge login make the app act like a private controlled workspace.",
    icon: Clock3,
  },
];

const formExample = [
  {
    label: "Slug",
    value: "/pranav",
    description: "This becomes the public route used to open the challenge screen.",
  },
  {
    label: "Recovery Email",
    value: "pranav@example.com",
    description: "Only this email receives forgot-password recovery details for the slug.",
  },
  {
    label: "Key Length",
    value: "8",
    description: "The challenge uses an 8-character key before chunk rules are applied.",
  },
  {
    label: "Algo Example",
    value: "0-2 normal, 3-5 reverse, 6-7 normal",
    description: "A memorable pattern that the user rebuilds while logging in through /pranav.",
  },
  {
    label: "Session Timeout",
    value: "10 minutes",
    description: "After login, the notes session stays active only for the configured time.",
  },
  {
    label: "Custom MongoDB URI",
    value: "mongodb+srv://user:pass@cluster.net/pranav_notes?...",
    description: "Optional. If verified, only folders and notes move to Pranav's own database.",
  },
];

const differentiators = [
  {
    title: "Why this app exists",
    description:
      "pgnote is for users who want a personal note workspace with more control than a basic password form. It combines slug routes, a custom challenge pattern, recovery rules, and note storage choices in one flow.",
    icon: NotebookPen,
  },
  {
    title: "What makes it different",
    description:
      "The app separates account metadata from content storage. Slug, email, algo structure, and session rules stay in the main system, while notes and folders can live in the user's own MongoDB database.",
    icon: Database,
  },
  {
    title: "How login feels",
    description:
      "Instead of typing a normal password into one screen, the user opens their slug page, sees a challenge, applies their own remembered algo, and then unlocks notes from there.",
    icon: KeyRound,
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="fixed right-4 bottom-4 z-20 flex flex-col gap-2 md:top-1/2 md:bottom-auto md:-translate-y-1/2">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-zinc-700 bg-zinc-950/85 text-zinc-100 backdrop-blur"
        >
          <Link href="/signup">/signup</Link>
        </Button>
      </div>

      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-32 right-0 h-80 w-80 rounded-full bg-orange-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(39,39,42,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(39,39,42,0.35)_1px,transparent_1px)] [background-size:30px_30px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.03))]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:px-8 md:py-24">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
            <p className="mb-4 text-xs tracking-[0.32em] text-zinc-500 uppercase">pgnote  overview</p>

            <h1 className="max-w-4xl text-4xl leading-tight font-semibold tracking-tight text-zinc-100 md:text-6xl">
              Private notes with
              <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-orange-300 bg-clip-text text-transparent">
                slug-based challenge access
              </span>
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">
              pgnote is our personal note-pasting workspace where login is based on a slug, a
              challenge flow, and a user-defined algorithm instead of a normal stored password.
            </p>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
              It is built for private note access with stronger personalization: custom route,
              custom challenge logic, required recovery email, optional custom MongoDB storage, and
              a workspace that stays focused on folders and notes after login.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button asChild size="lg" className="sm:min-w-[168px]">
                <Link href="/signup">Create Your Slug</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="sm:min-w-[168px]">
                <Link href="#project-flow">See App Flow</Link>
              </Button>
            </div>

            <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs tracking-[0.24em] text-zinc-500 uppercase">Open Your Workspace</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    Already configured a slug? Jump into its challenge screen here.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>flow</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>unlock</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>notes</span>
                </div>
              </div>
              <SlugAccessForm />
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-[1.75rem] border border-cyan-500/20 bg-linear-to-br from-cyan-500/10 via-zinc-950/90 to-zinc-950/90 p-5">
              <p className="text-xs tracking-[0.22em] text-cyan-200 uppercase">What We Have Now</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {latestWork.map(({ title, description, icon: Icon }) => (
                  <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <div className="h-10 md:h-16" />

        <section id="project-flow" className="mt-12 rounded-[2rem] border border-zinc-800 bg-zinc-900/55 p-5 sm:p-6 md:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.28em] text-zinc-500 uppercase">app Flow</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
                Clear route flow with a more guided entry path
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-zinc-400">
              The app is now easier to explain: setup once, unlock through the slug route, then work
              inside the notes dashboard with recovery and storage controls already in place.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
            {flowSteps.map((step, index) => (
              <div key={step.route} className="contents">
                <article className={`rounded-2xl border p-4 ${step.accent}`}>
                  <p className="text-xs tracking-[0.22em] uppercase">Step {index + 1}</p>
                  <p className="mt-3 font-mono text-sm">{step.route}</p>
                  <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{step.description}</p>
                </article>
                {index < flowSteps.length - 1 && (
                  <div className="flex items-center justify-center py-1 text-zinc-500">
                    <ArrowDown className="h-5 w-5 md:hidden" />
                    <ArrowRight className="hidden h-5 w-5 md:block" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="h-10 md:h-20" />

        <section className="mt-12 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[2rem] border border-zinc-800 bg-zinc-900/55 p-5 sm:p-6">
            <p className="text-xs tracking-[0.26em] text-zinc-500 uppercase">Why pgnote</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
              A note app with route identity and storage choice
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-300">
              <p>
                pgnote is useful when a user wants a private note area that does more than a common
                email-password setup. The slug becomes part of the experience, the algo becomes part
                of memory, and the notes space becomes tied to that personal entry flow.
              </p>
              <p>
                The biggest difference is choice. A user can keep notes in pgnote&apos;s managed database
                or connect their own MongoDB database for note and folder storage, while account
                metadata still stays safely in the main app database.
              </p>
              <p>
                This makes the product feel closer to a personal controlled workspace than a normal
                shared notes website.
              </p>
            </div>
          </article>

          <div className="grid gap-5 sm:grid-cols-2">
            {stackDetails.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-[1.6rem] border border-zinc-800 bg-zinc-900/55 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-zinc-700 bg-black/40 p-2 text-zinc-100">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="h-12 md:h-20" />

        <section className="mt-12 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-zinc-800 bg-zinc-900/55 p-5 sm:p-6 md:p-7">
            <p className="text-xs tracking-[0.26em] text-zinc-500 uppercase">Algo Walkthrough</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
              How a user can remember their own algo
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-zinc-300">
              <p>
                Suppose Pranav chooses key length <span className="font-mono text-zinc-100">8</span>
                {" "}and sets chunk rules like{" "}
                <span className="font-mono text-cyan-300">0-2 normal, 3-5 reverse, 6-7 normal</span>.
              </p>
              <p>
                When the login challenge appears on <span className="font-mono text-zinc-100">/pranav</span>,
                the app shows the generated sequence and Pranav applies the same remembered chunk order
                and reverse rules to respond correctly.
              </p>
              <p>
                This gives each user a personal logic pattern instead of one flat password string,
                which is a major part of what makes pgnote different.
              </p>
            </div>
          </article>

          <div className="grid gap-4">
            {differentiators.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-[1.6rem] border border-zinc-800 bg-zinc-900/55 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-zinc-700 bg-black/40 p-2 text-zinc-100">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="h-12 md:h-24" />

        <section className="mt-12 rounded-[2rem] border border-zinc-800 bg-zinc-900/55 p-5 sm:p-6 md:p-7">
          <p className="text-xs tracking-[0.26em] text-zinc-500 uppercase">Feature Summary</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
            What the app gives to each user
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Personal slug route like /pranav",
              "Required unique recovery email",
              "Own challenge algo for login",
              "Optional personal MongoDB note storage",
              "Folders and note management",
              "Session timeout awareness",
              "Forgot-password mail only to registered email",
              "Mobile-friendly notes workspace",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <p className="text-sm leading-6 text-zinc-300">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="h-12 md:h-20" />

        <section className="mt-12 rounded-[2rem] border border-zinc-800 bg-zinc-900/55 p-5 sm:p-6 md:p-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs tracking-[0.26em] text-zinc-500 uppercase">Signup Example</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
                Example setup for <span className="font-mono text-cyan-300">/pranav</span>
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400">
              This is the kind of setup a real user might create while filling the signup form.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {formExample.map(({ label, value, description }) => (
              <article key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <p className="text-xs tracking-[0.2em] text-zinc-500 uppercase">{label}</p>
                <p className="mt-3 break-all rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 font-mono text-sm text-zinc-100">
                  {value}
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="h-20 md:h-32" />
      </div>
    </main>
  );
}
