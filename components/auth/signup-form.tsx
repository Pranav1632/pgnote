"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import debounce from "debounce";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { AlgoBuilder } from "@/components/auth/algo-builder";
import { Button } from "@/components/ui/button";
import { hasMongoDatabaseName, MONGO_URI_REGEX } from "@/lib/mongo-uri-format";
import {
  MAX_KEY_LENGTH,
  MIN_KEY_LENGTH,
  type ChunkConfig,
  validateAlgo,
} from "@/lib/passkey";

const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{2,31}$/;
const EMAIL_SCHEMA = z.string().trim().email("Enter a valid email.");
const CUSTOM_MONGO_URI_SCHEMA = z
  .string()
  .trim()
  .max(2048, "MongoDB URI is too long.")
  .refine((value) => value.length === 0 || MONGO_URI_REGEX.test(value), "Enter a valid MongoDB URI.")
  .refine(
    (value) => value.length === 0 || hasMongoDatabaseName(value),
    "MongoDB URI must include a database name."
  );
const INPUT_CLASS =
  "w-full rounded-md border border-[#333] bg-black px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#0070f3] focus:ring-2 focus:ring-[#0070f3]/30";
const BUTTON_CLASS =
  "rounded-md border border-[#333] bg-black text-white transition hover:bg-[#111] disabled:opacity-50";
const CUSTOM_MONGO_DEFAULT_MESSAGE =
  "Optional. Leave blank to keep notes and folders in pgnote's managed database.";

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
    keyLength: z.number().int().min(MIN_KEY_LENGTH).max(MAX_KEY_LENGTH),
    recoveryEmail: z
      .string()
      .trim()
      .min(1, "Recovery email is required.")
      .max(320)
      .pipe(z.string().email("Enter a valid email.").transform((value) => value.toLowerCase())),
    customMongoUri: CUSTOM_MONGO_URI_SCHEMA,
    sessionTimeoutPreset: z.enum(["2", "5", "10", "30", "custom"]),
    customSessionTimeout: z.number().int().min(1).max(1440).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.sessionTimeoutPreset === "custom" && !value.customSessionTimeout) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customSessionTimeout"],
        message: "Custom timeout is required..",
      });
    }
  });

type SignupFormValues = z.infer<typeof signupFormSchema>;

type AvailabilityState =
  | { status: "idle"; message: string }
  | { status: "checking"; message: string }
  | { status: "available"; message: string }
  | { status: "taken"; message: string }
  | { status: "error"; message: string };

type MongoUriVerificationState =
  | { status: "idle"; message: string }
  | { status: "checking"; message: string }
  | { status: "verified"; message: string }
  | { status: "error"; message: string };

function appendErrorCode(message: string, code?: string): string {
  if (!code) {
    return message;
  }
  return `${message} (${code})`;
}

function normalizeChunksForKeyLength(chunks: ChunkConfig[], keyLength: number): ChunkConfig[] {
  const maxIndex = Math.max(0, keyLength - 1);

  return chunks.map((chunk) => {
    const clampedFrom = Math.max(0, Math.min(chunk.from, maxIndex));
    const clampedTo = Math.max(0, Math.min(chunk.to, maxIndex));
    return {
      ...chunk,
      from: Math.min(clampedFrom, clampedTo),
      to: Math.max(clampedFrom, clampedTo),
    };
  });
}

export function SignupForm() {
  const router = useRouter();
  const [chunks, setChunks] = useState<ChunkConfig[]>([{ from: 0, to: MIN_KEY_LENGTH - 1, reverse: false }]);
  const [order, setOrder] = useState<number[]>([0]);
  const [slugAvailability, setSlugAvailability] = useState<AvailabilityState>({
    status: "idle",
    message: "Pick your permanent URL slug.",
  });
  const [recoveryEmailAvailability, setRecoveryEmailAvailability] = useState<AvailabilityState>({
    status: "idle",
    message: "Required for recovery. We only send recovery mail to this address.",
  });
  const [mongoUriVerification, setMongoUriVerification] = useState<MongoUriVerificationState>({
    status: "idle",
    message: CUSTOM_MONGO_DEFAULT_MESSAGE,
  });
  const [algoError, setAlgoError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormValues>({
    defaultValues: {
      slug: "",
      keyLength: MIN_KEY_LENGTH,
      recoveryEmail: "",
      customMongoUri: "",
      sessionTimeoutPreset: "10",
      customSessionTimeout: 15,
    },
    mode: "onChange",
  });

  const slugValue = useWatch({ control: form.control, name: "slug" }) ?? "";
  const keyLength = useWatch({ control: form.control, name: "keyLength" }) ?? MIN_KEY_LENGTH;
  const timeoutPreset = useWatch({ control: form.control, name: "sessionTimeoutPreset" }) ?? "10";
  const recoveryEmailValue = useWatch({ control: form.control, name: "recoveryEmail" }) ?? "";
  const customMongoUriValue = useWatch({ control: form.control, name: "customMongoUri" }) ?? "";
  const recoveryEmailTouched = form.formState.touchedFields.recoveryEmail;
  const customMongoUriTouched = form.formState.touchedFields.customMongoUri;
  const isSubmitted = form.formState.isSubmitted;

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

          const payload = (await response.json()) as {
            success?: boolean;
            data?: { available?: boolean };
            message?: string;
            code?: string;
          };

          if (!response.ok) {
            setSlugAvailability({
              status: "error",
              message: appendErrorCode(
                payload.message ?? "Unable to check slug right now.",
                payload.code
              ),
            });
            return;
          }

          if (!payload.success || typeof payload.data?.available !== "boolean") {
            setSlugAvailability({
              status: "error",
              message: appendErrorCode(
                payload.message ?? "Unable to check slug right now.",
                payload.code
              ),
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

  const debouncedRecoveryEmailCheck = useMemo(
    () =>
      debounce(async (rawRecoveryEmail: string) => {
        const normalized = rawRecoveryEmail.trim().toLowerCase();

        if (normalized.length === 0) {
          setRecoveryEmailAvailability({
            status: "idle",
            message: "Recovery email is required.",
          });
          return;
        }

        if (!EMAIL_SCHEMA.safeParse(normalized).success) {
          setRecoveryEmailAvailability({
            status: "idle",
            message: "Enter a valid email.",
          });
          return;
        }

        setRecoveryEmailAvailability({
          status: "checking",
          message: "Checking recovery email availability...",
        });

        try {
          const response = await fetch("/api/user/recovery-email-check", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ recoveryEmail: normalized }),
          });

          const payload = (await response.json()) as {
            success?: boolean;
            data?: { available?: boolean };
            message?: string;
            code?: string;
          };

          if (!response.ok) {
            setRecoveryEmailAvailability({
              status: "error",
              message: appendErrorCode(
                payload.message ?? "Unable to check recovery email right now.",
                payload.code
              ),
            });
            return;
          }

          if (!payload.success || typeof payload.data?.available !== "boolean") {
            setRecoveryEmailAvailability({
              status: "error",
              message: appendErrorCode(
                payload.message ?? "Unable to check recovery email right now.",
                payload.code
              ),
            });
            return;
          }

          if (payload.data.available) {
            setRecoveryEmailAvailability({
              status: "available",
              message: "Recovery email is available.",
            });
          } else {
            setRecoveryEmailAvailability({
              status: "taken",
              message: "Recovery email is already used.",
            });
          }
        } catch {
          setRecoveryEmailAvailability({
            status: "error",
            message: "Unable to check recovery email right now.",
          });
        }
      }, 450),
    []
  );

  const verifyCustomMongoUri = useMemo(
    () =>
      async (rawCustomMongoUri: string) => {
        const normalized = rawCustomMongoUri.trim();
        if (normalized.length === 0) {
          setMongoUriVerification({
            status: "idle",
            message: CUSTOM_MONGO_DEFAULT_MESSAGE,
          });
          return {
            ok: true as const,
            normalized: "",
          };
        }

        const parsedMongoUri = CUSTOM_MONGO_URI_SCHEMA.safeParse(normalized);
        if (!parsedMongoUri.success) {
          const message = parsedMongoUri.error.issues[0]?.message ?? "Enter a valid MongoDB URI.";
          setMongoUriVerification({
            status: "error",
            message,
          });
          return {
            ok: false as const,
            message,
          };
        }

        setMongoUriVerification({
          status: "checking",
          message: "Verifying MongoDB connection...",
        });

        try {
          const response = await fetch("/api/user/mongo-uri-check", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ mongoUri: normalized }),
          });

          const payload = (await response.json()) as {
            success?: boolean;
            data?: { verified?: boolean; message?: string; databaseName?: string | null };
            message?: string;
            code?: string;
          };

          if (!response.ok || !payload.success || typeof payload.data?.verified !== "boolean") {
            const message = appendErrorCode(
              payload.message ?? "Unable to verify MongoDB URI right now.",
              payload.code
            );
            setMongoUriVerification({
              status: "error",
              message,
            });
            return {
              ok: false as const,
              message,
            };
          }

          const message =
            payload.data.message ??
            (payload.data.verified
              ? "MongoDB URI verified."
              : "Could not connect to this MongoDB URI.");

          if (!payload.data.verified) {
            setMongoUriVerification({
              status: "error",
              message,
            });
            return {
              ok: false as const,
              message,
            };
          }

          setMongoUriVerification({
            status: "verified",
            message,
          });
          return {
            ok: true as const,
            normalized,
          };
        } catch {
          const message = "Unable to verify MongoDB URI right now.";
          setMongoUriVerification({
            status: "error",
            message,
          });
          return {
            ok: false as const,
            message,
          };
        }
      },
    []
  );

  const debouncedMongoUriCheck = useMemo(
    () =>
      debounce((rawCustomMongoUri: string) => {
        void verifyCustomMongoUri(rawCustomMongoUri);
      }, 650),
    [verifyCustomMongoUri]
  );

  useEffect(() => {
    debouncedSlugCheck(slugValue);
    return () => {
      debouncedSlugCheck.clear();
    };
  }, [slugValue, debouncedSlugCheck]);

  useEffect(() => {
    debouncedRecoveryEmailCheck(recoveryEmailValue);
    return () => {
      debouncedRecoveryEmailCheck.clear();
    };
  }, [recoveryEmailValue, debouncedRecoveryEmailCheck]);

  useEffect(() => {
    debouncedMongoUriCheck(customMongoUriValue);
    return () => {
      debouncedMongoUriCheck.clear();
    };
  }, [customMongoUriValue, debouncedMongoUriCheck]);

  useEffect(() => {
    const trimmed = recoveryEmailValue.trim();
    if (trimmed.length === 0) {
      if (recoveryEmailTouched || isSubmitted) {
        form.setError("recoveryEmail", {
          type: "manual",
          message: "Recovery email is required.",
        });
      } else {
        form.clearErrors("recoveryEmail");
      }
      return;
    }

    if (!EMAIL_SCHEMA.safeParse(trimmed).success) {
      form.setError("recoveryEmail", {
        type: "manual",
        message: "Enter a valid email.",
      });
      return;
    }

    form.clearErrors("recoveryEmail");
  }, [recoveryEmailValue, form, isSubmitted, recoveryEmailTouched]);

  useEffect(() => {
    const trimmed = customMongoUriValue.trim();
    if (trimmed.length === 0) {
      form.clearErrors("customMongoUri");
      return;
    }

    const parsedMongoUri = CUSTOM_MONGO_URI_SCHEMA.safeParse(trimmed);
    if (!parsedMongoUri.success) {
      form.setError("customMongoUri", {
        type: "manual",
        message: parsedMongoUri.error.issues[0]?.message ?? "Enter a valid MongoDB URI.",
      });
      return;
    }

    if (mongoUriVerification.status === "error" && (customMongoUriTouched || isSubmitted)) {
      form.setError("customMongoUri", {
        type: "manual",
        message: mongoUriVerification.message,
      });
      return;
    }

    form.clearErrors("customMongoUri");
  }, [customMongoUriTouched, customMongoUriValue, form, isSubmitted, mongoUriVerification]);

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    setAlgoError(null);
    form.clearErrors();
    setIsSubmitting(true);

    const parsedValues = signupFormSchema.safeParse({
      ...values,
      slug: values.slug.trim().toLowerCase(),
      recoveryEmail: values.recoveryEmail.trim().toLowerCase(),
      customMongoUri: values.customMongoUri.trim(),
    });

    if (!parsedValues.success) {
      for (const issue of parsedValues.error.issues) {
        const fieldName = issue.path[0];
        if (
          fieldName === "slug" ||
          fieldName === "keyLength" ||
          fieldName === "recoveryEmail" ||
          fieldName === "customMongoUri" ||
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

    if (recoveryEmailAvailability.status === "taken") {
      form.setError("recoveryEmail", {
        type: "manual",
        message: "Recovery email is already registered.",
      });
      setServerError("Recovery email is already registered. Use another email.");
      setIsSubmitting(false);
      return;
    }

    let verifiedCustomMongoUri: string | undefined;
    if (parsedValues.data.customMongoUri.length > 0) {
      const customMongoUriResult = await verifyCustomMongoUri(parsedValues.data.customMongoUri);
      if (!customMongoUriResult.ok) {
        form.setError("customMongoUri", {
          type: "manual",
          message: customMongoUriResult.message,
        });
        setServerError(customMongoUriResult.message);
        setIsSubmitting(false);
        return;
      }

      verifiedCustomMongoUri = parsedValues.data.customMongoUri;
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
          recoveryEmail: parsedValues.data.recoveryEmail,
          customMongoUri: verifiedCustomMongoUri,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { redirectTo?: string };
        message?: string;
        code?: string;
      };

      if (!response.ok || !payload.success || !payload.data?.redirectTo) {
        if (payload.code === "SLUG_ALREADY_EXISTS") {
          setSlugAvailability({
            status: "taken",
            message: "Slug is already taken.",
          });
          form.setError("slug", {
            type: "manual",
            message: "Slug is already taken.",
          });
        }

        if (payload.code === "RECOVERY_EMAIL_ALREADY_EXISTS") {
          setRecoveryEmailAvailability({
            status: "taken",
            message: "Recovery email is already used.",
          });
          form.setError("recoveryEmail", {
            type: "manual",
            message: "Recovery email is already registered.",
          });
        }

        if (payload.code === "CUSTOM_MONGO_UNREACHABLE") {
          setMongoUriVerification({
            status: "error",
            message: payload.message ?? "Unable to verify the custom MongoDB URI.",
          });
          form.setError("customMongoUri", {
            type: "manual",
            message: payload.message ?? "Unable to verify the custom MongoDB URI.",
          });
        }

        setServerError(
          appendErrorCode(payload.message ?? "Unable to create account.", payload.code)
        );
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
      <section className="border-l border-[#0070f3] pl-4">
        <p className="text-xs tracking-[0.18em] text-zinc-500 uppercase">Step 1</p>
        <h2 className="mt-1 text-base font-semibold text-zinc-100">Account Details</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-200">Slug</label>
            <div className="flex overflow-hidden rounded-md border border-[#333] bg-black">
              <span className="px-3 py-2 text-zinc-500">/</span>
              <input
                {...form.register("slug")}
                placeholder="rahul"
                autoComplete="off"
                className="w-full bg-transparent px-1 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
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
            <label className="mb-2 block text-sm font-medium text-zinc-200">Recovery Email</label>
            <input
              type="email"
              {...form.register("recoveryEmail")}
              placeholder="you@example.com"
              autoComplete="email"
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Required. If you forget your algo, recovery details for this account are sent only
              to this email.
            </p>
            {form.formState.errors.recoveryEmail && (
              <p className="mt-1 text-sm text-rose-400">{form.formState.errors.recoveryEmail.message}</p>
            )}
            <p
              className={`mt-1 text-sm ${
                recoveryEmailAvailability.status === "available"
                  ? "text-emerald-400"
                  : recoveryEmailAvailability.status === "taken"
                    ? "text-rose-400"
                    : "text-zinc-400"
              }`}
            >
              {recoveryEmailAvailability.message}
            </p>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-200">
              Custom MongoDB URI (optional)
            </label>
            <input
              type="text"
              {...form.register("customMongoUri")}
              placeholder="mongodb+srv://user:password@cluster.example.net/pgnote-notes?retryWrites=true&w=majority"
              autoComplete="off"
              spellCheck={false}
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Optional. If verified, only folders and notes are stored in your MongoDB database.
              Your slug, recovery email, login algo structure, and session metadata stay in
              pgnote&apos;s main database.
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Warning: keep this URI secret. Live verification checks database name format and
              current connectivity, but later permission, billing, allowlist, or network changes
              can still stop note access.
            </p>
            {form.formState.errors.customMongoUri && (
              <p className="mt-1 text-sm text-rose-400">
                {form.formState.errors.customMongoUri.message}
              </p>
            )}
            <p
              className={`mt-1 text-sm ${
                mongoUriVerification.status === "verified"
                  ? "text-emerald-400"
                  : mongoUriVerification.status === "error"
                    ? "text-rose-400"
                    : "text-zinc-400"
              }`}
            >
              {mongoUriVerification.message}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-200">Session Timeout</label>
              <select {...form.register("sessionTimeoutPreset")} className={INPUT_CLASS}>
                <option value="2">2 minutes</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="30">30 minutes</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {timeoutPreset === "custom" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-200">
                  Custom Timeout (minutes)
                </label>
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
                  className={INPUT_CLASS}
                />
                {form.formState.errors.customSessionTimeout && (
                  <p className="mt-1 text-sm text-rose-400">
                    {form.formState.errors.customSessionTimeout.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-l border-[#333] pl-4">
        <p className="text-xs tracking-[0.18em] text-zinc-500 uppercase">Step 2</p>
        <h2 className="mt-1 text-base font-semibold text-zinc-100">Passkey Algo Builder</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Build how your challenge is generated. You can auto-generate a random algo and then tune
          it.
        </p>
        <div className="mt-4">
          <AlgoBuilder
            keyLength={keyLength}
            chunks={chunks}
            order={order}
            onKeyLengthChange={(next) => {
              form.setValue("keyLength", next, { shouldDirty: true, shouldValidate: true });
              setChunks((previousChunks) => normalizeChunksForKeyLength(previousChunks, next));
            }}
            onChunksChange={setChunks}
            onOrderChange={setOrder}
            onRandomAlgoChange={(next) => {
              form.setValue("keyLength", next.keyLength, { shouldDirty: true, shouldValidate: true });
              setChunks(next.chunks);
              setOrder(next.order);
            }}
          />
        </div>
        {algoError && <p className="mt-2 text-sm text-rose-400">{algoError}</p>}
      </section>

      <section className="border-l border-[#333] pl-4">
        <p className="text-xs tracking-[0.18em] text-zinc-500 uppercase">Step 3</p>
        <h2 className="mt-1 text-base font-semibold text-zinc-100">Create Account</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Your slug and algo shape define authentication. Keep your method memorable.
        </p>
      </section>

      {serverError && <p className="text-sm text-rose-400">{serverError}</p>}

      <Button type="submit" className={`${BUTTON_CLASS} h-9 w-full`} disabled={isSubmitting}>
        {isSubmitting ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  );
}
