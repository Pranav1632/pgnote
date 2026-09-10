import { z } from "zod";
import { MAX_KEY_LENGTH, MIN_KEY_LENGTH, validateAlgo } from "@/lib/passkey";
import { hasMongoDatabaseName, MONGO_URI_REGEX } from "@/lib/mongo-uri-format";

const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{2,31}$/;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    SLUG_REGEX,
    "Slug must be 3-32 chars and only contain lowercase letters, numbers, underscore, or hyphen."
  );

export const objectIdSchema = z
  .string()
  .trim()
  .regex(OBJECT_ID_REGEX, "Invalid MongoDB object id.");

export const chunkConfigSchema = z.object({
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  reverse: z.boolean(),
});

export const passkeyAlgoSchema = z
  .object({
    keyLength: z.number().int().min(MIN_KEY_LENGTH).max(MAX_KEY_LENGTH),
    chunks: z.array(chunkConfigSchema).min(1),
    order: z.array(z.number().int()).min(1),
  })
  .superRefine((value, ctx) => {
    const result = validateAlgo(value);
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error ?? "Invalid passkey algo.",
      });
    }
  });

export const sessionTimeoutSchema = z.number().int().min(1).max(1440);

export const recoveryEmailSchema = z
  .string()
  .trim()
  .min(1, "Recovery email is required.")
  .max(320)
  .pipe(z.string().email("Enter a valid email.").transform((value) => value.toLowerCase()));

export const customMongoUriSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim().length === 0) {
      return undefined;
    }
    return value;
  },
  z
    .string()
    .trim()
    .regex(MONGO_URI_REGEX, "Invalid MongoDB URI.")
    .refine((value) => hasMongoDatabaseName(value), "MongoDB URI must include a database name.")
    .max(2048)
    .optional()
);

export const signupRequestSchema = z.object({
  slug: slugSchema,
  algo: passkeyAlgoSchema,
  sessionTimeout: sessionTimeoutSchema,
  recoveryEmail: recoveryEmailSchema,
  customMongoUri: customMongoUriSchema,
});

export const slugCheckRequestSchema = z.object({
  slug: slugSchema,
});

export const recoveryEmailCheckRequestSchema = z.object({
  recoveryEmail: recoveryEmailSchema,
});

export const challengeRequestSchema = z.object({
  slug: slugSchema,
});

export const verifyChallengeRequestSchema = z.object({
  slug: slugSchema,
  challengeId: z.string().trim().min(10).max(64),
  responseKey: z.string().min(MIN_KEY_LENGTH).max(MAX_KEY_LENGTH),
});

export const recoveryRequestSchema = z.object({
  slug: slugSchema,
});

export const mongoUriVerifyRequestSchema = z.object({
  mongoUri: z.string().trim().regex(MONGO_URI_REGEX).max(2048),
});

export const createFolderRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const createNoteRequestSchema = z.object({
  folderId: objectIdSchema,
  content: z.string().min(1).max(200_000),
});

export const updateNoteRequestSchema = z.object({
  noteId: objectIdSchema,
  folderId: objectIdSchema.optional(),
  content: z.string().min(1).max(200_000),
});

export const listNotesQuerySchema = z.object({
  folderId: objectIdSchema.optional(),
});

export const deleteNoteParamsSchema = z.object({
  id: objectIdSchema,
});

export const deleteFolderParamsSchema = z.object({
  id: objectIdSchema,
});

export const nameSchema = z
  .string()
  .trim()
  .max(50, "Name must be 50 characters or less.")
  .optional()
  .nullable();

export const updateProfileRequestSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  recoveryEmail: recoveryEmailSchema.optional(),
  sessionTimeout: sessionTimeoutSchema.optional(),
  customMongoUri: z
    .union([
      z
        .string()
        .trim()
        .regex(MONGO_URI_REGEX, "Invalid MongoDB URI.")
        .refine((value) => hasMongoDatabaseName(value), "MongoDB URI must include a database name.")
        .max(2048),
      z.literal(""),
      z.null(),
    ])
    .optional(),
});
