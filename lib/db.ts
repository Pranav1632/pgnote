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
  if (globalCache.conn && globalCache.conn.connection.readyState === 1) {
    return globalCache.conn;
  }

  if (globalCache.conn && globalCache.conn.connection.readyState !== 1) {
    globalCache.conn = null;
    globalCache.promise = null;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose
      .connect(env.MONGODB_URI, {
        autoIndex: process.env.NODE_ENV !== "production",
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        dbName: "pgnote",
      })
      .catch((error) => {
        globalCache.promise = null;
        throw error;
      });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}
