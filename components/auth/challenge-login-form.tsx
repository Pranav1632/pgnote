"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ChallengePayload {
  challengeId: string;
  challenge: string;
  keyLength: number;
}

interface ChallengeLoginFormProps {
  slug: string;
}

export function ChallengeLoginForm({ slug }: ChallengeLoginFormProps) {
  const router = useRouter();
  const normalizedSlug = useMemo(() => slug.trim().toLowerCase(), [slug]);

  const [challengeData, setChallengeData] = useState<ChallengePayload | null>(null);
  const [responseKey, setResponseKey] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);

  const fetchChallenge = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: normalizedSlug }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: ChallengePayload;
        message?: string;
      };

      if (!response.ok || !payload.success || !payload.data) {
        return {
          ok: false as const,
          message: payload.message ?? "Unable to load challenge.",
        };
      }

      return {
        ok: true as const,
        data: payload.data,
      };
    } catch {
      return {
        ok: false as const,
        message: "Unable to load challenge.",
      };
    }
  }, [normalizedSlug]);

  useEffect(() => {
    let active = true;

    (async () => {
      const result = await fetchChallenge();
      if (!active) {
        return;
      }

      if (result.ok) {
        setChallengeData(result.data);
        setResponseKey("");
        setStatusMessage(null);
      } else {
        setChallengeData(null);
        setStatusMessage(result.message);
      }

      setIsLoadingChallenge(false);
    })();

    return () => {
      active = false;
    };
  }, [fetchChallenge]);

  const requestChallenge = async () => {
    setIsLoadingChallenge(true);
    setStatusMessage(null);

    const result = await fetchChallenge();
    if (result.ok) {
      setChallengeData(result.data);
      setResponseKey("");
      setStatusMessage(null);
    } else {
      setChallengeData(null);
      setStatusMessage(result.message);
    }

    setIsLoadingChallenge(false);
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!challengeData) {
      setStatusMessage("Start a new challenge.");
      return;
    }

    if (responseKey.length !== challengeData.keyLength) {
      setStatusMessage(`Enter exactly ${challengeData.keyLength} characters.`);
      return;
    }

    setIsVerifying(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: normalizedSlug,
          challengeId: challengeData.challengeId,
          responseKey,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { redirectTo?: string };
        message?: string;
      };

      if (!response.ok || !payload.success || !payload.data?.redirectTo) {
        setStatusMessage(payload.message ?? "Invalid credentials.");
        setIsVerifying(false);
        return;
      }

      router.push(payload.data.redirectTo);
    } catch {
      setStatusMessage("Unable to verify challenge.");
      setIsVerifying(false);
    }
  };

  const handleRecoverySubmit = async () => {
    if (!recoveryEmail.trim()) {
      setRecoveryStatus("Enter your recovery email.");
      return;
    }

    setIsSendingRecovery(true);
    setRecoveryStatus(null);

    try {
      const response = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: normalizedSlug,
          email: recoveryEmail.trim().toLowerCase(),
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { message?: string };
        message?: string;
      };

      const message =
        payload.data?.message ??
        payload.message ??
        "If the details match our records, we will email your algorithm recovery instructions.";

      setRecoveryStatus(message);
    } catch {
      setRecoveryStatus(
        "If the details match our records, we will email your algorithm recovery instructions."
      );
    } finally {
      setIsSendingRecovery(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 font-mono">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs tracking-[0.25em] text-zinc-500 uppercase">Challenge</p>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={isLoadingChallenge || isVerifying}
            onClick={requestChallenge}
          >
            Regenerate
          </Button>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 text-emerald-400">
          {isLoadingChallenge ? "Generating..." : challengeData?.challenge ?? "--"}
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Use your algo mentally, then type the original key. Challenge expires in 2 minutes.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Original Key Response</label>
        <input
          value={responseKey}
          onChange={(event) => setResponseKey(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={challengeData ? `${challengeData.keyLength} characters` : "Waiting for challenge..."}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
          disabled={!challengeData || isLoadingChallenge || isVerifying}
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => {
            setShowRecoveryPanel((previous) => !previous);
            setRecoveryStatus(null);
          }}
          className="text-sm text-zinc-400 underline-offset-4 transition hover:text-zinc-200 hover:underline"
        >
          Forgot your algo? -&gt;
        </button>
      </div>

      {showRecoveryPanel && (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-300">
            Enter the recovery email you configured during signup. We will send your algo details
            if the account and email match.
          </p>
          <div className="space-y-2">
            <input
              type="email"
              value={recoveryEmail}
              onChange={(event) => setRecoveryEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={isSendingRecovery}
              onClick={() => {
                void handleRecoverySubmit();
              }}
            >
              {isSendingRecovery ? "Sending..." : "Send Recovery Email"}
            </Button>
          </div>
          {recoveryStatus && <p className="text-sm text-zinc-400">{recoveryStatus}</p>}
        </div>
      )}

      {statusMessage && <p className="text-sm text-rose-400">{statusMessage}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={!challengeData || isVerifying}>
        {isVerifying ? "Verifying..." : "Unlock Notes"}
      </Button>
    </form>
  );
}
