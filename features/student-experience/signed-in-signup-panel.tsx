"use client";

import { FirebaseError } from "firebase/app";
import type { User } from "firebase/auth";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { type FormEvent, useState } from "react";

import { EventSummaryCard } from "@/features/event-management/event-summary-card";
import { db } from "@/lib/firebase";
import { isOpportunityPast, type Opportunity } from "@/lib/opportunities";
import { normalizeSignupEmail, signupDocIdForEmail } from "@/lib/signups";
import { NavigationLinks } from "@/shared/navigation-links";
import type { UserProfile } from "@/shared/types";

type SignedInSignupPanelProps = {
  currentUser: User;
  profile: UserProfile | null;
  opportunity: Opportunity | null;
  opportunityId: string;
  // A problem found while loading the page (for example, an account with no role).
  initialError: string;
};

function signupErrorMessage(
  error: unknown,
  action: "signup" | "remove" = "signup",
) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return action === "remove"
      ? "Firebase denied this removal. Confirm this is your signup and the latest rules are published."
      : "Firebase denied this signup. Confirm you are using a student or staff account and the latest rules are published.";
  }

  return action === "remove"
    ? "Could not remove signup. Please try again."
    : "Could not complete signup. Please try again.";
}

function canUseSignedInSignup(profile: UserProfile | null) {
  return profile?.role === "student" || profile?.role === "staff";
}

function signupEmailForUser(currentUser: User, profile: UserProfile | null) {
  return normalizeSignupEmail(currentUser.email ?? profile?.email ?? "");
}

// What a logged-in user sees at /signup/<event id>: a single sign up / remove button.
export function SignedInSignupPanel({
  currentUser,
  profile,
  opportunity,
  opportunityId,
  initialError,
}: SignedInSignupPanelProps) {
  const [isAlreadySignedUp, setIsAlreadySignedUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");

  const signupsClosed = opportunity
    ? isOpportunityPast(opportunity.date)
    : false;

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!canUseSignedInSignup(profile)) {
      setError("Use a student or staff account to sign up for events.");
      return;
    }

    if (opportunity && isOpportunityPast(opportunity.date)) {
      setError("This event has passed, so signups are closed.");
      return;
    }

    const studentEmail = signupEmailForUser(currentUser, profile);

    if (!studentEmail) {
      setError("This account needs an email address before it can sign up.");
      return;
    }

    const studentName =
      profile?.name ?? currentUser.displayName ?? studentEmail ?? "Student";

    setIsSubmitting(true);

    try {
      await setDoc(
        doc(db, "signups", signupDocIdForEmail(opportunityId, studentEmail)),
        {
          studentId: currentUser.uid,
          studentName,
          studentEmail,
          opportunityId,
          createdAt: serverTimestamp(),
        },
      );

      setIsAlreadySignedUp(true);
      setMessage("You are signed up.");
    } catch (caughtError) {
      setError(signupErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!canUseSignedInSignup(profile)) {
      setError("Use a student or staff account to remove a signup.");
      return;
    }

    if (opportunity && isOpportunityPast(opportunity.date)) {
      setError("This event has passed, so signup changes are closed.");
      return;
    }

    setIsSubmitting(true);

    try {
      await deleteDoc(
        doc(
          db,
          "signups",
          signupDocIdForEmail(
            opportunityId,
            signupEmailForUser(currentUser, profile),
          ),
        ),
      );

      setIsAlreadySignedUp(false);
      setMessage("Your signup was removed.");
    } catch (caughtError) {
      setError(signupErrorMessage(caughtError, "remove"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      <section className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Spark Volunteering
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Event Sign-Up</h1>
          </div>

          <NavigationLinks
            items={[{ href: "/dashboard", label: "Dashboard" }]}
          />
        </div>

        {opportunity ? <EventSummaryCard opportunity={opportunity} /> : null}

        {error ? (
          <p
            className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="mt-5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        ) : null}

        {opportunity ? (
          <form
            className="mt-5"
            onSubmit={isAlreadySignedUp ? handleRemoveSignup : handleSignup}
          >
            <button
              className={`flex h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 ${
                isAlreadySignedUp
                  ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                  : "bg-blue-700 text-white hover:bg-blue-800"
              }`}
              disabled={signupsClosed || isSubmitting}
              type="submit"
            >
              {signupsClosed
                ? "Event passed"
                : isAlreadySignedUp
                  ? isSubmitting
                    ? "Removing"
                    : "Remove signup"
                  : isSubmitting
                    ? "Signing up"
                    : "Sign up"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
