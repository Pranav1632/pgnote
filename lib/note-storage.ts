import "server-only";

import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { inferInfraErrorCode, logServerError } from "@/lib/error-utils";
import { FolderModel, getFolderModel } from "@/models/Folder";
import { NoteModel, getNoteModel } from "@/models/Note";
import { UserModel } from "@/models/User";

type FolderStorageModel = ReturnType<typeof getFolderModel>;
type NoteStorageModel = ReturnType<typeof getNoteModel>;
type MongooseConnection = typeof FolderModel.db;

interface CachedCustomConnection {
  connection: MongooseConnection | null;
  connectionPromise: Promise<MongooseConnection> | null;
  initializationPromise: Promise<void> | null;
}

declare global {
  var customNoteStorageConnectionCache: Map<string, CachedCustomConnection> | undefined;
}

const customConnectionCache = globalThis.customNoteStorageConnectionCache ?? new Map();
globalThis.customNoteStorageConnectionCache = customConnectionCache;

export class NoteStorageError extends Error {
  code: string;
  usingCustomDatabase: boolean;

  constructor(message: string, code: string, usingCustomDatabase: boolean) {
    super(message);
    this.name = "NoteStorageError";
    this.code = code;
    this.usingCustomDatabase = usingCustomDatabase;
  }
}

export interface NoteStorageContext {
  folderModel: FolderStorageModel;
  noteModel: NoteStorageModel;
  usingCustomDatabase: boolean;
}

async function ensureCustomConnectionReady(uri: string): Promise<MongooseConnection> {
  const normalizedUri = uri.trim();
  let cacheEntry = customConnectionCache.get(normalizedUri);

  if (!cacheEntry) {
    cacheEntry = {
      connection: null,
      connectionPromise: null,
      initializationPromise: null,
    };
    customConnectionCache.set(normalizedUri, cacheEntry);
  }

  if (cacheEntry.connection?.readyState === 1 && cacheEntry.initializationPromise) {
    await cacheEntry.initializationPromise;
    return cacheEntry.connection;
  }

  if (cacheEntry.connection && cacheEntry.connection.readyState !== 1) {
    // If the connection exists but is no longer connected (e.g. Next.js HMR broke it),
    // clear it out and reconnect.
    try {
      await cacheEntry.connection.close();
    } catch { }
    cacheEntry.connection = null;
    cacheEntry.connectionPromise = null;
    cacheEntry.initializationPromise = null;
  }

  if (!cacheEntry.connectionPromise) {
    const connection = mongoose.createConnection(normalizedUri, {
      autoIndex: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45_000,
    });

    cacheEntry.connectionPromise = connection.asPromise().then(() => {
      cacheEntry!.connection = connection;
      return connection;
    });
  }

  let connection: MongooseConnection;
  try {
    connection = await cacheEntry.connectionPromise;
  } catch (error) {
    customConnectionCache.delete(normalizedUri);
    throw error;
  }

  if (!cacheEntry.initializationPromise) {
    const folderModel = getFolderModel(connection);
    const noteModel = getNoteModel(connection);

    cacheEntry.initializationPromise = Promise.all([folderModel.init(), noteModel.init()]).then(
      () => undefined
    );
  }

  try {
    await cacheEntry.initializationPromise;
  } catch (error) {
    customConnectionCache.delete(normalizedUri);
    try {
      await connection.close();
    } catch {
    }
    throw error;
  }

  return connection;
}

export async function getNoteStorageContextForUser(userId: string): Promise<NoteStorageContext> {
  await connectToDatabase();

  const user = await UserModel.findById(userId).select("customMongoUri").lean();
  if (!user) {
    throw new NoteStorageError("Unauthorized.", "USER_NOT_FOUND", false);
  }

  const customMongoUri =
    typeof user.customMongoUri === "string" && user.customMongoUri.trim().length > 0
      ? user.customMongoUri.trim()
      : undefined;

  if (!customMongoUri) {
    return {
      folderModel: FolderModel,
      noteModel: NoteModel,
      usingCustomDatabase: false,
    };
  }

  try {
    const connection = await ensureCustomConnectionReady(customMongoUri);
    return {
      folderModel: getFolderModel(connection),
      noteModel: getNoteModel(connection),
      usingCustomDatabase: true,
    };
  } catch (error) {
    logServerError("note-storage/custom-connection", error);
    throw new NoteStorageError(
      "Unable to connect to custom note storage.",
      inferInfraErrorCode(error, "CUSTOM_MONGO_FAILED"),
      true
    );
  }
}

export function resolveNoteStorageFailure(error: unknown) {
  if (!(error instanceof NoteStorageError)) {
    return null;
  }

  if (error.code === "USER_NOT_FOUND") {
    return {
      status: 401,
      message: "Unauthorized.",
      code: error.code,
    };
  }

  if (error.usingCustomDatabase) {
    return {
      status: 503,
      message:
        "Your custom MongoDB database is unavailable. Notes and folders stay in your database only, so pgnote cannot load or save them until that connection works again.",
      code: error.code,
    };
  }

  return {
    status: 500,
    message: "Request failed.",
    code: error.code,
  };
}
