import type { PasskeyAlgo } from "@/lib/passkey";

export interface UserDTO {
  id: string;
  slug: string;
  algo: PasskeyAlgo;
  sessionTimeout: number;
  recoveryEmail?: string; 
  createdAt: string;
  lastLogin?: string;
}
