import mongoose from "mongoose";
import { getMongoDatabaseName, MONGO_URI_REGEX } from "@/lib/mongo-uri-format";

export { getMongoDatabaseName, MONGO_URI_REGEX } from "@/lib/mongo-uri-format";

export function isMongoUriFormat(uri: string): boolean {
  return MONGO_URI_REGEX.test(uri.trim());
}

export async function verifyMongoUriConnectivity(uri: string): Promise<boolean> {
  const normalizedUri = uri.trim();
  if (!isMongoUriFormat(normalizedUri) || !getMongoDatabaseName(normalizedUri)) {
    return false;
  }

  const connection = mongoose.createConnection(normalizedUri, {
    autoIndex: false,
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  });

  try {
    await connection.asPromise();
    if (!connection.db) {
      return false;
    }
    await connection.db.admin().ping();
    return true;
  } catch {
    return false;
  } finally {
    try {
      await connection.close();
    } catch {
    }
  }
}
