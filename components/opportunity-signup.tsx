"use client";

import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

import {
  formatHours,
  formatOpportunityDate,
  opportunityFromData,
  type Opportunity,
} from "@/lib/opportunities";
import { auth, db } from "@/lib/firebase";

type UserProfile = {
  name?: string;
  email?: string;
  role?: "student" | "staff";
};

type OpportunitySignupProps = {
  opportunityId: string;
};

function signupErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this signup. Confirm you are using a student account and the latest rules are published.";
  }

  return "Could not complete signup. Please try again.";
}

export function OpportunitySignup({ opportunityId }: OpportunitySignupProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isAlreadySignedUp, setIsAlreadySignedUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) {
        return;
      }

      setCurrentUser(user);
      setError("");
      setMessage("");

      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const [opportunitySnapshot, profileSnapshot, signupSnapshot] =
          await Promise.all([
            getDoc(doc(db, "opportunities", opportunityId)),
            getDoc(doc(db, "users", user.uid)),
            getDoc(doc(db, "signups", `${user.uid}_${opportunityId}`)),
          ]);

        if (!opportunitySnapshot.exists()) {
          setError("This opportunity does not exist.");
          return;
        }

        if (isMounted) {
          setOpportunity(
            opportunityFromData(
              opportunitySnapshot.id,
              opportunitySnapshot.data(),
            ),
          );
          setProfile(
            profileSnapshot.exists()
              ? (profileSnapshot.data() as UserProfile)
              : null,
          );
          setIsAlreadySignedUp(signupSnapshot.exists());
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(signupErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [opportunityId]);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!currentUser) {
      setError("Log in before signing up.");
      return;
    }

    if (profile?.role !== "student") {
      setError("Use a student account to sign up for opportunities.");
      return;
    }

    const studentEmail = currentUser.email ?? profile?.email ?? "";
    const studentName =
      profile?.name ?? currentUser.displayName ?? studentEmail ?? "Student";

    setIsSubmitting(true);

    try {
      await setDoc(doc(db, "signups", `${currentUser.uid}_${opportunityId}`), {
        studentId: currentUser.uid,
        studentName,
        studentEmail,
        opportunityId,
        createdAt: serverTimestamp(),
      });

      setIsAlreadySignedUp(true);
      setMessage("You are signed up.");
    } catch (caughtError) {
      setError(signupErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!currentUser && !isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Spark Volunteering
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Opportunity Sign-Up</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Log in or create an account to continue.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
              href="/login"
            >
              Log in
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium transition hover:bg-zinc-100"
              href="/signup"
            >
              Create account
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm text-zinc-600">Loading sign-up...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      <section className="mx-auto w-full max-w-2xl">
        <div className="mb-6 border-b border-zinc-200 pb-5">
          <p className="text-sm font-medium text-blue-700">
            Spark Volunteering
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Opportunity Sign-Up</h1>
        </div>

        {opportunity ? (
          <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">{opportunity.title}</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase text-zinc-500">
                  Date
                </dt>
                <dd className="mt-1 text-sm">
                  {formatOpportunityDate(opportunity.date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-zinc-500">
                  Hours
                </dt>
                <dd className="mt-1 text-sm">
                  {formatHours(opportunity.hours)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-zinc-500">
                  Location
                </dt>
                <dd className="mt-1 text-sm">
                  {opportunity.location || "No location"}
                </dd>
              </div>
            </dl>
            {opportunity.description ? (
              <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {opportunity.description}
              </p>
            ) : null}
          </article>
        ) : null}

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
          <form className="mt-5" onSubmit={handleSignup}>
            <button
              className="flex h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              disabled={isSubmitting || isAlreadySignedUp}
              type="submit"
            >
              {isAlreadySignedUp
                ? "Already signed up"
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
