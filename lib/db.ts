import "server-only";

import mongoose from "mongoose";
import { env } from "@/lib/env";

declare global {
  var mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const globalCache = globalThis.mongooseCache ?? { conn: null, promise: null };
globalThis.mongooseCache = globalCache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (globalCache.conn) {
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(env.MONGODB_URI, {
      autoIndex: process.env.NODE_ENV !== "production",
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      dbName: "pgnote",
    });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}
