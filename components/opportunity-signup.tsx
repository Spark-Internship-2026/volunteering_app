"use client";

import { FirebaseError } from "firebase/app";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { NavigationLinks } from "@/components/navigation-links";
import {
  formatHours,
  formatOpportunityDate,
  isOpportunityPast,
  opportunityFromData,
  type Opportunity,
} from "@/lib/opportunities";
import { auth, db } from "@/lib/firebase";
import { normalizeSignupEmail, signupDocIdForEmail } from "@/lib/signups";

type UserProfile = {
  name?: string;
  email?: string;
  role?: "student" | "staff";
};

type OpportunitySignupProps = {
  opportunityId: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function loginErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "Could not log in. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a bit, then try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Could not log in. Please try again.";
  }
}

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

function eventLinkErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this event link. Publish the latest Firestore rules, then try again.";
  }

  return "Could not open this event. Please refresh and try again.";
}

function guestSignupErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this guest signup. Publish the latest Firestore rules, then try again.";
  }

  return "Could not complete guest signup. Please try again.";
}

function EventDetailsCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">{opportunity.title}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Date</dt>
          <dd className="mt-1 text-sm">
            {formatOpportunityDate(opportunity.date)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Hours</dt>
          <dd className="mt-1 text-sm">{formatHours(opportunity.hours)}</dd>
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
  );
}

function canUseSignedInSignup(profile: UserProfile | null) {
  return profile?.role === "student" || profile?.role === "staff";
}

function signupEmailForUser(currentUser: User, profile: UserProfile | null) {
  return normalizeSignupEmail(currentUser.email ?? profile?.email ?? "");
}

export function OpportunitySignup({ opportunityId }: OpportunitySignupProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isAlreadySignedUp, setIsAlreadySignedUp] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGuestSignedUp, setIsGuestSignedUp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [guestError, setGuestError] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) {
        return;
      }

      setCurrentUser(user);
      setError("");
      setMessage("");
      setIsLoading(true);
      setIsRedirecting(false);

      try {
        const opportunitySnapshot = await getDoc(
          doc(db, "opportunities", opportunityId),
        );

        if (!isMounted) {
          return;
        }

        if (!opportunitySnapshot.exists()) {
          setOpportunity(null);
          setError("This event does not exist.");
          return;
        }

        setOpportunity(
          opportunityFromData(
            opportunitySnapshot.id,
            opportunitySnapshot.data(),
          ),
        );

        if (!user) {
          setProfile(null);
          setIsAlreadySignedUp(false);
          return;
        }

        const profileSnapshot = await getDoc(doc(db, "users", user.uid));

        if (!isMounted) {
          return;
        }

        const loadedProfile = profileSnapshot.exists()
          ? (profileSnapshot.data() as UserProfile)
          : null;

        setProfile(loadedProfile);

        if (loadedProfile?.role === "staff") {
          setIsRedirecting(true);
          router.replace(`/staff/events/${opportunityId}`);
          return;
        }

        if (loadedProfile?.role === "student") {
          setIsRedirecting(true);
          router.replace(`/dashboard?event=${opportunityId}`);
          return;
        }

        setError("This account does not have a student or staff role yet.");
      } catch (caughtError) {
        if (isMounted) {
          setError(eventLinkErrorMessage(caughtError));
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
  }, [opportunityId, router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    const trimmedEmail = loginEmail.trim();

    if (!isValidEmail(trimmedEmail)) {
      setLoginError("Enter a valid email address.");
      setIsLoggingIn(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, loginPassword);
    } catch (caughtError) {
      setLoginError(loginErrorMessage(caughtError));
    } finally {
      setIsLoggingIn(false);
    }
  }

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

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!currentUser) {
      setError("Log in before signing up.");
      return;
    }

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

    if (!currentUser) {
      setError("Log in before removing your signup.");
      return;
    }

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

  if (isLoading || isRedirecting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm text-zinc-600">
          {isRedirecting ? "Opening event..." : "Loading event..."}
        </p>
      </main>
    );
  }

  if (error && !opportunity) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <section className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-lg font-semibold">Could not open event</h1>
          <p className="mt-2 text-sm leading-6">{error}</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    const signupsClosed = opportunity
      ? isOpportunityPast(opportunity.date)
      : false;

    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
        <section className="mx-auto w-full max-w-5xl">
          <div className="mb-6 border-b border-zinc-200 pb-5">
            <p className="text-sm font-medium text-blue-700">
              Spark Volunteering
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Event Sign-Up</h1>
          </div>

          {opportunity ? <EventDetailsCard opportunity={opportunity} /> : null}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
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
                  disabled={
                    signupsClosed || isGuestSubmitting || isGuestSignedUp
                  }
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

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Log in</h2>

              <form className="mt-4 space-y-4" onSubmit={handleLogin}>
                <label className="block text-sm font-medium">
                  Email
                  <input
                    autoComplete="email"
                    className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) => setLoginEmail(event.target.value)}
                    required
                    type="email"
                    value={loginEmail}
                  />
                </label>

                <label className="block text-sm font-medium">
                  Password
                  <input
                    autoComplete="current-password"
                    className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    minLength={6}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    required
                    type="password"
                    value={loginPassword}
                  />
                </label>

                {loginError ? (
                  <p
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    role="alert"
                  >
                    {loginError}
                  </p>
                ) : null}

                <button
                  className="flex h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  disabled={isLoggingIn}
                  type="submit"
                >
                  {isLoggingIn ? "Signing in" : "Log in"}
                </button>
              </form>
            </section>
          </div>
        </section>
      </main>
    );
  }

  const signupsClosed = opportunity
    ? isOpportunityPast(opportunity.date)
    : false;

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

        {opportunity ? <EventDetailsCard opportunity={opportunity} /> : null}

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
