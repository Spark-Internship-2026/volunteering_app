// Filename: forgot-password-form.tsx
// Author: Kevin K. Seng
// Date: 06/01/2025
// Description: Form component that sends a Firebase password-reset email.
//              Rendered by app/forgot-password/page.tsx.

"use client";

import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { auth } from "@/lib/firebase";

// ================ Helpers ================

// Name: getResetError
// Description: Maps a FirebaseError code from sendPasswordResetEmail into a
//              human-readable string. Returns a generic fallback for anything
//              not explicitly listed.
// Parameters:  error - the value caught in the try/catch (unknown type)
// Returns:     A user-facing error string.
function getResetError(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    // Firebase does NOT expose whether an email exists for security reasons —
    // auth/user-not-found is intentionally omitted so we don't leak account info.
    case "auth/too-many-requests":
      return "Too many attempts. Wait a bit, then try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Could not send the reset email. Please try again.";
  }
}

// ================ Component ================

// Name: ForgotPasswordForm
// Description: Renders a card with a single email input. On submit it calls
//              Firebase's sendPasswordResetEmail. On success it swaps the form
//              out for a confirmation message so the user knows to check their
//              inbox. On failure it shows an inline error.
// Parameters:  none
// Returns:     JSX element
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (caughtError) {
      // auth/user-not-found means the email isn't registered. We treat it the
      // same as success (setSent) rather than showing an error, because telling
      // the user "that email isn't registered" leaks whether an account exists —
      // a privacy hazard. The real account holder still gets the email; the
      // unregistered address simply receives nothing, which the submitter
      // cannot distinguish from normal delivery delay.
      if (
        caughtError instanceof FirebaseError &&
        caughtError.code === "auth/user-not-found"
      ) {
        setSent(true);
      } else {
        setError(getResetError(caughtError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 text-zinc-950">
      <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-700">Spark Volunteering</p>
          <h1 className="mt-2 text-2xl font-semibold">Reset password</h1>
        </div>

        {/* Success state: hide the form and show a confirmation message */}
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-700">
              If that email has an account, a reset link is on its way. Check
              your inbox (and spam folder).
            </p>
            <p className="text-sm text-zinc-500">
              Didn&apos;t receive it? Wait 5 minutes, then submit again — the
              email may be delayed. If it still doesn&apos;t arrive, also check
              your spam or junk folder.
            </p>
            <Link
              className="block text-center text-sm font-medium text-blue-700 hover:text-blue-800"
              href="/login"
            >
              Back to log in
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium">
              Email
              <input
                className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

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
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
            </button>

            <p className="text-center text-sm text-zinc-600">
              <Link
                className="font-medium text-blue-700 hover:text-blue-800"
                href="/login"
              >
                Back to log in
              </Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
