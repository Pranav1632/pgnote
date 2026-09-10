import mongoose from "mongoose";
import {
  MAX_KEY_LENGTH,
  MIN_KEY_LENGTH,
  type ChunkConfig,
  type PasskeyAlgo,
  validateAlgo,
} from "@/lib/passkey";

const { Schema } = mongoose;

const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{2,31}$/;

export interface IUser {
  name?: string;
  slug: string;
  algo: PasskeyAlgo;
  sessionTimeout: number;
  recoveryEmail: string;
  customMongoUri?: string;
  createdAt: Date;
  lastLogin?: Date;
}

const chunkConfigSchema = new Schema<ChunkConfig>(
  {
    from: {
      type: Number,
      required: true,
      min: 0,
    },
    to: {
      type: Number,
      required: true,
      min: 0,
    },
    reverse: {
      type: Boolean,
      required: true,
    },
  },
  {
    _id: false,
    id: false,
  }
);

const passkeyAlgoSchema = new Schema<PasskeyAlgo>(
  {
    keyLength: {
      type: Number,
      required: true,
      min: MIN_KEY_LENGTH,
      max: MAX_KEY_LENGTH,
    },
    chunks: {
      type: [chunkConfigSchema],
      required: true,
      validate: {
        validator(chunks: ChunkConfig[]) {
          return Array.isArray(chunks) && chunks.length > 0;
        },
        message: "At least one chunk is required.",
      },
    },
    order: {
      type: [Number],
      required: true,
      validate: {
        validator(order: number[]) {
          return Array.isArray(order) && order.length > 0;
        },
        message: "Chunk display order is required.",
      },
    },
  },
  {
    _id: false,
    id: false,
  }
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 50,
      default: undefined,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [SLUG_REGEX, "Invalid slug format."],
    },
    algo: {
      type: passkeyAlgoSchema,
      required: true,
    },
    sessionTimeout: {
      type: Number,
      required: true,
      min: 1,
      max: 1440,
    },
    recoveryEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    customMongoUri: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: undefined,
    },
    lastLogin: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    versionKey: false,
  }
);

userSchema.index({ recoveryEmail: 1 }, { unique: true, sparse: true });

userSchema.pre(
  "validate",
  function validatePasskeyAlgo(this: IUser & { invalidate(path: string, message: string): void }) {
    const result = validateAlgo(this.algo);
    if (!result.valid) {
      this.invalidate("algo", result.error ?? "Invalid passkey algo.");
    }
  }
);

export const UserModel = mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);
