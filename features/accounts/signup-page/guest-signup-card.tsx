"use client";

import { FirebaseError } from "firebase/app";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { type FormEvent, useState } from "react";

import { isValidEmail } from "@/features/accounts/signup-page/is-valid-email";
import { db } from "@/lib/firebase";
import { isOpportunityPast, type Opportunity } from "@/lib/opportunities";
import { normalizeSignupEmail, signupDocIdForEmail } from "@/lib/signups";

type GuestSignupCardProps = {
  opportunity: Opportunity | null;
  opportunityId: string;
};

function guestSignupErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this guest signup. Publish the latest Firestore rules, then try again.";
  }

  return "Could not complete guest signup. Please try again.";
}

// "Continue as guest": sign up for an event with just an email address.
export function GuestSignupCard({
  opportunity,
  opportunityId,
}: GuestSignupCardProps) {
  const [guestEmail, setGuestEmail] = useState("");
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const [isGuestSignedUp, setIsGuestSignedUp] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [guestMessage, setGuestMessage] = useState("");

  const signupsClosed = opportunity
    ? isOpportunityPast(opportunity.date)
    : false;

  async function handleGuestSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuestError("");
    setGuestMessage("");

    const trimmedEmail = normalizeSignupEmail(guestEmail);

    if (!isValidEmail(trimmedEmail)) {
      setGuestError("Enter a valid email address.");
      return;
    }

    if (opportunity && isOpportunityPast(opportunity.date)) {
      setGuestError("This event has passed, so signups are closed.");
      return;
    }

    setIsGuestSubmitting(true);

    try {
      await setDoc(
        doc(db, "signups", signupDocIdForEmail(opportunityId, trimmedEmail)),
        {
          studentId: "guest",
          studentName: "GUEST",
          studentEmail: trimmedEmail,
          opportunityId,
          createdAt: serverTimestamp(),
        },
      );

      setGuestEmail("");
      setIsGuestSignedUp(true);
      setGuestMessage("You are signed up as GUEST.");
    } catch (caughtError) {
      setGuestError(guestSignupErrorMessage(caughtError));
    } finally {
      setIsGuestSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Continue as guest</h2>

      <form className="mt-4 space-y-4" onSubmit={handleGuestSignup}>
        <label className="block text-sm font-medium">
          Email
          <input
            autoComplete="email"
            className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            disabled={signupsClosed || isGuestSignedUp}
            onChange={(event) => setGuestEmail(event.target.value)}
            required
            type="email"
            value={guestEmail}
          />
        </label>

        {guestError ? (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {guestError}
          </p>
        ) : null}

        {signupsClosed ? (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            This event has passed, so signups are closed.
          </p>
        ) : null}

        {guestMessage ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {guestMessage}
          </p>
        ) : null}

        <button
          className="flex h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          disabled={signupsClosed || isGuestSubmitting || isGuestSignedUp}
          type="submit"
        >
          {signupsClosed
            ? "Event passed"
            : isGuestSignedUp
              ? "Signed up"
              : isGuestSubmitting
                ? "Signing up"
                : "Sign up as guest"}
        </button>
      </form>
    </section>
  );
}
