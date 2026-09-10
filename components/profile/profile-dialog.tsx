"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserProfileDTO } from "@/types";

interface ProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentSlug: string;
  onSlugChanged?: (newSlug: string) => void;
  onDatabaseChanged?: () => void;
}

type TabType = "general" | "database" | "security";

export function ProfileDialog({
  isOpen,
  onOpenChange,
  currentSlug,
  onSlugChanged,
  onDatabaseChanged,
}: ProfileDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingMongo, setIsTestingMongo] = useState(false);
  const [showMongoPassword, setShowMongoPassword] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState(currentSlug);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [customMongoUri, setCustomMongoUri] = useState("");

  // Metadata
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [mongoTestResult, setMongoTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch profile when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setMongoTestResult(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          const p = res.data as UserProfileDTO;
          setProfile(p);
          setName(p.name ?? "");
          setSlug(p.slug);
          setRecoveryEmail(p.recoveryEmail);
          setSessionTimeout(p.sessionTimeout);
          setCustomMongoUri(p.customMongoUri ?? "");
        } else {
          toast.error(res.message ?? "Failed to load profile details.");
        }
      })
      .catch(() => {
        if (isMounted) {
          toast.error("Network error loading profile.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle Testing Custom MongoDB URI
  const handleTestMongo = async () => {
    const trimmed = customMongoUri.trim();
    if (!trimmed) {
      toast.error("Please enter a MongoDB URI to test.");
      return;
    }

    setIsTestingMongo(true);
    setMongoTestResult(null);

    try {
      const res = await fetch("/api/user/mongo-uri-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mongoUri: trimmed }),
      });

      const data = await res.json();
      if (data.success && data.data?.verified) {
        setMongoTestResult({
          success: true,
          message: data.data.message ?? "Connection verified successfully!",
        });
        toast.success("MongoDB connection verified!");
      } else {
        const msg = data.data?.message ?? data.message ?? "Could not connect to this MongoDB URI.";
        setMongoTestResult({
          success: false,
          message: msg,
        });
        toast.error("MongoDB connection failed.");
      }
    } catch {
      setMongoTestResult({
        success: false,
        message: "Failed to run connection test. Please check network.",
      });
      toast.error("Connection test failed.");
    } finally {
      setIsTestingMongo(false);
    }
  };

  // Revert to Default pgnote Database
  const handleRevertToDefaultDb = () => {
    setCustomMongoUri("");
    setMongoTestResult({
      success: true,
      message: "Ready to use the default pgnote database. Click 'Save Changes' to apply.",
    });
    toast.info("Cleared custom URI. Click 'Save Changes' to switch to the default database.");
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim().length > 0 ? name.trim() : null,
          slug: slug.toLowerCase().trim(),
          recoveryEmail: recoveryEmail.toLowerCase().trim(),
          sessionTimeout: Number(sessionTimeout),
          customMongoUri: customMongoUri.trim().length > 0 ? customMongoUri.trim() : null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message ?? "Failed to save profile changes.");
        return;
      }

      const updated = data.data.profile as UserProfileDTO;
      setProfile(updated);
      toast.success("Profile updated successfully!");

      // If database changed, notify parent to refresh notes/folders
      if (data.data.databaseChanged && onDatabaseChanged) {
        onDatabaseChanged();
      }

      // If slug changed, notify parent to redirect
      if (data.data.slugChanged && onSlugChanged) {
        onSlugChanged(updated.slug);
      }

      onOpenChange(false);
    } catch {
      toast.error("Failed to save changes. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "Never";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <User className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Account & Profile Settings</DialogTitle>
              <DialogDescription>
                Manage your credentials, database storage, and session preferences.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-zinc-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === "general"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile & Account</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("database")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === "database"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>MongoDB Storage</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === "security"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Security</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* GENERAL TAB */}
            {activeTab === "general" && (
              <div className="flex flex-col gap-3.5 text-sm">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pranav Gaikwad"
                    maxLength={50}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-hidden"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Your personal display name shown on your profile.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Username (URL Slug)
                  </label>
                  <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400">
                    <span className="font-mono text-zinc-500">/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                      placeholder="username"
                      required
                      className="w-full bg-transparent px-1 font-mono text-zinc-100 focus:outline-hidden"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Used to access your workspace at <span className="font-mono text-zinc-400">/{slug}/notes</span>.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Recovery Email
                  </label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-hidden"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Used to recover your account passkey if you ever forget it.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Session Timeout
                  </label>
                  <select
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-hidden"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={120}>2 Hours</option>
                    <option value={240}>4 Hours</option>
                    <option value={480}>8 Hours</option>
                    <option value={1440}>24 Hours</option>
                  </select>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    How long your session remains active before automatically logging you out.
                  </p>
                </div>
              </div>
            )}

            {/* DATABASE TAB */}
            {activeTab === "database" && (
              <div className="flex flex-col gap-3.5 text-sm">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-zinc-300">Active Storage Backend</p>
                      <p className="text-xs text-zinc-500">
                        {profile?.usingCustomDatabase
                          ? "Using your self-hosted custom MongoDB database."
                          : "Using the default pgnote managed database."}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        profile?.usingCustomDatabase
                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {profile?.usingCustomDatabase ? "Custom MongoDB" : "Default Database"}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-400">
                      Custom MongoDB Connection URI
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMongoPassword(!showMongoPassword)}
                      className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                    >
                      {showMongoPassword ? (
                        <>
                          <EyeOff className="h-3 w-3" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> Show
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showMongoPassword ? "text" : "password"}
                      value={customMongoUri}
                      onChange={(e) => {
                        setCustomMongoUri(e.target.value);
                        setMongoTestResult(null);
                      }}
                      placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-hidden"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Must include a database name (e.g. <span className="font-mono text-zinc-400">/my_notes</span>). Notes are isolated to your cluster.
                  </p>
                </div>

                {/* Test & Revert Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestMongo}
                    disabled={isTestingMongo || !customMongoUri.trim()}
                    className="h-8 text-xs"
                  >
                    {isTestingMongo ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Test Connection
                      </>
                    )}
                  </Button>

                  {customMongoUri && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRevertToDefaultDb}
                      className="h-8 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      Disconnect & Use Default DB
                    </Button>
                  )}
                </div>

                {/* Connection Test Result Banner */}
                {mongoTestResult && (
                  <div
                    className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
                      mongoTestResult.success
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {mongoTestResult.success ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    )}
                    <span className="leading-relaxed">{mongoTestResult.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <div className="flex flex-col gap-3 text-sm">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <KeyRound className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold">Passkey Algorithm</span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <div>
                      <span className="text-zinc-500">Key Length:</span>{" "}
                      <span className="font-mono text-zinc-200">
                        {profile?.algoSummary?.keyLength ?? "N/A"} characters
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Chunks:</span>{" "}
                      <span className="font-mono text-zinc-200">
                        {profile?.algoSummary?.chunkCount ?? "N/A"} segments
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Your passkey algorithm is uniquely generated and verified server-side without storing your plaintext key.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3.5 text-xs text-zinc-400">
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Account Created</span>
                    <span className="font-mono text-zinc-300">{formatDate(profile?.createdAt)}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-1.5">
                    <span className="text-zinc-500">Last Successful Login</span>
                    <span className="font-mono text-zinc-300">{formatDate(profile?.lastLogin)}</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="mt-2 pt-2 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-500"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
