"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  refreshVerified,
  sendVerification,
  verificationErrorMessage,
} from "@/features/accounts/verify-email/send-verification";
import { auth } from "@/lib/firebase";

const RESEND_COOLDOWN_MS = 30_000;

// The /verify-email page. Signed-in accounts whose email isn't verified are sent
// here and can't use the rest of the app until they click the emailed link.
export function VerifyEmailNotice() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      if (currentUser.emailVerified) {
        router.replace("/dashboard");
        return;
      }

      setUser(currentUser);
    });
  }, [router]);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current);
      }
    };
  }, []);

  async function handleCheck() {
    if (!user) {
      return;
    }

    setError("");
    setMessage("");
    setIsChecking(true);

    try {
      if (await refreshVerified(user)) {
        router.replace("/dashboard");
        return;
      }

      setError("Not verified yet. Click the link in the email, then try again.");
    } catch {
      setError("Could not check your email status. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleResend() {
    if (!user) {
      return;
    }

    setError("");
    setMessage("");
    setIsSending(true);

    try {
      await sendVerification(user);
      setMessage(`Sent a new link to ${user.email}.`);
      setIsCoolingDown(true);
      cooldownTimer.current = setTimeout(
        () => setIsCoolingDown(false),
        RESEND_COOLDOWN_MS,
      );
    } catch (caughtError) {
      setError(verificationErrorMessage(caughtError));
    } finally {
      setIsSending(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/signup");
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm text-zinc-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 text-zinc-950">
      <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-700">Spark Volunteering</p>
          <h1 className="mt-2 text-2xl font-semibold">Verify your email</h1>
          <p className="mt-3 text-sm text-zinc-600">
            We sent a verification link to{" "}
            <span className="font-medium text-zinc-950">{user.email}</span>.
            Click it, then come back here.
          </p>
        </div>

        <div className="space-y-3">
          {message ? (
            <p
              className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
              role="status"
            >
              {message}
            </p>
          ) : null}

          {error ? (
            <p
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            className="flex h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            disabled={isChecking}
            onClick={handleCheck}
            type="button"
          >
            {isChecking ? "Checking" : "I've verified it"}
          </button>

          <button
            className="flex h-11 w-full items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
            disabled={isSending || isCoolingDown}
            onClick={handleResend}
            type="button"
          >
            {isSending ? "Sending" : "Resend email"}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-zinc-600">
          Wrong email?{" "}
          <button
            className="font-medium text-blue-700 hover:text-blue-800"
            onClick={handleSignOut}
            type="button"
          >
            Log out and sign up again
          </button>
        </p>
      </section>
    </main>
  );
}
