import type { PasskeyAlgo } from "@/lib/passkey";
import type { AppSessionData } from "@/lib/session-options";

export type SessionTimeoutOption = 2 | 5 | 10 | 30 | number;

export interface SignupPayload {
  slug: string;
  algo: PasskeyAlgo;
  sessionTimeout: SessionTimeoutOption;
  recoveryEmail?: string;
  customMongoUri?: string;
}

export interface ChallengeRequestPayload {
  slug: string;
}

export interface ChallengeResponsePayload {
  challengeId: string;
  challenge: string;
  keyLength: number;
}

export interface VerifyChallengePayload {
  slug: string;
  challengeId: string;
  responseKey: string;
}

export type SessionPayload = AppSessionData;
