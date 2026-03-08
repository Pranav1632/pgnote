"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import debounce from "debounce";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AlgoBuilder } from "@/components/auth/algo-builder";
import { type ChunkConfig, validateAlgo } from "@/lib/passkey";

const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{2,31}$/;

const signupFormSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        SLUG_REGEX,
        "Slug must be 3-32 chars and only use lowercase letters, numbers, underscore, or hyphen."
      ),
    keyLength: z.number().int().min(8).max(14),
    recoveryEmail: z
      .string()
      .trim()
      .email("Enter a valid email.")
      .optional()
      .or(z.literal("")),
    sessionTimeoutPreset: z.enum(["2", "5", "10", "30", "custom"]),
    customSessionTimeout: z.number().int().min(1).max(1440).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.sessionTimeoutPreset === "custom" && !value.customSessionTimeout) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customSessionTimeout"],
        message: "Custom timeout is required.",
      });
    }
  });

type SignupFormValues = z.infer<typeof signupFormSchema>;

type SlugAvailabilityState =
  | { status: "idle"; message: string }
  | { status: "checking"; message: string }
  | { status: "available"; message: string }
  | { status: "taken"; message: string }
  | { status: "error"; message: string };

export function SignupForm() {
  const router = useRouter();
  const [chunks, setChunks] = useState<ChunkConfig[]>([{ from: 0, to: 7, reverse: false }]);
  const [order, setOrder] = useState<number[]>([0]);
  const [slugAvailability, setSlugAvailability] = useState<SlugAvailabilityState>({
    status: "idle",
    message: "Pick your permanent URL slug.",
  });
  const [algoError, setAlgoError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormValues>({
    defaultValues: {
      slug: "",
      keyLength: 8,
      recoveryEmail: "",
      sessionTimeoutPreset: "10",
      customSessionTimeout: 15,
    },
    mode: "onSubmit",
  });

  const slugValue = useWatch({ control: form.control, name: "slug" }) ?? "";
  const keyLength = useWatch({ control: form.control, name: "keyLength" }) ?? 8;
  const timeoutPreset = useWatch({ control: form.control, name: "sessionTimeoutPreset" }) ?? "10";

  const debouncedSlugCheck = useMemo(
    () =>
      debounce(async (rawSlug: string) => {
        const normalized = rawSlug.trim().toLowerCase();

        if (!SLUG_REGEX.test(normalized)) {
          setSlugAvailability({
            status: "idle",
            message: "Slug must be 3-32 chars using lowercase letters, numbers, _ or -.",
          });
          return;
        }

        setSlugAvailability({ status: "checking", message: "Checking slug availability..." });

        try {
          const response = await fetch("/api/user/slug-check", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ slug: normalized }),
          });

          if (!response.ok) {
            setSlugAvailability({
              status: "error",
              message: "Unable to check slug right now.",
            });
            return;
          }

          const payload = (await response.json()) as {
            success?: boolean;
            data?: { available?: boolean };
          };

          if (!payload.success || typeof payload.data?.available !== "boolean") {
            setSlugAvailability({
              status: "error",
              message: "Unable to check slug right now.",
            });
            return;
          }

          if (payload.data.available) {
            setSlugAvailability({
              status: "available",
              message: "Slug is available.",
            });
          } else {
            setSlugAvailability({
              status: "taken",
              message: "Slug is already taken.",
            });
          }
        } catch {
          setSlugAvailability({
            status: "error",
            message: "Unable to check slug right now.",
          });
        }
      }, 450),
    []
  );

  useEffect(() => {
    debouncedSlugCheck(slugValue);
    return () => {
      debouncedSlugCheck.clear();
    };
  }, [slugValue, debouncedSlugCheck]);

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    setAlgoError(null);
    form.clearErrors();
    setIsSubmitting(true);

    const parsedValues = signupFormSchema.safeParse({
      ...values,
      slug: values.slug.trim().toLowerCase(),
      recoveryEmail: values.recoveryEmail?.trim() ?? "",
    });

    if (!parsedValues.success) {
      for (const issue of parsedValues.error.issues) {
        const fieldName = issue.path[0];
        if (
          fieldName === "slug" ||
          fieldName === "keyLength" ||
          fieldName === "recoveryEmail" ||
          fieldName === "sessionTimeoutPreset" ||
          fieldName === "customSessionTimeout"
        ) {
          form.setError(fieldName, { type: "manual", message: issue.message });
        } else {
          setServerError(issue.message);
        }
      }
      setIsSubmitting(false);
      return;
    }

    const timeoutMinutes =
      parsedValues.data.sessionTimeoutPreset === "custom"
        ? parsedValues.data.customSessionTimeout ?? 0
        : Number(parsedValues.data.sessionTimeoutPreset);

    const algo = {
      keyLength: parsedValues.data.keyLength,
      chunks,
      order,
    };

    const validation = validateAlgo(algo);
    if (!validation.valid) {
      setAlgoError(validation.error ?? "Invalid algo configuration.");
      setIsSubmitting(false);
      return;
    }

    if (slugAvailability.status === "taken") {
      setServerError("Slug is already taken. Choose another slug.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: parsedValues.data.slug,
          algo,
          sessionTimeout: timeoutMinutes,
          recoveryEmail: parsedValues.data.recoveryEmail
            ? parsedValues.data.recoveryEmail.trim().toLowerCase()
            : undefined,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { redirectTo?: string };
        message?: string;
      };

      if (!response.ok || !payload.success || !payload.data?.redirectTo) {
        setServerError(payload.message ?? "Unable to create account.");
        setIsSubmitting(false);
        return;
      }

      router.push(payload.data.redirectTo);
    } catch {
      setServerError("Unable to create account.");
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-zinc-200">Slug</label>
          <div className="flex overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
            <span className="px-3 py-2 text-zinc-500">/</span>
            <input
              {...form.register("slug")}
              placeholder="rahul"
              autoComplete="off"
              className="w-full bg-transparent px-1 py-2 text-zinc-100 outline-none placeholder:text-zinc-500"
            />
          </div>
          {form.formState.errors.slug && (
            <p className="mt-1 text-sm text-rose-400">{form.formState.errors.slug.message}</p>
          )}
          <p
            className={`mt-1 text-sm ${
              slugAvailability.status === "available"
                ? "text-emerald-400"
                : slugAvailability.status === "taken"
                  ? "text-rose-400"
                  : "text-zinc-400"
            }`}
          >
            {slugAvailability.message}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Recovery Email (optional)</label>
          <input
            type="email"
            {...form.register("recoveryEmail")}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
          />
          {form.formState.errors.recoveryEmail && (
            <p className="mt-1 text-sm text-rose-400">{form.formState.errors.recoveryEmail.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Session Timeout</label>
          <select
            {...form.register("sessionTimeoutPreset")}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-400"
          >
            <option value="2">2 minutes</option>
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="30">30 minutes</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {timeoutPreset === "custom" && (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-200">Custom Timeout (minutes)</label>
            <input
              type="number"
              min={1}
              max={1440}
              {...form.register("customSessionTimeout", {
                setValueAs: (value) => {
                  if (value === "" || value === null || value === undefined) {
                    return undefined;
                  }
                  return Number(value);
                },
              })}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-400"
            />
            {form.formState.errors.customSessionTimeout && (
              <p className="mt-1 text-sm text-rose-400">
                {form.formState.errors.customSessionTimeout.message}
              </p>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">Passkey Algo Builder</h2>
        <AlgoBuilder
          keyLength={keyLength}
          chunks={chunks}
          order={order}
          onKeyLengthChange={(next) => {
            form.setValue("keyLength", next, { shouldDirty: true, shouldValidate: true });
            setChunks((previousChunks) => {
              if (previousChunks.length === 1 && previousChunks[0]?.from === 0) {
                return [{ ...previousChunks[0], to: Math.max(0, next - 1) }];
              }

              return previousChunks.map((chunk) => ({
                ...chunk,
                from: Math.min(chunk.from, Math.max(0, next - 1)),
                to: Math.min(chunk.to, Math.max(0, next - 1)),
              }));
            });
          }}
          onChunksChange={setChunks}
          onOrderChange={setOrder}
        />
        {algoError && <p className="mt-2 text-sm text-rose-400">{algoError}</p>}
      </section>

      <section className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
        <p className="text-sm text-amber-200">
          Algo is your only auth. We store nothing recoverable. If you forget your method, you
          cannot recover access with certainty.
        </p>
      </section>

      {serverError && <p className="text-sm text-rose-400">{serverError}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  );
}
