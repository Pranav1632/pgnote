import type { PasskeyAlgo } from "@/lib/passkey";

export interface UserDTO {
  id: string;
  name?: string;
  slug: string;
  algo: PasskeyAlgo;
  sessionTimeout: number;
  recoveryEmail: string;
  customMongoUri?: string;
  usingCustomDatabase: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface UserProfileDTO {
  id: string;
  name?: string;
  slug: string;
  recoveryEmail: string;
  sessionTimeout: number;
  customMongoUri?: string;
  usingCustomDatabase: boolean;
  createdAt: string;
  lastLogin?: string;
  algoSummary: {
    keyLength: number;
    chunkCount: number;
    order: number[];
  };
}

export interface UpdateProfileInput {
  name?: string | null;
  slug?: string;
  recoveryEmail?: string;
  sessionTimeout?: number;
  customMongoUri?: string | null;
}
